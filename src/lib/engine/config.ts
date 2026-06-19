/**
 * Single source of truth for every tunable constant in the clinical + sim
 * layer: timing, metric definitions, normal ranges, abnormality thresholds,
 * risk calibration, band cutoffs and per-band target profiles.
 *
 * Clinical note: this is a PROTOTYPE with SIMULATED data. Ranges are chosen to
 * be physiologically plausible and internally consistent for a demo — they are
 * not validated for clinical use.
 */

import type { MetricKey, Severity, StatusBand } from '../../types/monitor'

// ---- Timing ---------------------------------------------------------------

/** How often the simulation advances and the UI updates. */
export const TICK_MS = 2500

/**
 * Virtual gut-clock speed: simulated hours that elapse per tick, used for the
 * "time since last stool" counter and stool-event probability. Compressed so a
 * 24–48h gap is reachable within a short live demo.
 */
export const HOURS_PER_TICK = 1.0

/** Virtual feeding-clock speed: simulated minutes since last feed per tick. */
export const FEED_MINUTES_PER_TICK = 6

/** Rolling history length per metric (~5 min at TICK_MS). */
export const HISTORY_LEN = 120

/** Lookback (in samples) used to compute a metric's trend arrow. */
export const TREND_LOOKBACK = 6

// ---- Risk bands -----------------------------------------------------------

export const WATCH_MIN = 40
export const ALERT_MIN = 70

/** Squash constant for raw → 0–100 risk score (see risk.ts). */
export const RISK_K = 5.6

/** Severity → point weight used in risk scoring. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

// ---- Metric definitions ---------------------------------------------------

export interface MetricDef {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  decimals: number
  /** Ideal range shown to nurses (mature/term baseline). */
  normal: [number, number]
  /** Hard clamp bounds for the simulated value. */
  min: number
  max: number
  /** Per-tick gaussian noise stddev. */
  noise: number
  /** Per-tick pull toward the target value (0–1). */
  drift: number
  /** Whether higher values are worse (drives out-of-range direction hints). */
  higherIsWorse: boolean
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  contractionFrequency: {
    key: 'contractionFrequency',
    label: 'Contraction frequency',
    shortLabel: 'Motility rate',
    unit: '/min',
    decimals: 1,
    normal: [8, 12],
    min: 0,
    max: 20,
    noise: 0.4,
    drift: 0.08,
    higherIsWorse: false,
  },
  contractionAmplitude: {
    key: 'contractionAmplitude',
    label: 'Contraction strength',
    shortLabel: 'Strength',
    unit: '%',
    decimals: 0,
    normal: [60, 100],
    min: 0,
    max: 100,
    noise: 1.5,
    drift: 0.08,
    higherIsWorse: false,
  },
  motilityRhythmRegularity: {
    key: 'motilityRhythmRegularity',
    label: 'Rhythm regularity',
    shortLabel: 'Rhythm',
    unit: '%',
    decimals: 0,
    normal: [80, 100],
    min: 0,
    max: 100,
    noise: 1.5,
    drift: 0.08,
    higherIsWorse: false,
  },
  stoolActivity: {
    key: 'stoolActivity',
    label: 'Bowel-movement activity',
    shortLabel: 'Bowel activity',
    unit: '/hr',
    decimals: 2,
    normal: [0.3, 1.5],
    min: 0,
    max: 4,
    noise: 0.05,
    drift: 0.06,
    higherIsWorse: false,
  },
  timeSinceLastStoolHr: {
    key: 'timeSinceLastStoolHr',
    label: 'Time since last stool',
    shortLabel: 'Last stool',
    unit: 'h',
    decimals: 0,
    normal: [0, 24],
    min: 0,
    max: 96,
    noise: 0, // driven by the stool clock, not a random walk
    drift: 0,
    higherIsWorse: true,
  },
  abdominalDistension: {
    key: 'abdominalDistension',
    label: 'Abdominal distension',
    shortLabel: 'Distension',
    unit: '',
    decimals: 0,
    normal: [0, 25],
    min: 0,
    max: 100,
    noise: 0.6,
    drift: 0.06,
    higherIsWorse: true,
  },
}

/** Metrics shown on the compact card (the triage-critical three). */
export const CARD_METRIC_KEYS: MetricKey[] = [
  'contractionFrequency',
  'timeSinceLastStoolHr',
  'abdominalDistension',
]

/** Stable order metrics appear in the detail view. */
export const METRIC_ORDER: MetricKey[] = [
  'contractionFrequency',
  'contractionAmplitude',
  'motilityRhythmRegularity',
  'stoolActivity',
  'timeSinceLastStoolHr',
  'abdominalDistension',
]

