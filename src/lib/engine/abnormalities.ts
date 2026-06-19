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

  // Rhythm regularity
  if (v.motilityRhythmRegularity < 50) add('MR_VLOW', v.motilityRhythmRegularity, 50)
  else if (v.motilityRhythmRegularity < 70) add('MR_LOW', v.motilityRhythmRegularity, 70)

  // Bowel-movement activity
  if (v.stoolActivity < 0.1 && v.timeSinceLastStoolHr > 12) add('STOOL_LOW', v.stoolActivity, 0.1)
  else if (v.stoolActivity > 2.5) add('STOOL_HIGH', v.stoolActivity, 2.5)

  // Time since last stool
  if (v.timeSinceLastStoolHr > 48) add('NO_STOOL_48', v.timeSinceLastStoolHr, 48)
  else if (v.timeSinceLastStoolHr > 24) add('NO_STOOL_24', v.timeSinceLastStoolHr, 24)

  // Abdominal distension
  if (v.abdominalDistension > 50) add('DIST_SEV', v.abdominalDistension, 50)
  else if (v.abdominalDistension > 25) add('DIST_MOD', v.abdominalDistension, 25)

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
