/**
 * Pure abnormality detection: current metric values + maturity factor → the
 * list of active abnormalities (with per-metric escalation, so an escalation
 * pair like distension/severe-distension is never double-counted).
 */

import type { MetricKey } from '../../types/monitor'
import { ABNORMALITY_DEFS, clamp, SEVERITY_WEIGHT, type AbnormalityDef } from './config'

export type MetricValues = Record<MetricKey, number>

export interface ActiveAbnormality {
  def: AbnormalityDef
  /** 0–1: how far past the threshold the metric sits. */
  deviation: number
}

const deviation = (value: number, threshold: number, span: number): number =>
  clamp(Math.abs(value - threshold) / span, 0, 1)

export function detectAbnormalities(v: MetricValues, m: number): ActiveAbnormality[] {
  const candidates: ActiveAbnormality[] = []
  const add = (id: string, value: number, threshold: number) => {
    const def = ABNORMALITY_DEFS[id]
    candidates.push({ def, deviation: deviation(value, threshold, def.span) })
  }

  // Contraction frequency
  if (v.contractionFrequency < 6 * m) add('CF_LOW', v.contractionFrequency, 6 * m)
  else if (v.contractionFrequency > 14) add('CF_HIGH', v.contractionFrequency, 14)

  // Contraction strength
  if (v.contractionAmplitude < 50 * m) add('CA_LOW', v.contractionAmplitude, 50 * m)

  // MMC duration (organized wave length)
  if (v.mmcDuration < 1.5) add('MMC_VSHORT', v.mmcDuration, 1.5)
  else if (v.mmcDuration < 3) add('MMC_SHORT', v.mmcDuration, 3)

  // Time since last MMC (should occur every 1–2 h)
  if (v.timeSinceMMC > 6) add('MMC_VLATE', v.timeSinceMMC, 6)
  else if (v.timeSinceMMC > 3) add('MMC_LATE', v.timeSinceMMC, 3)

  // Coordination number (0 = sequential … 5 = random)
  if (v.coordination > 4) add('COORD_SEV', v.coordination, 4)
  else if (v.coordination > 2.5) add('COORD_MOD', v.coordination, 2.5)

  // Keep only the single highest-severity abnormality per metric.
  const bestByMetric = new Map<MetricKey, ActiveAbnormality>()
  for (const c of candidates) {
    const current = bestByMetric.get(c.def.metric)
    if (!current || SEVERITY_WEIGHT[c.def.severity] > SEVERITY_WEIGHT[current.def.severity]) {
      bestByMetric.set(c.def.metric, c)
    }
  }
  return [...bestByMetric.values()]
}
