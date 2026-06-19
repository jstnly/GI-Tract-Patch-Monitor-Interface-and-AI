import { useMonitors, useMonitorActions, useUIState } from '../../state/hooks'
import { Button } from '../ui/Button'
import { IconActivity, IconPlus } from '../ui/icons'
import { MonitorCard } from './MonitorCard'
import styles from './DashboardGrid.module.css'

export function DashboardGrid() {
  const monitors = useMonitors()
  const actions = useMonitorActions()
  const { density } = useUIState()
  const compact = density === 'compact'

  if (monitors.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyGlyph}>
          <IconActivity size={28} />
        </span>
        <h2 className={styles.emptyTitle}>No monitors paired</h2>
        <p className={styles.emptyText}>
          Pair a GI-tract patch monitor to start tracking digestive movement.
        </p>
        <Button variant="primary" iconLeft={<IconPlus size={18} />} onClick={actions.openAdd}>
          Add monitor
        </Button>
      </div>
    )
  }

  return (
    <div className={`${styles.grid} ${compact ? styles.compact : ''}`}>
      {monitors.map((m) => (
        <MonitorCard key={m.id} monitor={m} compact={compact} />
      ))}
    </div>
  )
}
