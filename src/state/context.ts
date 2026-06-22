import { createContext } from 'react'
import type { ContextEdits, MonitorId, NewMonitorSeed, NewNote, StatusBand } from '../types/monitor'
import type { DemoApi } from '../lib/datasource'
import { initialState, type Density, type MonitorState } from './reducer'

/** Stable action surface. Split from state so action-only consumers (cards)
 *  never re-render on a state change. */
export interface MonitorActions {
  /** Open a detail window for a monitor (or bring it to the front). */
  open(id: MonitorId): void
  /** Close a monitor's detail window. */
  close(id: MonitorId): void
  /** Bring an open window to the front. */
  focus(id: MonitorId): void
  openAdd(): void
  closeAdd(): void
  addMonitor(seed: NewMonitorSeed): void
  removeMonitor(id: MonitorId): void
  renameMonitor(id: MonitorId, label: string, bed: string, babyId: string): void
  updateContext(id: MonitorId, edits: ContextEdits): void
  addNote(id: MonitorId, note: NewNote): void
  setDensity(density: Density): void
  /** Present only when the data source supports forcing a state (demo). */
  forceState?: (id: MonitorId, band: StatusBand | 'auto') => void
  /** Present only for the simulated data source. */
  demo?: DemoApi
}

const noop = () => undefined

export const StateContext = createContext<MonitorState>(initialState)

export const ActionsContext = createContext<MonitorActions>({
  open: noop,
  close: noop,
  focus: noop,
  openAdd: noop,
  closeAdd: noop,
  addMonitor: noop,
  removeMonitor: noop,
  renameMonitor: noop,
  updateContext: noop,
  addNote: noop,
  setDensity: noop,
})
