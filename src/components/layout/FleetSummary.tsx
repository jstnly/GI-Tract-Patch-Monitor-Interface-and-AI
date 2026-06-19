import { useFleetSummary } from '../../state/hooks'
import { IconAlert, IconCheck, IconWatch } from '../ui/icons'
import styles from './FleetSummary.module.css'

/** At-a-glance fleet health counts. Always visible in the sticky top bar. */
export function FleetSummary() {
  const { total, byBand } = useFleetSummary()
  return (
    <div className={styles.summary} aria-label="Fleet status summary">
      <span className={styles.total}>
        {total} monitor{total === 1 ? '' : 's'}
      </span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={`${styles.stat} ${styles.alert}`}>
        <IconAlert size={14} />
        {byBand.Alert} alert
      </span>
      <span className={`${styles.stat} ${styles.watch}`}>
        <IconWatch size={14} />
        {byBand.Watch} watch
      </span>
      <span className={`${styles.stat} ${styles.normal}`}>
        <IconCheck size={14} />
        {byBand.Normal} normal
      </span>
    </div>
  )
}
