/**
 * Baseline-relative risk scoring.
 *
 * Instead of absolute population thresholds, risk is the weighted HARMFUL
 * DEVIATION of each metric from THIS baby's own calibrated baseline:
 *   - motility metrics (lower = worse): a drop below baseline, where a ~50%
 *     drop counts as fully harmful (the clinical "30–50% drop" zone);
 *   - coordination / time-since-MMC (higher = worse, baseline near zero): a rise
 *     above baseline, scaled by a fixed span.
 * Plus a small bump if the Motility-Index Gain is below its normal band.
 * The summed harm is squashed to 0–100 and banded.
 */

import type { MetricKey, StatusBand } from '../../types/monitor'
import type { MetricValues } from './abnormalities'
import {
  ALERT_MIN,
  clamp,
  GAIN_NORMAL,
  METRIC_DEFS,
  RELATIVE_RISK_K,
  RISK_FULL_DROP,
  RISK_GAIN_WEIGHT,
  RISK_RISE_SPAN,
  RISK_WEIGHTS,
  WATCH_MIN,
} from './config'

export function bandFromRisk(risk: number): StatusBand {
  if (risk >= ALERT_MIN) return 'Alert'
  if (risk >= WATCH_MIN) return 'Watch'
  return 'Normal'
}

/** Harmful deviation of one metric from its baseline, as a 0–1 fraction. */
export function metricHarm(key: MetricKey, value: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0
  if (METRIC_DEFS[key].higherIsWorse) {
    const span = RISK_RISE_SPAN[key] ?? baseline
    return clamp((value - baseline) / span, 0, 1)
  }
  // lower is worse: a relative drop below baseline
  return clamp((baseline - value) / baseline / RISK_FULL_DROP, 0, 1)
}

/** Total weighted harm vs. baseline (+ a small low-Gain term). */
export function relativeHarm(
  values: MetricValues,
  baseline: Record<MetricKey, number>,
  gain: number,
): number {
  let harm = 0
  for (const key of Object.keys(RISK_WEIGHTS) as MetricKey[]) {
    harm += RISK_WEIGHTS[key] * metricHarm(key, values[key], baseline[key])
  }
  const [gainLo] = GAIN_NORMAL
  if (gain < gainLo) harm += RISK_GAIN_WEIGHT * clamp((gainLo - gain) / gainLo, 0, 1)
  return harm
}

export function relativeRisk(
  values: MetricValues,
  baseline: Record<MetricKey, number>,
  gain: number,
): { riskPct: number; band: StatusBand } {
  const harm = relativeHarm(values, baseline, gain)
  const riskPct = Math.round(100 * (1 - Math.exp(-harm / RELATIVE_RISK_K)))
  return { riskPct, band: bandFromRisk(riskPct) }
}
