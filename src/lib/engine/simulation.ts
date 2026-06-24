/**
 * The simulation core. Holds internal per-monitor state, advances it each tick
 * with bounded mean-reverting random walks (plus a per-band drift), and builds
 * the UI-facing `Monitor` snapshots by running the pure clinical engine
 * (abnormalities → risk → feeding) over the current values.
 *
 * This module owns NO timers — `SimulatedDataSource` drives `tick()`. That
 * keeps the simulation deterministic and unit-testable.
 */

import type {
  Abnormality,
  Metric,
  MetricKey,
  MetricSample,
  ContextEdits,
  Monitor,
  MonitorId,
  NewMonitorSeed,
  NewNote,
  NurseNote,
  SignalStatus,
  StatusBand,
} from '../../types/monitor'
import { detectAbnormalities, type MetricValues } from './abnormalities'
import {
  BASELINE_JITTER,
  CALIBRATION_TICKS,
  clamp,
  FEED_MINUTES_PER_TICK,
  HISTORY_LEN,
  HOURS_PER_TICK,
  maturityFactor,
  METRIC_DEFS,
  METRIC_ORDER,
  GAIN_NORMAL,
  MMC_GAP_START,
  PROFILES,
  SEVERITY_WEIGHT,
  SIGNAL_CONFIDENCE,
  SIGNAL_INFO,
  SIGNAL_MOTION_ONSET,
  SIGNAL_MOTION_RECOVER,
  TREND_LOOKBACK,
} from './config'
import { recommendFeeding } from './feeding'
import { computeMotility, motilityWork } from './motility'
import { gaussian, intRange, mulberry32, range } from './rng'
import { relativeRisk } from './risk'

interface MetricState {
  value: number
  target: number
  history: MetricSample[]
}

interface SimMonitor {
  id: MonitorId
  label: string
  bed: string
  context: Monitor['context']
  metrics: Record<MetricKey, MetricState>
  minutesSinceFeed: number
  /** Natural tendency while in auto mode. */
  autoBand: StatusBand
  /** Non-null when a nurse has forced a state for the demo. */
  forced: StatusBand | null
  /** Ticks of fast convergence remaining (after returning to auto). */
  driftBoost: number
  motileHistory: MetricSample[]
  detectedAt: Map<string, number>
  prevFeedingAction: string
  revision: number
  rng: () => number
  notes: NurseNote[]
  /** Resting motility "work" baseline for the Gain calculation. */
  baselineWork: number
  /** This baby's own calibrated baseline per metric. */
  baseline: Record<MetricKey, number>
  /** Ticks remaining while the device establishes the baseline (0 = calibrated). */
  calibrationTicksLeft: number
  /** AI signal-quality state. */
  signalMode: SignalStatus
}

const NON_TIME_KEYS = METRIC_ORDER.filter((k) => k !== 'timeSinceMMC')

function pushHistory(buf: MetricSample[], sample: MetricSample): void {
  buf.push(sample)
  if (buf.length > HISTORY_LEN) buf.shift()
}

