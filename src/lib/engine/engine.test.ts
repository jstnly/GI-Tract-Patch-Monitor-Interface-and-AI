import { describe, expect, it } from 'vitest'
import { detectAbnormalities, type MetricValues } from './abnormalities'
import { computeDistensionRisk } from './derived'
import { recommendFeeding } from './feeding'
import { bandFromRisk, gainPenalty, scoreRisk } from './risk'
import { computeMotility } from './motility'
import { maturityFactor, MI_BASELINE_WORK } from './config'

const NORMAL: MetricValues = {
  contractionFrequency: 10,
  contractionAmplitude: 82,
  mmcActivity: 0.8,
  mmcDuration: 6,
  timeSinceMMC: 1,
  coordination: 0.8,
}

const v = (overrides: Partial<MetricValues>): MetricValues => ({ ...NORMAL, ...overrides })
const m = maturityFactor(40) // mature → 1.0

describe('abnormality detection + risk bands', () => {
  it('healthy values produce no abnormalities and 0% risk', () => {
    const abn = detectAbnormalities(NORMAL, m)
    expect(abn).toHaveLength(0)
    const { riskPct, band } = scoreRisk(abn, 30) // healthy gain
    expect(riskPct).toBe(0)
    expect(band).toBe('Normal')
  })

  it('a single high finding stays in Watch, not Alert', () => {
    const abn = detectAbnormalities(v({ contractionFrequency: 3 }), m)
    expect(abn.map((a) => a.def.id)).toContain('CF_LOW')
    const { band } = scoreRisk(abn)
    expect(band).toBe('Watch')
  })

  it('several co-firing findings cross into Alert', () => {
    const abn = detectAbnormalities(
      v({ contractionFrequency: 3, mmcDuration: 1.2, coordination: 4.5, contractionAmplitude: 38 }),
      m,
    )
    const ids = abn.map((a) => a.def.id)
    expect(ids).toEqual(expect.arrayContaining(['CF_LOW', 'MMC_VSHORT', 'COORD_SEV', 'CA_LOW']))
    expect(scoreRisk(abn).band).toBe('Alert')
  })

  it('keeps only the highest-severity abnormality per metric (coordination)', () => {
    const abn = detectAbnormalities(v({ coordination: 4.5 }), m)
    const coord = abn.filter((a) => a.def.metric === 'coordination')
    expect(coord).toHaveLength(1)
    expect(coord[0].def.id).toBe('COORD_SEV')
  })

  it('flags a delayed / absent MMC', () => {
    expect(detectAbnormalities(v({ timeSinceMMC: 4 }), m).map((a) => a.def.id)).toContain('MMC_LATE')
    expect(detectAbnormalities(v({ timeSinceMMC: 7 }), m).map((a) => a.def.id)).toContain(
      'MMC_VLATE',
    )
  })

  it('band cutoffs are monotonic', () => {
    expect(bandFromRisk(39)).toBe('Normal')
    expect(bandFromRisk(40)).toBe('Watch')
    expect(bandFromRisk(69)).toBe('Watch')
    expect(bandFromRisk(70)).toBe('Alert')
  })
})

describe('Motility Index + Gain', () => {
  it('a healthy gut lands in the normal gain band (20–40)', () => {
    const mi = computeMotility(NORMAL, MI_BASELINE_WORK)
    expect(mi.gain).toBeGreaterThanOrEqual(20)
    expect(mi.gain).toBeLessThanOrEqual(40)
    expect(mi.index).toBeGreaterThan(0)
  })

  it('poor motility gives a low gain', () => {
    const mi = computeMotility(v({ contractionAmplitude: 38, mmcDuration: 1.3, contractionFrequency: 4 }), MI_BASELINE_WORK)
    expect(mi.gain).toBeLessThan(20)
  })

  it('gain affects the risk score (low gain adds penalty)', () => {
    expect(gainPenalty(30)).toBe(0)
    expect(gainPenalty(5)).toBeGreaterThan(0)
    const withGood = scoreRisk([], 30).riskPct
    const withPoor = scoreRisk([], 4).riskPct
    expect(withPoor).toBeGreaterThan(withGood)
  })
})

describe('derived distension risk', () => {
  it('is low for a healthy gut and high when coordination + stasis rise', () => {
    expect(computeDistensionRisk(NORMAL)).toBeLessThan(30)
    const high = computeDistensionRisk(
      v({ coordination: 4.5, timeSinceMMC: 6, contractionAmplitude: 38 }),
    )
    expect(high).toBeGreaterThan(60)
  })

  it('returns a 0–100 percentage', () => {
    const r = computeDistensionRisk(v({ coordination: 5, timeSinceMMC: 12, contractionAmplitude: 0 }))
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(100)
  })
})

describe('feeding advisory', () => {
  const base = { m, gain: 30, minutesSinceFeed: 200, feedIntervalTargetMin: 150, now: 1_000_000 }

  it('recommends Feed now when motility is healthy and the feed is due', () => {
    const rec = recommendFeeding({ values: NORMAL, band: 'Normal', activeIds: new Set(), ...base })
    expect(rec.action).toBe('feed_now')
  })

  it('holds feeds when coordination is reduced', () => {
    const rec = recommendFeeding({
      values: v({ coordination: 3 }),
      band: 'Normal',
      activeIds: new Set(['COORD_MOD']),
      ...base,
    })
    expect(rec.action).toBe('hold')
  })

  it('escalates to clinician review in the Alert band', () => {
    const rec = recommendFeeding({
      values: v({ coordination: 4.5 }),
      band: 'Alert',
      activeIds: new Set(['COORD_SEV']),
      ...base,
    })
    expect(rec.action).toBe('consult')
    expect(rec.label).toMatch(/clinician/i)
  })

  it('suggests Feed soon with a target time when fine but not due', () => {
    const rec = recommendFeeding({
      values: NORMAL,
      band: 'Normal',
      activeIds: new Set(),
      ...base,
      minutesSinceFeed: 30,
    })
    expect(rec.action).toBe('feed_soon')
    expect(rec.targetTime).toBeGreaterThan(base.now)
  })
})
