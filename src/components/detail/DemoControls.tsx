import { useState } from 'react'
import type { MonitorId, StatusBand } from '../../types/monitor'
import { IconChevronDown, IconSliders } from '../ui/icons'
import styles from './DemoControls.module.css'

interface Props {
  monitorId: MonitorId
  forceState: (id: MonitorId, band: StatusBand | 'auto') => void
}

const OPTIONS: Array<{ band: StatusBand | 'auto'; label: string }> = [
  { band: 'Normal', label: 'Normal' },
  { band: 'Watch', label: 'Watch' },
  { band: 'Alert', label: 'Alert' },
  { band: 'auto', label: 'Auto' },
]

/** De-emphasised demo affordance — force a state, or resume live drift.
 *  Rendered only when the data source supports it (simulated feed). */
export function DemoControls({ monitorId, forceState }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <section className={styles.wrap}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <IconSliders size={15} />
        <span>Demo controls</span>
        <IconChevronDown size={15} className={open ? styles.chevOpen : styles.chev} />
      </button>
      {open && (
        <div className={styles.panel}>
          <p className={styles.hint}>
            Simulated patch — force a state to preview, or return to live drift.
          </p>
          <div className={styles.segment} role="group" aria-label="Force monitor state">
            {OPTIONS.map((o) => (
              <button
                key={o.band}
                className={styles.seg}
                onClick={() => forceState(monitorId, o.band)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
