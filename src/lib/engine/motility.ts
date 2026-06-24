/**
 * Pure Motility Index / Gain computation.
 *
 *   activity = Σ(amplitude × duration) over contractions ≈ amplitude × duration × frequency
 *   MI       = activity, scaled to a friendly range
 *   Gain     = current (post-stimulus) MI ÷ baseline MI   (healthy ramp ≈ 2–3×)
 *
 * Baseline is the resting/fasting MI (≈ average of the first 48 h), seeded per
 * monitor. Gain is the literal MI ratio, and the scale cancels in the ratio, so
 * a healthy gut that roughly triples its activity after a feed reads ~2–3×.
 */

import type { MotilityIndex } from '../../types/monitor'
import type { MetricValues } from './abnormalities'
import { GAIN_NORMAL } from './config'

/** Display scale so the Motility Index reads as a tidy number. */
const MI_SCALE = 100

export function motilityWork(v: MetricValues): number {
  return v.contractionAmplitude * v.mmcDuration * Math.max(1, v.contractionFrequency)
}

export function computeMotility(v: MetricValues, baselineWork: number): MotilityIndex {
  const work = motilityWork(v)
  return {
    index: work / MI_SCALE,
    baseline: baselineWork / MI_SCALE,
    gain: work / baselineWork,
    normalGain: GAIN_NORMAL,
  }
}
