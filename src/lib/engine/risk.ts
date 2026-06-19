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
import { ALERT_MIN, RISK_K, SEVERITY_WEIGHT, WATCH_MIN } from './config'

export function rawScore(abnormalities: ActiveAbnormality[]): number {
  let raw = 0
  for (const a of abnormalities) {
    raw += SEVERITY_WEIGHT[a.def.severity] * (1 + a.deviation)
  }
  return raw
}

export function riskFromRaw(raw: number): number {
  return Math.round(100 * (1 - Math.exp(-raw / RISK_K)))
}

export function bandFromRisk(risk: number): StatusBand {
  if (risk >= ALERT_MIN) return 'Alert'
  if (risk >= WATCH_MIN) return 'Watch'
  return 'Normal'
}

export function scoreRisk(abnormalities: ActiveAbnormality[]): {
  riskPct: number
  band: StatusBand
} {
  const riskPct = riskFromRaw(rawScore(abnormalities))
  return { riskPct, band: bandFromRisk(riskPct) }
}
