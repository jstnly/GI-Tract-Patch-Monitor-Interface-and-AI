import { useFleetSummary, useMonitorActions } from '../../state/hooks'
import { IconAlert } from '../ui/icons'
import styles from './AlertBanner.module.css'

/** The single global attention surface. Renders only when ≥1 monitor alerts. */
export function AlertBanner() {
  const { alertIds } = useFleetSummary()
  const actions = useMonitorActions()
  if (alertIds.length === 0) return null

  const n = alertIds.length
  return (
    <div className={styles.banner} role="alert">
      <div className={styles.head}>
        <span className={styles.icon}>
          <IconAlert size={18} />
        </span>
        <strong className={styles.headline}>
          {n} {n === 1 ? 'baby needs' : 'babies need'} attention
        </strong>
        <span className={styles.sub}>Select a monitor to review.</span>
      </div>
      <div className={styles.chips}>
        {alertIds.map((m) => (
          <button key={m.id} className={styles.chip} onClick={() => actions.open(m.id)}>
            <span className={styles.chipName}>{m.label}</span>
            <span className={styles.chipBed}>{m.bed}</span>
            <span className={styles.chipPct}>{m.motileProbability}% motile</span>
          </button>
        ))}
      </div>
    </div>
  )
}