// ---- Abnormality thresholds ----------------------------------------------

export interface AbnormalityDef {
  id: string
  label: string
  explanation: string
  severity: Severity
  metric: MetricKey
  /** Scale that maps "just past threshold" → 0 and "extreme" → 1. */
  span: number
}

export const ABNORMALITY_DEFS: Record<string, AbnormalityDef> = {
  CF_LOW: {
    id: 'CF_LOW',
    label: 'Sluggish gut motility',
    explanation: 'Gut is contracting too slowly; may signal ileus or poor feed tolerance.',
    severity: 'high',
    metric: 'contractionFrequency',
    span: 4,
  },
  CF_HIGH: {
    id: 'CF_HIGH',
    label: 'Hyperactive motility',
    explanation: 'Unusually fast contractions; can precede cramping or obstruction.',
    severity: 'medium',
    metric: 'contractionFrequency',
    span: 6,
  },
  CA_LOW: {
    id: 'CA_LOW',
    label: 'Weak contractions',
    explanation: 'Contractions too weak to move gut contents effectively.',
    severity: 'medium',
    metric: 'contractionAmplitude',
    span: 40,
  },
  MR_LOW: {
    id: 'MR_LOW',
    label: 'Irregular rhythm',
    explanation: 'Erratic motility pattern; loss of normal coordinated peristalsis.',
    severity: 'medium',
    metric: 'motilityRhythmRegularity',
    span: 40,
  },
  MR_VLOW: {
    id: 'MR_VLOW',
    label: 'Chaotic rhythm',
    explanation: 'Severe loss of coordination; strong feed-tolerance concern.',
    severity: 'high',
    metric: 'motilityRhythmRegularity',
    span: 40,
  },
  STOOL_LOW: {
    id: 'STOOL_LOW',
    label: 'Reduced bowel output',
    explanation: 'Very little bowel activity recently.',
    severity: 'low',
    metric: 'stoolActivity',
    span: 2,
  },
  STOOL_HIGH: {
    id: 'STOOL_HIGH',
    label: 'Excessive bowel output',
    explanation: 'Very frequent stooling; watch for fluid loss or diarrhea.',
    severity: 'low',
    metric: 'stoolActivity',
    span: 2,
  },
  NO_STOOL_24: {
    id: 'NO_STOOL_24',
    label: 'No stool > 24h',
    explanation: 'No bowel movement in over a day; constipation or obstruction risk.',
    severity: 'medium',
    metric: 'timeSinceLastStoolHr',
    span: 48,
  },
  NO_STOOL_48: {
    id: 'NO_STOOL_48',
    label: 'No stool > 48h',
    explanation: 'Prolonged absence of stool; escalate to clinician.',
    severity: 'high',
    metric: 'timeSinceLastStoolHr',
    span: 48,
  },
  DIST_MOD: {
    id: 'DIST_MOD',
    label: 'Abdominal distension',
    explanation: 'Belly girth rising above baseline; possible gas or fluid buildup.',
    severity: 'medium',
    metric: 'abdominalDistension',
    span: 50,
  },
  DIST_SEV: {
    id: 'DIST_SEV',
    label: 'Severe distension',
    explanation: 'Marked distension; red flag for NEC or obstruction — urgent.',
    severity: 'high',
    metric: 'abdominalDistension',
    span: 50,
  },
}

// ---- Per-band target profiles --------------------------------------------

/** The value each metric eases toward in a given band. */
export type Profile = Record<
  Exclude<MetricKey, 'timeSinceLastStoolHr'>,
  number
>

export const PROFILES: Record<StatusBand, Profile> = {
  Normal: {
    contractionFrequency: 10,
    contractionAmplitude: 82,
    motilityRhythmRegularity: 90,
    stoolActivity: 0.7,
    abdominalDistension: 6,
  },
  Watch: {
    contractionFrequency: 6.5,
    contractionAmplitude: 55,
    motilityRhythmRegularity: 66,
    stoolActivity: 0.15,
    abdominalDistension: 30,
  },
  Alert: {
    contractionFrequency: 4,
    contractionAmplitude: 40,
    motilityRhythmRegularity: 45,
    stoolActivity: 0.05,
    abdominalDistension: 58,
  },
}

// ---- Helpers --------------------------------------------------------------

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v

/**
 * Maturity factor: preterm / younger guts get relaxed thresholds.
 * 0.6 (very preterm) → 1.0 (mature, ≥ 30 days corrected).
 */
export const maturityFactor = (correctedAgeDays: number): number =>
  clamp(0.6 + 0.4 * (correctedAgeDays / 30), 0.6, 1.0)
