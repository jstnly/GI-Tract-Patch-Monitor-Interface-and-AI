import { describe, expect, it } from 'vitest'
import { detectAbnormalities, type MetricValues } from './abnormalities'
import { computeDistensionRisk } from './derived'
import { recommendFeeding } from './feeding'
import { bandFromRisk, metricHarm, relativeRisk } from './risk'
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
/** Each baby's calibrated baseline ≈ its healthy reference. */
const BASELINE: MetricValues = { ...NORMAL }

const v = (overrides: Partial<MetricValues>): MetricValues => ({ ...NORMAL, ...overrides })
const m = maturityFactor(40) // mature → 1.0

describe('abnormality detection (feeds the feeding advisory)', () => {
  it('healthy values produce no abnormalities', () => {
    expect(detectAbnormalities(NORMAL, m)).toHaveLength(0)
  })

  it('keeps only the highest-severity abnormality per metric', () => {
    const abn = detectAbnormalities(v({ coordination: 4.5 }), m)
    const coord = abn.filter((a) => a.def.metric === 'coordination')
    expect(coord).toHaveLength(1)
    expect(coord[0].def.id).toBe('COORD_SEV')
  })

  it('flags a delayed / absent MMC', () => {
    expect(detectAbnormalities(v({ timeSinceMMC: 4 }), m).map((a) => a.def.id)).toContain('MMC_LATE')
    expect(detectAbnormalities(v({ timeSinceMMC: 7 }), m).map((a) => a.def.id)).toContain('MMC_VLATE')
  })
})

describe('baseline-relative risk', () => {
  it('a baby sitting at its own baseline is Normal / ~0%', () => {
    const { riskPct, band } = relativeRisk(NORMAL, BASELINE, 30)
    expect(riskPct).toBeLessThan(10)
    expect(band).toBe('Normal')
  })

  it('a mild deviation from baseline lands in Watch', () => {
    const watch = v({
      contractionFrequency: 8.3,
      contractionAmplitude: 68,
      mmcActivity: 0.6,
      mmcDuration: 4.5,
      coordination: 1.8,
      timeSinceMMC: 1.6,
    })
    expect(relativeRisk(watch, BASELINE, 15).band).toBe('Watch')
  })

  it('a large drop from baseline crosses into Alert', () => {
    const alert = v({
      contractionFrequency: 4.5,
      contractionAmplitude: 40,
      mmcActivity: 0.15,
      mmcDuration: 1.6,
      coordination: 4.0,
      timeSinceMMC: 5,
    })
    expect(relativeRisk(alert, BASELINE, 2).band).toBe('Alert')
  })

  it('is RELATIVE — the same values read as less risky against a sicker baseline', () => {
    const sick = v({ contractionFrequency: 5 })
    const vsHealthy = relativeRisk(sick, BASELINE, 30).riskPct // big drop from 10
    const vsOwnBaseline = relativeRisk(sick, { ...BASELINE, contractionFrequency: 5 }, 30).riskPct
    expect(vsHealthy).toBeGreaterThan(vsOwnBaseline)
    expect(vsOwnBaseline).toBeLessThan(10)
  })

  it('a low Gain nudges risk up', () => {
    expect(relativeRisk(NORMAL, BASELINE, 5).riskPct).toBeGreaterThan(
      relativeRisk(NORMAL, BASELINE, 30).riskPct,
    )
  })

  it('metricHarm: drop counts for lower-is-worse, rise for higher-is-worse', () => {
    expect(metricHarm('contractionFrequency', 5, 10)).toBeGreaterThan(0) // 50% drop
    expect(metricHarm('contractionFrequency', 12, 10)).toBe(0) // above baseline is fine
    expect(metricHarm('coordination', 4, 0.8)).toBeGreaterThan(0) // rise is bad
    expect(metricHarm('coordination', 0.5, 0.8)).toBe(0) // below baseline is fine
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
    const mi = computeMotility(
      v({ contractionAmplitude: 38, mmcDuration: 1.3, contractionFrequency: 4 }),
      MI_BASELINE_WORK,
    )
    expect(mi.gain).toBeLessThan(20)
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