function computeTrend(history: MetricSample[], noise: number): Metric['trend'] {
  if (history.length < TREND_LOOKBACK + 1) return 'flat'
  const current = history[history.length - 1].v
  const past = history[history.length - 1 - TREND_LOOKBACK].v
  const d = current - past
  const eps = Math.max(noise, 0.05)
  if (d > eps) return 'up'
  if (d < -eps) return 'down'
  return 'flat'
}

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `mon_${idSeq.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

let noteSeq = 0
function nextNoteId(): string {
  noteSeq += 1
  return `note_${noteSeq.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

let seedSeq = 0x9e3779b9
function nextSeed(): number {
  seedSeq = (seedSeq + 0x6d2b79f5) | 0
  return seedSeq >>> 0
}

interface CreateParams {
  label: string
  bed: string
  initialBand: StatusBand
  autoBand: StatusBand
  now: number
  /** Stable id (used for the seeded fleet so notes reattach across reloads). */
  id?: string
  /** Pre-existing notes (restored from storage). */
  notes?: NurseNote[]
  /** Initial AI signal-quality state (defaults to good). */
  signal?: SignalStatus
  /** Whether the device still needs to establish a baseline (new patch). */
  calibrate?: boolean
}

/**
 * A band's metric level expressed as a multiple of the Normal (baseline) level.
 * Targets are applied to each baby's OWN baseline, so a healthy baby sits at
 * ≈ its baseline (≈ 0 deviation) and Watch/Alert are proportional departures
 * from that baby — not absolute thresholds.
 */
function bandFactor(band: StatusBand, key: MetricKey): number {
  if (key === 'timeSinceMMC') return 1
  const k = key as keyof (typeof PROFILES)['Normal']
  return PROFILES[band][k] / PROFILES.Normal[k]
}

function createSimMonitor(p: CreateParams): SimMonitor {
  const rng = mulberry32(nextSeed())
  const feedIntervalTargetMin = [120, 150, 180][intRange(rng, 0, 2)]
  const correctedAgeDays = intRange(rng, 1, 75)
  const context: Monitor['context'] = {
    babyId: `DICU-${intRange(rng, 1, 99).toString().padStart(3, '0')}`,
    gestationalAgeWeeks: intRange(rng, 24, 40),
    correctedAgeDays,
    weightGrams: intRange(rng, 700, 3600),
    feedIntervalTargetMin,
    lastFeedTime: p.now - intRange(rng, 0, feedIntervalTargetMin) * 60_000,
    admittedAt: p.now - intRange(rng, 1, 20) * 3_600_000,
  }

  // Each baby calibrates its own baseline (≈ its healthy reference + jitter).
  const baseline = {} as Record<MetricKey, number>
  for (const key of METRIC_ORDER) {
    const ref =
      key === 'timeSinceMMC'
        ? 1.0
        : PROFILES.Normal[key as keyof (typeof PROFILES)['Normal']]
    baseline[key] = ref * (1 + range(rng, -BASELINE_JITTER, BASELINE_JITTER))
  }

  // Metrics start at the band's level RELATIVE to this baby's baseline, so a
  // healthy baby begins at ≈ its own baseline (low risk / high motile prob).
  const metrics = {} as Record<MetricKey, MetricState>
  for (const key of NON_TIME_KEYS) {
    const def = METRIC_DEFS[key]
    const start = clamp(
      baseline[key] * bandFactor(p.initialBand, key) + gaussian(rng, def.noise * 2),
      def.min,
      def.max,
    )
    metrics[key] = {
      value: start,
      target: baseline[key] * bandFactor(p.autoBand, key),
      history: [{ t: p.now, v: start }],
    }
  }
  const [glo, ghi] = MMC_GAP_START[p.initialBand]
  const mmcGap = range(rng, glo, ghi)
  metrics.timeSinceMMC = {
    value: mmcGap,
    target: 0,
    history: [{ t: p.now, v: mmcGap }],
  }

  return {
    id: p.id ?? nextId(),
    label: p.label,
    bed: p.bed,
    context,
    metrics,
    minutesSinceFeed: range(rng, 0, feedIntervalTargetMin),
    autoBand: p.autoBand,
    forced: null,
    driftBoost: 0,
    motileHistory: [{ t: p.now, v: 100 }],
    detectedAt: new Map(),
    prevFeedingAction: 'feed_soon',
    revision: 0,
    rng,
    notes: p.notes ?? [],
    // Resting baseline MI, set so this baby at its own baseline reads the
    // mid-normal Gain (~2.5×). Gain then tracks departures from baseline.
    baselineWork: motilityWork(baseline as MetricValues) / ((GAIN_NORMAL[0] + GAIN_NORMAL[1]) / 2),
    baseline,
    calibrationTicksLeft: p.calibrate ? CALIBRATION_TICKS : 0,
    signalMode: p.signal ?? 'good',
  }
}

function snapToBand(sm: SimMonitor, band: StatusBand, now: number): void {
  for (const key of NON_TIME_KEYS) {
    const target = sm.baseline[key] * bandFactor(band, key)
    sm.metrics[key].value = clamp(
      target + gaussian(sm.rng, METRIC_DEFS[key].noise),
      METRIC_DEFS[key].min,
      METRIC_DEFS[key].max,
    )
    sm.metrics[key].target = target
  }
  const [glo, ghi] = MMC_GAP_START[band]
  sm.metrics.timeSinceMMC.value = range(sm.rng, glo, ghi)
  void now
}

function readValues(sm: SimMonitor): MetricValues {
  const v = {} as MetricValues
  for (const key of METRIC_ORDER) v[key] = sm.metrics[key].value
  return v
}

function buildMetric(sm: SimMonitor, key: MetricKey): Metric {
  const def = METRIC_DEFS[key]
  const state = sm.metrics[key]
  return {
    key,
    label: def.label,
    shortLabel: def.shortLabel,
    value: state.value,
    unit: def.unit,
    decimals: def.decimals,
    normalRange: def.normal,
    baseline: sm.baseline[key],
    sensor: def.sensor,
    trend: computeTrend(state.history, def.noise),
    outOfRange: state.value < def.normal[0] || state.value > def.normal[1],
    chartable: def.chartable,
    history: state.history.slice(),
  }
}

const severityRank = (s: Abnormality['severity']) => SEVERITY_WEIGHT[s]

export class Simulation {
  private monitors: SimMonitor[] = []

  constructor(initial: SimMonitor[]) {
    this.monitors = initial
  }

  /** Build UI snapshots without advancing state (for the first render). */
  snapshot(now: number): Monitor[] {
    return this.monitors.map((sm) => this.build(sm, now, false))
  }

  /** Advance every monitor one tick and return fresh UI snapshots. */
  tick(now: number): Monitor[] {
    return this.monitors.map((sm) => {
      this.advance(sm, now)
      return this.build(sm, now, true)
    })
  }

  addMonitor(seed: NewMonitorSeed, now: number): Monitor {
    const profile = seed.startingProfile ?? 'normal'
    let band: StatusBand
    if (profile === 'random') {
      const r = Math.random()
      band = r < 0.6 ? 'Normal' : r < 0.8 ? 'Watch' : 'Alert'
    } else {
      band = profile === 'watch' ? 'Watch' : profile === 'alert' ? 'Alert' : 'Normal'
    }
    const sm = createSimMonitor({
      label: seed.label.trim() || 'New baby',
      bed: seed.bed?.trim() || `Bed ${this.monitors.length + 1}`,
      initialBand: band,
      autoBand: band,
      now,
      calibrate: true, // a freshly applied patch establishes its baseline first
    })
    this.monitors.push(sm)
    return this.build(sm, now, false)
  }

  removeMonitor(id: MonitorId): void {
    this.monitors = this.monitors.filter((sm) => sm.id !== id)
  }

  renameMonitor(id: MonitorId, label: string, bed: string, babyId: string): void {
    const sm = this.monitors.find((m) => m.id === id)
    if (!sm) return
    sm.label = label
    sm.bed = bed
    sm.context.babyId = babyId
  }

  updateContext(id: MonitorId, edits: ContextEdits, now: number): void {
    const sm = this.monitors.find((m) => m.id === id)
    if (!sm) return
    sm.context.gestationalAgeWeeks = edits.gestationalAgeWeeks
    sm.context.correctedAgeDays = edits.correctedAgeDays
    sm.context.weightGrams = edits.weightGrams
    sm.context.lastFeedTime = edits.lastFeedTime
    // Keep the feeding clock in step with the edited "last fed" time.
    sm.minutesSinceFeed = clamp(
      (now - edits.lastFeedTime) / 60_000,
      0,
      sm.context.feedIntervalTargetMin * 3,
    )
  }

  addNote(id: MonitorId, note: NewNote, now: number): void {
    const sm = this.monitors.find((m) => m.id === id)
    if (!sm) return
    sm.notes.push({
      id: nextNoteId(),
      text: note.text,
      nurseName: note.nurseName,
      nurseId: note.nurseId,
      timestamp: now,
      addendumTo: note.addendumTo,
    })
  }

  /** Notes for every monitor, keyed by id (for persistence). */
  getAllNotes(): Record<string, NurseNote[]> {
    const out: Record<string, NurseNote[]> = {}
    for (const sm of this.monitors) {
      if (sm.notes.length) out[sm.id] = sm.notes
    }
    return out
  }

  forceState(id: MonitorId, band: StatusBand | 'auto', now: number): void {
    const sm = this.monitors.find((m) => m.id === id)
    if (!sm) return
    if (band === 'auto') {
      sm.forced = null
      sm.driftBoost = 10
    } else {
      sm.forced = band
      snapToBand(sm, band, now)
    }
  }

  /** Pick a calm monitor and start it drifting toward Alert (demo). */
  driftRandomToAlert(now: number): MonitorId | null {
    const candidates = this.monitors.filter((sm) => sm.forced === null && sm.autoBand !== 'Alert')
    const pick =
      candidates.find((sm) => sm.autoBand === 'Normal') ?? candidates[0] ?? null
    if (!pick) return null
    pick.autoBand = 'Alert'
    pick.driftBoost = 0
    void now
    return pick.id
  }

  list(): SimMonitor[] {
    return this.monitors
  }

  // --- internals ----------------------------------------------------------

  private advance(sm: SimMonitor, now: number): void {
    if (sm.calibrationTicksLeft > 0) sm.calibrationTicksLeft -= 1

    // Feeding clock; simulate an actual feed being given after "Feed now".
    sm.minutesSinceFeed += FEED_MINUTES_PER_TICK
    if (sm.prevFeedingAction === 'feed_now' && sm.rng() < 0.25) {
      sm.minutesSinceFeed = 0
      sm.context.lastFeedTime = now
    }
    sm.minutesSinceFeed = Math.min(sm.minutesSinceFeed, sm.context.feedIntervalTargetMin * 3)

    const activeBand = sm.forced ?? sm.autoBand
    const fast = sm.forced !== null || sm.driftBoost > 0
    const targetRate = fast ? 0.18 : 0.012
    if (sm.driftBoost > 0) sm.driftBoost -= 1

    // AI signal-quality state machine. Motion artifacts are transient; a
    // placement issue is sticky (the patch stays misplaced until repositioned).
    if (sm.signalMode === 'motion') {
      if (sm.rng() < SIGNAL_MOTION_RECOVER) sm.signalMode = 'good'
    } else if (sm.signalMode === 'good') {
      if (sm.rng() < SIGNAL_MOTION_ONSET) sm.signalMode = 'motion'
    }
    // During a motion artifact the sensor traces get noticeably noisier.
    const noiseMul = sm.signalMode === 'motion' ? 3.5 : 1

    // Drift each metric's target toward the active band profile, then the
    // value toward its target with bounded noise.
    for (const key of NON_TIME_KEYS) {
      const def = METRIC_DEFS[key]
      const state = sm.metrics[key]
      const target = sm.baseline[key] * bandFactor(activeBand, key)
      state.target += targetRate * (target - state.target)
      state.value += def.drift * (state.target - state.value) + gaussian(sm.rng, def.noise * noiseMul)
      state.value = clamp(state.value, def.min, def.max)
      pushHistory(state.history, { t: now, v: state.value })
    }

    // MMC clock: stochastic onsets (driven by MMC activity) reset "time since
    // last MMC"; otherwise it climbs at the compressed gut-clock rate.
    const mmcDef = METRIC_DEFS.timeSinceMMC
    const mmc = sm.metrics.timeSinceMMC
    const pMMC = clamp(sm.metrics.mmcActivity.value * HOURS_PER_TICK, 0, 1)
    if (sm.rng() < pMMC) {
      mmc.value = range(sm.rng, 0, 0.3)
    } else {
      mmc.value = clamp(mmc.value + HOURS_PER_TICK, mmcDef.min, mmcDef.max)
    }
    pushHistory(mmc.history, { t: now, v: mmc.value })
  }

  private build(sm: SimMonitor, now: number, advanced: boolean): Monitor {
    const values = readValues(sm)
    const m = maturityFactor(sm.context.correctedAgeDays)
    const active = detectAbnormalities(values, m)
    const activeIds = new Set(active.map((a) => a.def.id))
    const motility = computeMotility(values, sm.baselineWork)
    // Risk is judged against THIS baby's own baseline; the headline output is
    // the inverse: a motile probability (high = healthy).
    const { riskPct, band } = relativeRisk(values, sm.baseline, motility.gain)
    const motileProbability = 100 - riskPct

    if (advanced) pushHistory(sm.motileHistory, { t: now, v: motileProbability })

    const feeding = recommendFeeding({
      values,
      band,
      activeIds,
      m,
      gain: motility.gain,
      minutesSinceFeed: sm.minutesSinceFeed,
      feedIntervalTargetMin: sm.context.feedIntervalTargetMin,
      now,
    })
    sm.prevFeedingAction = feeding.action

    const info = SIGNAL_INFO[sm.signalMode]
    const conf = SIGNAL_CONFIDENCE[sm.signalMode]
    const signal = {
      status: sm.signalMode,
      label: info.label,
      detail: info.detail,
      sensor: info.sensor,
      confidence: conf.confidence,
      sensorsAgreeing: conf.sensorsAgreeing,
    }
    // Maintain first-seen timestamps for active abnormalities.
    for (const id of [...sm.detectedAt.keys()]) {
      if (!activeIds.has(id)) sm.detectedAt.delete(id)
    }
    for (const id of activeIds) {
      if (!sm.detectedAt.has(id)) sm.detectedAt.set(id, now)
    }

    const abnormalities: Abnormality[] = active
      .map((a) => ({
        id: a.def.id,
        label: a.def.label,
        explanation: a.def.explanation,
        severity: a.def.severity,
        metric: a.def.metric,
        detectedAt: sm.detectedAt.get(a.def.id) ?? now,
      }))
      .sort((x, y) => severityRank(y.severity) - severityRank(x.severity) || x.detectedAt - y.detectedAt)

    sm.revision += 1

    return {
      id: sm.id,
      label: sm.label,
      bed: sm.bed,
      status: band,
      motileProbability,
      metrics: METRIC_ORDER.map((key) => buildMetric(sm, key)),
      abnormalities,
      motility,
      calibrating: sm.calibrationTicksLeft > 0,
      signal,
      feeding,
      notes: sm.notes.slice(),
      motileHistory: sm.motileHistory.slice(),
      context: { ...sm.context },
      revision: sm.revision,
      lastUpdated: now,
    }
  }
}

/** The starting fleet: a legible mix incl. one already-alerting baby and one
 *  that visibly drifts into Alert during the demo. Seeded monitors use stable
 *  ids so saved notes reattach across reloads. */
export function createInitialSimulation(
  now: number,
  notesById: Record<string, NurseNote[]> = {},
): Simulation {
  const make = (
    id: string,
    label: string,
    bed: string,
    initialBand: StatusBand,
    autoBand: StatusBand,
    signal: SignalStatus = 'good',
  ) => createSimMonitor({ id, label, bed, initialBand, autoBand, now, notes: notesById[id], signal })

  return new Simulation([
    make('seed-1', 'Baby A', 'Bed 1', 'Normal', 'Normal'),
    make('seed-2', 'Baby B', 'Bed 2', 'Normal', 'Normal'),
    // Calm clinically, but the AI flags a patch-placement signal issue.
    make('seed-3', 'Baby C', 'Bed 3', 'Normal', 'Normal', 'placement'),
    make('seed-4', 'Baby D', 'Bed 4', 'Watch', 'Watch'),
    make('seed-5', 'Baby E', 'Bed 5', 'Alert', 'Alert'),
    // Starts calm, naturally slides toward Alert so the red outline appears
    // on its own during a walkthrough.
    make('seed-6', 'Baby F', 'Bed 6', 'Normal', 'Alert'),
  ])
}
