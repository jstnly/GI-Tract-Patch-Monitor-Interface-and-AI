import type {
  Monitor,
  MonitorId,
  NewMonitorSeed,
  NewNote,
  NurseNote,
  StatusBand,
} from '../../types/monitor'
import { TICK_MS } from '../engine/config'
import { createInitialSimulation, type Simulation } from '../engine/simulation'
import type { DataSource, DemoApi } from './DataSource'

const NOTES_KEY = 'dashboard.notes'

function loadNotes(): Record<string, NurseNote[]> {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, NurseNote[]>) : {}
  } catch {
    return {}
  }
}

function saveNotes(notes: Record<string, NurseNote[]>): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {
    // ignore (e.g. storage disabled / full)
  }
}

/**
 * Drives the {@link Simulation} with a wall-clock timer and fans fresh
 * snapshots out to subscribers. This is the only place that touches timers and
 * `Date.now()`, keeping the simulation itself deterministic.
 */
export class SimulatedDataSource implements DataSource {
  private sim: Simulation
  private timer: ReturnType<typeof setInterval> | null = null
  private subscribers = new Set<(monitors: Monitor[]) => void>()
  private latest: Monitor[]
  private paused = false
  private addedCount = 0

  constructor() {
    const now = Date.now()
    this.sim = createInitialSimulation(now, loadNotes())
    this.latest = this.sim.snapshot(now)
  }

  list(): Monitor[] {
    return this.latest
  }

  poll(): Monitor[] {
    return this.latest
  }

  subscribe(cb: (monitors: Monitor[]) => void): () => void {
    this.subscribers.add(cb)
    cb(this.latest) // deliver the current snapshot immediately
    return () => {
      this.subscribers.delete(cb)
    }
  }

  start(): void {
    if (this.timer !== null) return
    this.timer = setInterval(() => {
      if (this.paused) return
      this.latest = this.sim.tick(Date.now())
      this.emit()
    }, TICK_MS)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  addMonitor(seed: NewMonitorSeed): Monitor {
    const created = this.sim.addMonitor(seed, Date.now())
    this.refresh()
    return created
  }

  removeMonitor(id: MonitorId): void {
    this.sim.removeMonitor(id)
    this.refresh()
  }

  renameMonitor(id: MonitorId, label: string, bed: string, babyId: string): void {
    this.sim.renameMonitor(id, label, bed, babyId)
    this.refresh()
  }

  addNote(id: MonitorId, note: NewNote): void {
    this.sim.addNote(id, note, Date.now())
    saveNotes(this.sim.getAllNotes())
    this.refresh()
  }

  forceState(id: MonitorId, band: StatusBand | 'auto'): void {
    this.sim.forceState(id, band, Date.now())
    this.refresh()
  }

  demo: DemoApi = {
    isPaused: () => this.paused,
    setPaused: (paused: boolean) => {
      this.paused = paused
    },
    addRandom: (): Monitor => {
      this.addedCount += 1
      const letter = String.fromCharCode(71 + ((this.latest.length + this.addedCount) % 19)) // G, H, ...
      return this.addMonitor({
        label: `Baby ${letter}`,
        bed: `Bed ${this.latest.length + 1}`,
        startingProfile: 'random',
      })
    },
    driftRandomToAlert: (): MonitorId | null => {
      const id = this.sim.driftRandomToAlert(Date.now())
      this.refresh()
      return id
    },
  }

  // --- internals ----------------------------------------------------------

  private refresh(): void {
    this.latest = this.sim.snapshot(Date.now())
    this.emit()
  }

  private emit(): void {
    for (const cb of this.subscribers) cb(this.latest)
  }
}
