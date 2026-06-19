import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { DataSource } from '../lib/datasource'
import { createDataSource } from '../lib/datasource'
import { ActionsContext, StateContext, type MonitorActions } from './context'
import { initialState, reducer, type Density, type MonitorState } from './reducer'

const DENSITY_KEY = 'dashboard.density'

function loadDensity(): Density {
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

const init = (base: MonitorState): MonitorState => ({ ...base, density: loadDensity() })

interface Props {
  children: ReactNode
  /** Override the data source (used by tests). */
  dataSource?: DataSource
}

/**
 * Owns all monitor state. Subscribes to the data source's tick stream and
 * exposes a stable action surface. State and actions live in separate contexts
 * so that action-only consumers don't re-render every tick.
 */
export function MonitorProvider({ children, dataSource }: Props) {
  const [source] = useState<DataSource>(() => dataSource ?? createDataSource())
  const [state, dispatch] = useReducer(reducer, initialState, init)

  useEffect(() => {
    const unsubscribe = source.subscribe((monitors) => dispatch({ type: 'SET_MONITORS', monitors }))
    source.start()
    return () => {
      unsubscribe()
      source.stop()
    }
  }, [source])

  const actions = useMemo<MonitorActions>(() => {
    const demo = source.demo
    return {
      open: (id) => dispatch({ type: 'OPEN', id }),
      close: (id) => dispatch({ type: 'CLOSE', id }),
      focus: (id) => dispatch({ type: 'FOCUS', id }),
      openAdd: () => dispatch({ type: 'SET_ADD_OPEN', open: true }),
      closeAdd: () => dispatch({ type: 'SET_ADD_OPEN', open: false }),
      addMonitor: (seed) => {
        source.addMonitor(seed)
        dispatch({ type: 'SET_ADD_OPEN', open: false })
      },
      removeMonitor: (id) => {
        source.removeMonitor(id)
        dispatch({ type: 'CLOSE', id })
      },
      renameMonitor: (id, label, bed, babyId) => source.renameMonitor(id, label, bed, babyId),
      addNote: (id, note) => source.addNote(id, note),
      setDensity: (density) => {
        try {
          localStorage.setItem(DENSITY_KEY, density)
        } catch {
          // ignore (e.g. storage disabled)
        }
        dispatch({ type: 'SET_DENSITY', density })
      },
      forceState: source.forceState ? (id, band) => source.forceState!(id, band) : undefined,
      demo: demo
        ? {
            isPaused: () => demo.isPaused(),
            setPaused: (paused) => {
              demo.setPaused(paused)
              dispatch({ type: 'SET_PAUSED', paused })
            },
            addRandom: () => demo.addRandom(),
            driftRandomToAlert: () => demo.driftRandomToAlert(),
          }
        : undefined,
    }
  }, [source])

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  )
}
