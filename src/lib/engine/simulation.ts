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
  Monitor,
  MonitorId,
  NewMonitorSeed,
  NewNote,
  NurseNote,
  StatusBand,
} from '../../types/monitor'
import { detectAbnormalities, type MetricValues } from './abnormalities'
import {
  clamp,
  FEED_MINUTES_PER_TICK,
  HISTORY_LEN,
  HOURS_PER_TICK,
  maturityFactor,
  METRIC_DEFS,
  METRIC_ORDER,
  PROFILES,
  SEVERITY_WEIGHT,
  TREND_LOOKBACK,
} from './config'
import { recommendFeeding } from './feeding'
import { gaussian, intRange, mulberry32, range } from './rng'
import { scoreRisk } from './risk'

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
  riskHistory: MetricSample[]
  detectedAt: Map<string, number>
  prevFeedingAction: string
  revision: number
  rng: () => number
  notes: NurseNote[]
}

const NON_TIME_KEYS = METRIC_ORDER.filter((k) => k !== 'timeSinceLastStoolHr')

const STOOL_START: Record<StatusBand, [number, number]> = {
  Normal: [0, 6],
  Watch: [8, 20],
  Alert: [22, 42],
}

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

  const metrics = {} as Record<MetricKey, MetricState>
  for (const key of NON_TIME_KEYS) {
    const def = METRIC_DEFS[key]
    const start = clamp(
      PROFILES[p.initialBand][key as keyof (typeof PROFILES)['Normal']] +
        gaussian(rng, def.noise * 2),
      def.min,
      def.max,
    )
    metrics[key] = {
      value: start,
      target: PROFILES[p.autoBand][key as keyof (typeof PROFILES)['Normal']],
      history: [{ t: p.now, v: start }],
    }
  }
  const [slo, shi] = STOOL_START[p.initialBand]
  const stoolStart = range(rng, slo, shi)
  metrics.timeSinceLastStoolHr = {
    value: stoolStart,
    target: 0,
    history: [{ t: p.now, v: stoolStart }],
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
    riskHistory: [{ t: p.now, v: 0 }],
    detectedAt: new Map(),
    prevFeedingAction: 'feed_soon',
    revision: 0,
    rng,
    notes: p.notes ?? [],
  }
}

function snapToBand(sm: SimMonitor, band: StatusBand, now: number): void {
  for (const key of NON_TIME_KEYS) {
    const profile = PROFILES[band][key as keyof (typeof PROFILES)['Normal']]
    sm.metrics[key].value = clamp(
      profile + gaussian(sm.rng, METRIC_DEFS[key].noise),
      METRIC_DEFS[key].min,
      METRIC_DEFS[key].max,
    )
    sm.metrics[key].target = profile
  }
  const [slo, shi] = STOOL_START[band]
  sm.metrics.timeSinceLastStoolHr.value = range(sm.rng, slo, shi)
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
    trend: computeTrend(state.history, def.noise),
    outOfRange: state.value < def.normal[0] || state.value > def.normal[1],
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

    // Drift each metric's target toward the active band profile, then the
    // value toward its target with bounded noise.
    for (const key of NON_TIME_KEYS) {
      const def = METRIC_DEFS[key]
      const state = sm.metrics[key]
      const profile = PROFILES[activeBand][key as keyof (typeof PROFILES)['Normal']]
      state.target += targetRate * (profile - state.target)
      state.value += def.drift * (state.target - state.value) + gaussian(sm.rng, def.noise)
      state.value = clamp(state.value, def.min, def.max)
      pushHistory(state.history, { t: now, v: state.value })
    }

    // Stool clock: stochastic events reset "time since last stool"; otherwise
    // it climbs at the compressed gut-clock rate.
    const stoolDef = METRIC_DEFS.timeSinceLastStoolHr
    const stool = sm.metrics.timeSinceLastStoolHr
    const pStool = clamp(sm.metrics.stoolActivity.value * HOURS_PER_TICK, 0, 1)
    if (sm.rng() < pStool) {
      stool.value = range(sm.rng, 0, 0.5)
    } else {
      stool.value = clamp(stool.value + HOURS_PER_TICK, stoolDef.min, stoolDef.max)
    }
    pushHistory(stool.history, { t: now, v: stool.value })
  }

  private build(sm: SimMonitor, now: number, advanced: boolean): Monitor {
    const values = readValues(sm)
    const m = maturityFactor(sm.context.correctedAgeDays)
    const active = detectAbnormalities(values, m)
    const activeIds = new Set(active.map((a) => a.def.id))
    const { riskPct, band } = scoreRisk(active)

    if (advanced) pushHistory(sm.riskHistory, { t: now, v: riskPct })

    const feeding = recommendFeeding({
      values,
      band,
      activeIds,
      m,
      minutesSinceFeed: sm.minutesSinceFeed,
      feedIntervalTargetMin: sm.context.feedIntervalTargetMin,
      now,
    })
    sm.prevFeedingAction = feeding.action

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
      riskPct,
      metrics: METRIC_ORDER.map((key) => buildMetric(sm, key)),
      abnormalities,
      feeding,
      notes: sm.notes.slice(),
      riskHistory: sm.riskHistory.slice(),
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
  ) => createSimMonitor({ id, label, bed, initialBand, autoBand, now, notes: notesById[id] })

  return new Simulation([
    make('seed-1', 'Baby A', 'Bed 1', 'Normal', 'Normal'),
    make('seed-2', 'Baby B', 'Bed 2', 'Normal', 'Normal'),
    make('seed-3', 'Baby C', 'Bed 3', 'Normal', 'Normal'),
    make('seed-4', 'Baby D', 'Bed 4', 'Watch', 'Watch'),
    make('seed-5', 'Baby E', 'Bed 5', 'Alert', 'Alert'),
    // Starts calm, naturally slides toward Alert so the red outline appears
    // on its own during a walkthrough.
    make('seed-6', 'Baby F', 'Bed 6', 'Normal', 'Alert'),
  ])
}
