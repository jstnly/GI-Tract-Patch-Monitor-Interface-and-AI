/**
 * Single source of truth for every tunable constant in the clinical + sim
 * layer: timing, metric definitions, normal ranges, abnormality thresholds,
 * risk calibration, band cutoffs, per-band target profiles, Motility Index
 * calibration and AI signal-quality copy.
 *
 * Clinical note: this is a PROTOTYPE with SIMULATED data. Ranges are chosen to
 * be physiologically plausible and internally consistent for a demo — they are
 * not validated for clinical use. The product reports RISK level, not a
 * diagnosis.
 */

import type {
  Confidence,
  MetricKey,
  SensorLabel,
  Severity,
  SignalStatus,
  StatusBand,
} from '../../types/monitor'

// ---- Timing ---------------------------------------------------------------

/** How often the simulation advances and the UI updates. */
export const TICK_MS = 2500

/**
 * Virtual gut-clock speed: simulated hours per tick, used for the "time since
 * last MMC" counter and MMC-event probability. Compressed so multi-hour gaps
 * are reachable within a short live demo.
 */
export const HOURS_PER_TICK = 0.5

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
  /** Whether higher values are worse (direction hint). */
  higherIsWorse: boolean
  /** Whether a trend graph/sparkline is shown (coordination has none). */
  chartable: boolean
  /** Sensor(s) this metric is derived from. */
  sensor: SensorLabel
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  contractionFrequency: {
    key: 'contractionFrequency',
    label: 'Contraction frequency',
    shortLabel: 'Contractions',
    unit: '/min',
    decimals: 1,
    normal: [8, 12],
    min: 0,
    max: 20,
    noise: 0.4,
    drift: 0.08,
    higherIsWorse: false,
    chartable: true,
    sensor: 'Movement + Sound',
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
    chartable: true,
    sensor: 'Movement',
  },
  mmcActivity: {
    key: 'mmcActivity',
    label: 'MMC activity',
    shortLabel: 'MMC activity',
    unit: '/hr',
    decimals: 2,
    // An MMC should start every 1–2 hours → ~0.5–1 per hour.
    normal: [0.4, 1.2],
    min: 0,
    max: 3,
    noise: 0.05,
    drift: 0.06,
    higherIsWorse: false,
    chartable: true,
    sensor: 'Sound',
  },
  mmcDuration: {
    key: 'mmcDuration',
    label: 'MMC duration',
    shortLabel: 'MMC duration',
    unit: ' min',
    decimals: 1,
    // End of organized wave − start of organized wave.
    normal: [3, 8],
    min: 0,
    max: 15,
    noise: 0.3,
    drift: 0.08,
    higherIsWorse: false,
    chartable: true,
    sensor: 'Sound',
  },
  timeSinceMMC: {
    key: 'timeSinceMMC',
    label: 'Time since last MMC',
    shortLabel: 'Last MMC',
    unit: ' h',
    decimals: 1,
    // An MMC should start every 1–2 hours.
    normal: [0, 2],
    min: 0,
    max: 12,
    noise: 0, // driven by the MMC clock, not a random walk
    drift: 0,
    higherIsWorse: true,
    chartable: true,
    sensor: 'Sound',
  },
  coordination: {
    key: 'coordination',
    label: 'Coordination number',
    shortLabel: 'Coordination',
    unit: '',
    decimals: 1,
    // 0 = normal inchworm sequence … 5 = fully random order. (bioimpedance)
    normal: [0, 2],
    min: 0,
    max: 5,
    noise: 0.15,
    drift: 0.06,
    higherIsWorse: true,
    chartable: false, // no trend graph for coordination
    sensor: 'Bioimpedance',
  },
}

/** Metrics shown on the compact card (the triage-critical three). */
export const CARD_METRIC_KEYS: MetricKey[] = [
  'contractionFrequency',
  'timeSinceMMC',
  'coordination',
]

/** Stable order metrics appear in the detail view. */
export const METRIC_ORDER: MetricKey[] = [
  'contractionFrequency',
  'contractionAmplitude',
  'mmcActivity',
  'mmcDuration',
  'timeSinceMMC',
  'coordination',
]

// ---- MMC clock ------------------------------------------------------------

/** Initial "time since last MMC" range (hours) when seeding/forcing a band. */
export const MMC_GAP_START: Record<StatusBand, [number, number]> = {
  Normal: [0, 1.3],
  Watch: [1.5, 3.5],
  Alert: [3, 8],
}

/**
 * Ticks the device spends establishing a fresh patch's baseline (~48 h,
 * compressed). Seeded babies are already calibrated; newly added ones aren't.
 */
export const CALIBRATION_TICKS = 24

// ---- Motility Index / Gain ------------------------------------------------

/**
 * Resting baseline motility "work" (≈ average of the first 48 h, fasting).
 * Gain = current (post-stimulus) MI ÷ baseline MI; a healthy gut ramps activity
 * ~2–3× after a stimulus (feeding).
 */
export const MI_BASELINE_WORK = 1950

/** Healthy Gain range (×). */
export const GAIN_NORMAL: [number, number] = [2, 3]

// ---- AI signal-quality copy ----------------------------------------------

export const SIGNAL_INFO: Record<
  SignalStatus,
  { label: string; detail: string; sensor?: string }
> = {
  good: {
    label: 'Signal clear',
    detail: 'All three sensors are reading cleanly — readings look reliable.',
  },
  placement: {
    label: 'Check patch placement',
    detail:
      'The bioimpedance channel is drifting in a way that usually means the patch has shifted. Reposition the patch above the belly button and re-check.',
    sensor: 'Bioimpedance (coordination) sensor',
  },
  motion: {
    label: 'Motion artifact',
    detail:
      'Brief high-amplitude noise across all sensors — the baby may be crying, laughing, or moving. Readings may be unreliable for a few minutes.',
    sensor: 'All three sensors',
  },
}

