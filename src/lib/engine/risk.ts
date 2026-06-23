/**
 * Pure risk scoring: active abnormalities → a 0–100 risk score and a band.
 *
 * Each abnormality contributes `weight * (1 + deviation)` points; points are
 * summed and squashed through a saturating curve so a single transient blip
 * stays in Watch, while an extreme finding (or two co-firing findings) crosses
 * into Alert.
 */

import type { StatusBand } from '../../types/monitor'
import type { ActiveAbnormality } from './abnormalities'
import { ALERT_MIN, clamp, GAIN_NORMAL, RISK_K, SEVERITY_WEIGHT, WATCH_MIN } from './config'

export function rawScore(abnormalities: ActiveAbnormality[]): number {
  let raw = 0
  for (const a of abnormalities) {
    raw += SEVERITY_WEIGHT[a.def.severity] * (1 + a.deviation)
  }
  return raw
}

/**
 * Extra risk points when the Motility Index Gain leaves its healthy band — a
 * poor post-fed motility ramp (low gain) nudges risk up. Capped so it modulates
 * rather than dominates the sensor-metric findings.
 */
export function gainPenalty(gain: number): number {
  const [lo, hi] = GAIN_NORMAL
  if (gain >= lo && gain <= hi) return 0
  if (gain < lo) return clamp((lo - gain) / lo, 0, 1) * 2.5
  return clamp((gain - hi) / hi, 0, 1) * 2
}

export function riskFromRaw(raw: number): number {
  return Math.round(100 * (1 - Math.exp(-raw / RISK_K)))
}

export function bandFromRisk(risk: number): StatusBand {
  if (risk >= ALERT_MIN) return 'Alert'
  if (risk >= WATCH_MIN) return 'Watch'
  return 'Normal'
}

export function scoreRisk(
  abnormalities: ActiveAbnormality[],
  gain?: number,
): { riskPct: number; band: StatusBand } {
  const raw = rawScore(abnormalities) + (gain === undefined ? 0 : gainPenalty(gain))
  const riskPct = riskFromRaw(raw)
  return { riskPct, band: bandFromRisk(riskPct) }
}
