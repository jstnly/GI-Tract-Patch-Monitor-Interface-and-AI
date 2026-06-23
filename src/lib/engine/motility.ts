/**
 * Pure Motility Index computation.
 *
 *   work  = Σ(amplitude × duration) over contractions ≈ amplitude × duration × frequency
 *   MI    = ln(work + 1)
 *   Gain  = current work ÷ resting-baseline work   (healthy post-fed gut: 20–40)
 *
 * Baseline is the resting/fasting work (≈ average of the first 48 h), seeded
 * per monitor. MI is the logged index; Gain is the un-logged ratio so it lands
 * in the clinically meaningful 20–40 range.
 */

import type { MotilityIndex } from '../../types/monitor'
import type { MetricValues } from './abnormalities'
import { GAIN_NORMAL } from './config'

export function motilityWork(v: MetricValues): number {
  return v.contractionAmplitude * v.mmcDuration * Math.max(1, v.contractionFrequency)
}

export function computeMotility(v: MetricValues, baselineWork: number): MotilityIndex {
  const work = motilityWork(v)
  return {
    index: Math.log(work + 1),
    baseline: Math.log(baselineWork + 1),
    gain: work / baselineWork,
    normalGain: GAIN_NORMAL,
  }
}
