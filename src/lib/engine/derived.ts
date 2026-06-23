/**
 * Derived "distension risk" — a CONCLUSION, not a direct measurement. The patch
 * can't measure abdominal distension directly, so this estimates the risk of
 * it from the bioimpedance coordination signal plus motility stasis and weak
 * propulsion. Output is a 0–100% risk indicator.
 */

import type { MetricValues } from './abnormalities'
import { clamp } from './config'

export function computeDistensionRisk(v: MetricValues): number {
  const bioimpedance = (v.coordination / 5) * 55 // gas/fluid proxy
  const stasis = clamp((v.timeSinceMMC - 2) / 6, 0, 1) * 25 // content not moving
  const weakPropulsion = clamp((50 - v.contractionAmplitude) / 50, 0, 1) * 20
  return Math.round(clamp(bioimpedance + stasis + weakPropulsion, 0, 100))
}
