import type { Monitor, MonitorId } from '../types/monitor'

/** Grid layout density. Compact fits a full NICU (18+ babies) on one screen. */
export type Density = 'comfortable' | 'compact'

export interface MonitorState {
  monitors: Monitor[]
  /** Ids of open detail windows. Order = stacking order; last is topmost. */
  openIds: MonitorId[]
  addModalOpen: boolean
  paused: boolean
  density: Density
}

export type Action =
  | { type: 'SET_MONITORS'; monitors: Monitor[] }
  | { type: 'OPEN'; id: MonitorId }
  | { type: 'CLOSE'; id: MonitorId }
  | { type: 'FOCUS'; id: MonitorId }
  | { type: 'SET_ADD_OPEN'; open: boolean }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'SET_DENSITY'; density: Density }

export const initialState: MonitorState = {
  monitors: [],
  openIds: [],
  addModalOpen: false,
  paused: false,
  density: 'comfortable',
}

/** Move id to the end (top of the stack), or append if not present. */
function bringToFront(openIds: MonitorId[], id: MonitorId): MonitorId[] {
  if (openIds[openIds.length - 1] === id) return openIds // already on top — no-op
  return [...openIds.filter((x) => x !== id), id]
}

export function reducer(state: MonitorState, action: Action): MonitorState {
  switch (action.type) {
    case 'SET_MONITORS': {
      // Close any windows whose monitor was removed.
      const openIds = state.openIds.filter((id) => action.monitors.some((m) => m.id === id))
      const sameLength = openIds.length === state.openIds.length
      return { ...state, monitors: action.monitors, openIds: sameLength ? state.openIds : openIds }
    }
    case 'OPEN':
      return { ...state, openIds: bringToFront(state.openIds, action.id) }
    case 'CLOSE':
      return { ...state, openIds: state.openIds.filter((id) => id !== action.id) }
    case 'FOCUS': {
      if (!state.openIds.includes(action.id)) return state // only focus an open window
      const openIds = bringToFront(state.openIds, action.id)
      return openIds === state.openIds ? state : { ...state, openIds }
    }
    case 'SET_ADD_OPEN':
      return { ...state, addModalOpen: action.open }
    case 'SET_PAUSED':
      return { ...state, paused: action.paused }
    case 'SET_DENSITY':
      return { ...state, density: action.density }
    default:
      return state
  }
}
