/**
 * Pure feeding advisory.
 *
 * Clinical reasoning: feeding into a quiet, distended, or non-stooling gut
 * risks feed intolerance and (in preterms) NEC. Coordinated, adequately strong
 * peristalsis plus recent stooling plus a soft belly indicate the tract is
 * ready. The scheduled interval only gates Ready vs. Feed-soon once the gut
 * itself looks healthy.
 *
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
  /** Virtual minutes since the last feed. */
  minutesSinceFeed: number
  feedIntervalTargetMin: number
  /** Current wall-clock epoch ms (for the displayed target time). */
  now: number
}

export function recommendFeeding(input: FeedingInput): FeedingRecommendation {
  const { values: v, band, activeIds, m, minutesSinceFeed, feedIntervalTargetMin, now } = input

  // 1. Consult — highest GI risk, never feed.
  if (band === 'Alert' || activeIds.has('DIST_SEV') || activeIds.has('NO_STOOL_48')) {
    const rationale = activeIds.has('NO_STOOL_48')
      ? 'No stool > 48h — hold feeds and notify clinician.'
      : activeIds.has('DIST_SEV')
        ? 'Severe distension — do not feed; notify clinician.'
        : 'High GI risk — do not feed; notify clinician.'
    return { action: 'consult', label: 'Consult clinician', rationale }
  }

  // 2. Hold — soft contraindications.
  if (
    v.abdominalDistension > 25 ||
    v.contractionFrequency < 6 * m ||
    v.motilityRhythmRegularity < 60 ||
    (v.timeSinceLastStoolHr > 24 && v.abdominalDistension > 15)
  ) {
    const rationale =
      v.abdominalDistension > 25
        ? 'Abdomen distended — hold feed, recheck in 30 min.'
        : v.contractionFrequency < 6 * m
          ? 'Gut motility low — hold feed until peristalsis returns.'
          : v.motilityRhythmRegularity < 60
            ? 'Motility irregular — hold and reassess.'
            : 'No stool > 24h with fullness — hold, consider check.'
    return { action: 'hold', label: 'Hold feeds', rationale }
  }

  // 3. Ready — healthy gut and the feed is due.
  if (
    band === 'Normal' &&
    minutesSinceFeed >= feedIntervalTargetMin &&
    v.contractionFrequency >= 6 * m &&
    v.abdominalDistension <= 15 &&
    v.motilityRhythmRegularity >= 70
  ) {
    return {
      action: 'feed_now',
      label: 'Feed now',
      rationale: 'Gut active and belly soft — OK to feed now.',
    }
  }

  // 4. Feed soon — gut looks fine but the feed is not due yet (or Watch w/o hold).
  const minutesUntilDue = Math.max(0, feedIntervalTargetMin - minutesSinceFeed)
  const realMsUntilDue = (minutesUntilDue / FEED_MINUTES_PER_TICK) * TICK_MS
  if (minutesUntilDue <= 0) {
    // Overdue but gut not cleared for Ready (e.g. Watch band) — reassess shortly.
    return {
      action: 'feed_soon',
      label: 'Feed soon',
      rationale: 'Monitoring tolerance — reassess feeding shortly.',
      targetTime: now + 5 * 60_000,
    }
  }
  return {
    action: 'feed_soon',
    label: 'Feed soon',
    rationale: 'On track — gut tolerating feeds.',
    targetTime: now + realMsUntilDue,
  }
}
