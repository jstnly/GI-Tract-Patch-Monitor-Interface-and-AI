import { describe, expect, it } from 'vitest'
import { detectAbnormalities, type MetricValues } from './abnormalities'
import { recommendFeeding } from './feeding'
import { bandFromRisk, scoreRisk } from './risk'
import { maturityFactor } from './config'

const NORMAL: MetricValues = {
  contractionFrequency: 10,
  contractionAmplitude: 82,
  motilityRhythmRegularity: 90,
  stoolActivity: 0.7,
  timeSinceLastStoolHr: 2,
  abdominalDistension: 6,
}

const v = (overrides: Partial<MetricValues>): MetricValues => ({ ...NORMAL, ...overrides })
const m = maturityFactor(40) // mature → 1.0

describe('risk bands', () => {
  it('healthy baby has no abnormalities and 0% risk → Normal', () => {
    const abn = detectAbnormalities(NORMAL, m)
    expect(abn).toHaveLength(0)
    const { riskPct, band } = scoreRisk(abn)
    expect(riskPct).toBe(0)
    expect(band).toBe('Normal')
  })

  it('a single high-severity finding stays in Watch, not Alert', () => {
    const abn = detectAbnormalities(v({ contractionFrequency: 3 }), m)
    const { riskPct, band } = scoreRisk(abn)
    expect(riskPct).toBeGreaterThanOrEqual(40)
    expect(band).toBe('Watch')
  })

  it('the NEC triad (distension + no stool + sluggish) crosses into Alert', () => {
    const abn = detectAbnormalities(
      v({ contractionFrequency: 3, abdominalDistension: 70, timeSinceLastStoolHr: 60, stoolActivity: 0.05 }),
      m,
    )
    const ids = abn.map((a) => a.def.id)
    expect(ids).toContain('CF_LOW')
    expect(ids).toContain('DIST_SEV')
    expect(ids).toContain('NO_STOOL_48')
    const { riskPct, band } = scoreRisk(abn)
    expect(riskPct).toBeGreaterThanOrEqual(70)
    expect(band).toBe('Alert')
  })

  it('band cutoffs are monotonic', () => {
    expect(bandFromRisk(0)).toBe('Normal')
    expect(bandFromRisk(39)).toBe('Normal')
    expect(bandFromRisk(40)).toBe('Watch')
    expect(bandFromRisk(69)).toBe('Watch')
    expect(bandFromRisk(70)).toBe('Alert')
    expect(bandFromRisk(100)).toBe('Alert')
  })
})

describe('abnormality escalation', () => {
  it('keeps only the highest-severity abnormality per metric', () => {
    // distension 70 fires both DIST_MOD and DIST_SEV — only DIST_SEV should remain.
    const abn = detectAbnormalities(v({ abdominalDistension: 70 }), m)
    const distRules = abn.filter((a) => a.def.metric === 'abdominalDistension')
    expect(distRules).toHaveLength(1)
    expect(distRules[0].def.id).toBe('DIST_SEV')
  })
})

describe('feeding advisory', () => {
  const base = { m, minutesSinceFeed: 200, feedIntervalTargetMin: 150, now: 1_000_000 }

  it('recommends Feed now when the gut is healthy and the feed is due', () => {
    const rec = recommendFeeding({ values: NORMAL, band: 'Normal', activeIds: new Set(), ...base })
    expect(rec.action).toBe('feed_now')
  })

  it('holds feeds when the abdomen is distended', () => {
    const rec = recommendFeeding({
      values: v({ abdominalDistension: 30 }),
      band: 'Normal',
      activeIds: new Set(['DIST_MOD']),
      ...base,
    })
    expect(rec.action).toBe('hold')
  })

  it('escalates to Consult in the Alert band', () => {
    const rec = recommendFeeding({
      values: v({ contractionFrequency: 3, abdominalDistension: 70 }),
      band: 'Alert',
      activeIds: new Set(['CF_LOW', 'DIST_SEV']),
      ...base,
    })
    expect(rec.action).toBe('consult')
  })

  it('suggests Feed soon with a target time when the gut is fine but not due', () => {
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
