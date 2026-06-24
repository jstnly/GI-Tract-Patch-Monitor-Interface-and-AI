/**
 * Pure feeding advisory.
 *
 * Reasoning: a healthy, coordinated, adequately strong motility pattern with a
 * good post-fed Gain and regular MMC cycles indicates the gut is ready for the
 * next feed. Weak, uncoordinated, or absent motility suggests holding and
 * reviewing with a clinician. The scheduled interval only gates Ready vs.
 * Feed-soon once the motility itself looks healthy.
 *
 * Wording is general guidance (when to feed / hold / review) — not a diagnosis.
 * Rules are evaluated top-down; the first match wins.
 */

import type { FeedingRecommendation, StatusBand } from '../../types/monitor'
import type { MetricValues } from './abnormalities'
import { FEED_MINUTES_PER_TICK, TICK_MS } from './config'

export interface FeedingInput {
  values: MetricValues
  band: StatusBand
  /** Active abnormality ids this tick. */
  activeIds: Set<string>
  /** Maturity factor (0.6–1.0). */
  m: number
  /** Motility Index Gain. */
  gain: number
  /** Virtual minutes since the last feed. */
  minutesSinceFeed: number
  feedIntervalTargetMin: number
  /** Current wall-clock epoch ms (for the displayed target time). */
  now: number
}

export function recommendFeeding(input: FeedingInput): FeedingRecommendation {
  const { values: v, band, activeIds, m, gain, minutesSinceFeed, feedIntervalTargetMin, now } =
    input

  // 1. Review — highest risk; the suggestion is to hold and involve a clinician.
  if (band === 'Alert' || activeIds.has('COORD_SEV') || activeIds.has('MMC_VLATE')) {
    const rationale = activeIds.has('MMC_VLATE')
      ? 'Motor complex appears absent — you may want to hold feeds and review with a clinician.'
      : activeIds.has('COORD_SEV')
        ? 'Contractions look uncoordinated — you may want to hold feeds and review with a clinician.'
        : 'Risk level is high — you may want to hold feeds and review with a clinician.'
    return { action: 'consult', label: 'Suggest clinician review', rationale }
  }

  // 2. Hold — soft signals that feeding may not be well tolerated.
  if (
    v.coordination > 2.5 ||
    v.contractionFrequency < 6 * m ||
    v.mmcDuration < 2 ||
    v.timeSinceMMC > 3 ||
    gain < 1.5
  ) {
    const rationale =
      v.coordination > 2.5
        ? 'Coordination looks reduced — feeding may be less well tolerated; consider holding.'
        : v.contractionFrequency < 6 * m
          ? 'Contractions look slow — you might hold until motility picks up.'
          : v.mmcDuration < 2
            ? 'Motor-complex duration looks short — you might hold and reassess.'
            : v.timeSinceMMC > 3
              ? 'Motor complex looks overdue — you might hold and reassess.'
              : 'Post-fed motility gain looks low — you might hold and reassess.'
    return { action: 'hold', label: 'Consider holding', rationale }
  }

  // 3. Ready — motility looks healthy and the feed is due.
  if (
    band === 'Normal' &&
    minutesSinceFeed >= feedIntervalTargetMin &&
    v.contractionFrequency >= 6 * m &&
    v.coordination <= 2 &&
    v.mmcDuration >= 3 &&
    gain >= 2
  ) {
    return {
      action: 'feed_now',
      label: 'Consider feeding',
      rationale: 'Motility looks active and coordinated — this baby may be ready to feed.',
    }
  }

  // 4. Feed soon — motility looks fine but the feed is not due yet (or Watch).
  const minutesUntilDue = Math.max(0, feedIntervalTargetMin - minutesSinceFeed)
  const realMsUntilDue = (minutesUntilDue / FEED_MINUTES_PER_TICK) * TICK_MS
  if (minutesUntilDue <= 0) {
    return {
      action: 'feed_soon',
      label: 'Feeding soon',
      rationale: 'Tolerance still settling — likely ready to feed shortly.',
      targetTime: now + 5 * 60_000,
    }
  }
  return {
    action: 'feed_soon',
    label: 'Feeding soon',
    rationale: 'On track — likely ready to feed around the next window.',
    targetTime: now + realMsUntilDue,
  }
}
