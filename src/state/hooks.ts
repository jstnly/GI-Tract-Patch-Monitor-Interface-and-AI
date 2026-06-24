import { useContext, useMemo } from 'react'
import type { Monitor, MonitorId, StatusBand } from '../types/monitor'
import { ActionsContext, StateContext, type MonitorActions } from './context'

export function useMonitors(): Monitor[] {
  return useContext(StateContext).monitors
}

export function useUIState() {
  const { openIds, addModalOpen, paused, density } = useContext(StateContext)
  return { openIds, addModalOpen, paused, density }
}

/** The monitors with open detail windows, in stacking order (last = topmost). */
export function useOpenMonitors(): Monitor[] {
  const { monitors, openIds } = useContext(StateContext)
  return openIds
    .map((id) => monitors.find((m) => m.id === id))
    .filter((m): m is Monitor => Boolean(m))
}

export interface FleetSummary {
  total: number
  byBand: Record<StatusBand, number>
  alertIds: Monitor[]
}

export function useFleetSummary(): FleetSummary {
  const monitors = useMonitors()
  return useMemo(() => {
    const byBand: Record<StatusBand, number> = { Normal: 0, Watch: 0, Alert: 0 }
    for (const m of monitors) byBand[m.status] += 1
    const alertIds = monitors
      .filter((m) => m.status === 'Alert')
      .sort((a, b) => a.motileProbability - b.motileProbability) // least motile first
    return { total: monitors.length, byBand, alertIds }
  }, [monitors])
}

export function useMonitorActions(): MonitorActions {
  return useContext(ActionsContext)
}

export type { MonitorId }