/** Per-tick chance a motion artifact starts, and per-tick chance it clears. */
export const SIGNAL_MOTION_ONSET = 0.02
export const SIGNAL_MOTION_RECOVER = 0.22

// ---- Abnormality thresholds (internal — feeds the risk %) -----------------

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
    label: 'Slow contractions',
    explanation: 'Contraction frequency below the expected range.',
    severity: 'high',
    metric: 'contractionFrequency',
    span: 4,
  },
  CF_HIGH: {
    id: 'CF_HIGH',
    label: 'Fast contractions',
    explanation: 'Contraction frequency above the expected range.',
    severity: 'medium',
    metric: 'contractionFrequency',
    span: 6,
  },
  CA_LOW: {
    id: 'CA_LOW',
    label: 'Weak contractions',
    explanation: 'Contraction strength below the expected range.',
    severity: 'medium',
    metric: 'contractionAmplitude',
    span: 40,
  },
  MMC_SHORT: {
    id: 'MMC_SHORT',
    label: 'Short MMC duration',
    explanation: 'Organized motor-complex wave shorter than expected.',
    severity: 'medium',
    metric: 'mmcDuration',
    span: 4,
  },
  MMC_VSHORT: {
    id: 'MMC_VSHORT',
    label: 'Very short MMC',
    explanation: 'Motor-complex wave far shorter than expected.',
    severity: 'high',
    metric: 'mmcDuration',
    span: 4,
  },
  MMC_LATE: {
    id: 'MMC_LATE',
    label: 'Delayed MMC',
    explanation: 'Longer than expected since the last motor complex.',
    severity: 'medium',
    metric: 'timeSinceMMC',
    span: 6,
  },
  MMC_VLATE: {
    id: 'MMC_VLATE',
    label: 'MMC not occurring',
    explanation: 'No motor complex for much longer than the expected interval.',
    severity: 'high',
    metric: 'timeSinceMMC',
    span: 6,
  },
  COORD_MOD: {
    id: 'COORD_MOD',
    label: 'Reduced coordination',
    explanation: 'Contractions less sequential than normal.',
    severity: 'medium',
    metric: 'coordination',
    span: 2.5,
  },
  COORD_SEV: {
    id: 'COORD_SEV',
    label: 'Uncoordinated contractions',
    explanation: 'Contraction sequence close to random order.',
    severity: 'high',
    metric: 'coordination',
    span: 2.5,
  },
}

// ---- Per-band target profiles --------------------------------------------

/** The value each metric eases toward in a given band (time-since-MMC is
 *  clock-driven and therefore excluded). */
export type Profile = Record<Exclude<MetricKey, 'timeSinceMMC'>, number>

/**
 * Per-band target values. The Normal profile doubles as each baby's calibrated
 * BASELINE reference, so the bands are expressed as how far a baby has drifted
 * from its own baseline: Watch ≈ a mild deviation, Alert ≈ a large one (the
 * clinical "~30–50% drop from baseline" zone).
 */
export const PROFILES: Record<StatusBand, Profile> = {
  Normal: {
    contractionFrequency: 10,
    contractionAmplitude: 82,
    mmcActivity: 0.8, // ~ every 1.25 h — also drives the MMC clock
    mmcDuration: 6,
    coordination: 0.8,
  },
  Watch: {
    contractionFrequency: 8.3, // ~17% below baseline
    contractionAmplitude: 68,
    mmcActivity: 0.6,
    mmcDuration: 4.5,
    coordination: 1.8,
  },
  Alert: {
    contractionFrequency: 4.5, // ~55% below baseline
    contractionAmplitude: 40,
    mmcActivity: 0.15,
    mmcDuration: 1.6,
    coordination: 4.0,
  },
}

// ---- Relative (baseline-trajectory) risk ----------------------------------

/** Per-metric importance when scoring deviation from baseline. */
export const RISK_WEIGHTS: Record<MetricKey, number> = {
  contractionFrequency: 1.0,
  contractionAmplitude: 0.7,
  mmcActivity: 0.6,
  mmcDuration: 0.8,
  timeSinceMMC: 0.7,
  coordination: 1.0,
}

/** Relative drop (fraction of baseline) that counts as "fully harmful" for the
 *  lower-is-better motility metrics — matches the ~50% drop concern. */
export const RISK_FULL_DROP = 0.5

/** For higher-is-worse metrics (baseline near zero), the rise above baseline,
 *  in metric units, that counts as fully harmful. */
export const RISK_RISE_SPAN: Partial<Record<MetricKey, number>> = {
  coordination: 3.5,
  timeSinceMMC: 5,
}

/** How much a low Motility-Index Gain adds on top (kept small — the motility
 *  drop already captures most of it). */
export const RISK_GAIN_WEIGHT = 0.4

/** Squash constant for relative harm → 0–100 risk. */
export const RELATIVE_RISK_K = 2.2

/** Per-baby baseline jitter (±) — each baby calibrates its own baseline. */
export const BASELINE_JITTER = 0.08

/** Multi-sensor confidence per signal state (how many of 3 sensors agree). */
export const SIGNAL_CONFIDENCE: Record<
  SignalStatus,
  { confidence: Confidence; sensorsAgreeing: number }
> = {
  good: { confidence: 'high', sensorsAgreeing: 3 },
  placement: { confidence: 'medium', sensorsAgreeing: 2 },
  motion: { confidence: 'low', sensorsAgreeing: 1 },
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
