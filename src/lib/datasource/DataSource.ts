import type {
  ContextEdits,
  Monitor,
  MonitorId,
  NewMonitorSeed,
  NewNote,
  StatusBand,
} from '../../types/monitor'

/**
 * Optional, demo-only global controls (simulated source only). A real patch
 * feed leaves `DataSource.demo` undefined and the UI hides the demo tray.
 */
export interface DemoApi {
  isPaused(): boolean
  setPaused(paused: boolean): void
  /** Pair a random new monitor. Returns it. */
  addRandom(): Monitor
  /** Nudge a calm monitor into a slow drift toward Alert. Returns its id. */
  driftRandomToAlert(): MonitorId | null
}

/**
 * The single boundary between the UI and wherever monitor data comes from.
 *
 * `SimulatedDataSource` implements this today. A real patch feed
 * (`RealtimeDataSource` over WebSocket / BLE) can implement the same interface
 * later — swap one line in `main.tsx` and the UI is untouched.
 *
 * Demo-only capabilities (`forceState`) are optional so a real source can omit
 * them; the UI feature-detects and hides demo controls when they're absent.
 */
export interface DataSource {
  /** Current snapshot of every monitor. */
  list(): Monitor[]

  /**
   * Subscribe to updates. The callback fires on every tick with the full,
   * fresh monitor list. Returns an unsubscribe function.
   */
  subscribe(cb: (monitors: Monitor[]) => void): () => void

  /** Pull the current snapshot (fallback for consumers that prefer polling). */
  poll?(): Monitor[]

  /** Pair a new monitor. Returns the created monitor. */
  addMonitor(seed: NewMonitorSeed): Monitor

  /** Unpair a monitor. */
  removeMonitor(id: MonitorId): void

  /** Rename a monitor's baby label, bed, and DICU id. */
  renameMonitor(id: MonitorId, label: string, bed: string, babyId: string): void

  /** Update a monitor's clinical context (ages, weight, last feed). */
  updateContext(id: MonitorId, edits: ContextEdits): void

  /** Append a signed clinical note (or addendum) to a baby's record. */
  addNote(id: MonitorId, note: NewNote): void

  /**
   * Demo only: force a monitor into a band, or `'auto'` to resume simulated
   * drift. A real data source leaves this undefined.
   */
  forceState?(id: MonitorId, band: StatusBand | 'auto'): void

  /** Begin producing data (start the sim clock / open the socket). */
  start(): void

  /** Stop producing data. */
  stop(): void

  /** Demo-only global controls. Undefined for a real data source. */
  demo?: DemoApi
}
