/**
 * UI-facing data contract.
 *
 * Everything the dashboard renders comes from a `Monitor` object. The UI never
 * computes risk, abnormalities or feeding advice — it only renders what the
 * data object reports. The clinical engine (src/lib/engine) produces these,
 * and a `DataSource` (simulated now, real patch feed later) delivers them.
 *
 * These types are plain serialisable data (no functions) so the same shape can
 * one day arrive over a WebSocket from real hardware.
 */

export type MonitorId = string

/** Risk band. The Alert band is what turns a card's outline red. */
export type StatusBand = 'Normal' | 'Watch' | 'Alert'

export type Severity = 'low' | 'medium' | 'high'

/** One point in a rolling time-series. `t` = epoch ms, `v` = value. */
export interface MetricSample {
  t: number
  v: number
}

/** The live metrics derived from the patch's three sensors. */
export type MetricKey =
  | 'contractionFrequency'
  | 'contractionAmplitude'
  | 'mmcActivity'
  | 'mmcDuration'
  | 'timeSinceMMC'
  | 'coordination'

/** Which physical sensor(s) a metric is derived from. */
export type SensorLabel = 'Movement' | 'Sound' | 'Bioimpedance' | 'Movement + Sound'

export interface Metric {
  key: MetricKey
  /** Full label for the detail view, e.g. "Contraction frequency". */
  label: string
  /** Compact label for cards, e.g. "Contractions". */
  shortLabel: string
  value: number
  unit: string
  /** Decimal places to render. */
  decimals: number
  /** Healthy range for this baby (already adjusted for maturity). */
  normalRange: [number, number]
  /** This baby's own calibrated baseline for the metric. */
  baseline: number
  /** Sensor(s) this metric comes from. */
  sensor: SensorLabel
  trend: 'up' | 'down' | 'flat'
  /** True when the current value sits outside `normalRange`. */
  outOfRange: boolean
  /** Whether a trend graph/sparkline is shown (coordination has none). */
  chartable: boolean
  history: MetricSample[]
}

/** Combined motility-index box: post-fed response vs. resting baseline. */
export interface MotilityIndex {
  /** Motility Index = ln(Σ(amplitude × duration) + 1). */
  index: number
  /** Resting baseline index (average of the first 48 h). */
  baseline: number
  /** Post-fed ÷ baseline motility "work". Normal 20–40. */
  gain: number
  /** Healthy gain range. */
  normalGain: [number, number]
}

export type SignalStatus = 'good' | 'placement' | 'motion'

/** Multi-sensor agreement confidence (rises when the three sensors agree). */
export type Confidence = 'high' | 'medium' | 'low'

/**
 * AI assessment of the three sensors' signal quality. This is data-quality /
 * artifact analysis ONLY (patch placement, motion) — never a clinical
 * diagnosis. It tells the nurse when the readings may be unreliable.
 */
export interface SignalQuality {
  status: SignalStatus
  /** Short label, e.g. "Signal clear", "Check patch placement". */
  label: string
  /** Plain-language explanation for the nurse. */
  detail: string
  /** Which sensor looks off, if any. */
  sensor?: string
  /** Multi-sensor agreement confidence. */
  confidence: Confidence
  /** How many of the 3 sensors currently agree. */
  sensorsAgreeing: number
}

export interface Abnormality {
  id: string
  /** Human-readable name, e.g. "Sluggish gut motility". */
  label: string
  /** One-line explanation a nurse can act on. */
  explanation: string
  severity: Severity
  metric: MetricKey
  /** Epoch ms this abnormality first appeared in the current run. */
  detectedAt: number
}

/** A signed clinical note for a baby's record. Append-only. */
export interface NurseNote {
  id: string
  text: string
  nurseName: string
  nurseId: string
  /** Epoch ms the note was signed. */
  timestamp: number
  /** If set, this note is an addendum to the note with this id. */
  addendumTo?: string
}

/** Fields supplied when signing a new note or addendum. */
export interface NewNote {
  text: string
  nurseName: string
  nurseId: string
  addendumTo?: string
}

export type FeedingAction = 'feed_now' | 'feed_soon' | 'hold' | 'consult'

export interface FeedingRecommendation {
  action: FeedingAction
  /** Short verb shown on the chip, e.g. "Feed now", "Hold feeds". */
  label: string
  /** One-line clinical rationale. */
  rationale: string
  /** For `feed_soon`: epoch ms of the suggested next feed. */
  targetTime?: number
}

/** Static / contextual fields set at admission. */
export interface MonitorContext {
  babyId: string
  gestationalAgeWeeks: number
  correctedAgeDays: number
  weightGrams: number
  feedIntervalTargetMin: number
  lastFeedTime: number
  admittedAt: number
}

/** Editable clinical context fields (ages, weight, last feed). */
export interface ContextEdits {
  gestationalAgeWeeks: number
  correctedAgeDays: number
  weightGrams: number
  lastFeedTime: number
}

export interface Monitor {
  id: MonitorId
  /** De-identified display name, e.g. "Baby A". */
  label: string
  bed: string
  status: StatusBand
  /** 0–100 likelihood the gut is motile (high = healthy). Inverse of risk. */
  motileProbability: number
  metrics: Metric[]
  abnormalities: Abnormality[]
  /** Combined Motility Index / Gain box. */
  motility: MotilityIndex
  /** True while the device is still establishing this baby's baseline (~48 h). */
  calibrating: boolean
  /** AI signal-quality assessment of the patch sensors. */
  signal: SignalQuality
  feeding: FeedingRecommendation
  /** Signed clinical notes for this baby's record, oldest first. */
  notes: NurseNote[]
  /** Rolling history of the motile probability, for the detail trend chart. */
  motileHistory: MetricSample[]
  context: MonitorContext
  /** Bumped only on a meaningful change — lets cards skip re-renders. */
  revision: number
  lastUpdated: number
}

export type StartingProfile = 'normal' | 'watch' | 'alert' | 'random'

export interface NewMonitorSeed {
  label: string
  bed?: string
  startingProfile?: StartingProfile
}
