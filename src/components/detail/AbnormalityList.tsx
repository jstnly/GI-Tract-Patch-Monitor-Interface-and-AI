import type { Abnormality, Severity } from '../../types/monitor'
import { formatAgo } from '../../lib/format'
import { IconCheck } from '../ui/icons'
import styles from './AbnormalityList.module.css'

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function AbnormalityList({ abnormalities }: { abnormalities: Abnormality[] }) {
  const now = Date.now()
  return (
    <section aria-label="Flagged abnormalities">
      <h3 className={styles.heading}>
        Flagged abnormalities
        {abnormalities.length > 0 && <span className={styles.count}>{abnormalities.length}</span>}
      </h3>

      {abnormalities.length === 0 ? (
        <div className={styles.empty}>
          <IconCheck size={16} />
          No abnormalities flagged — movement within normal range.
        </div>
      ) : (
        <ul className={styles.list}>
          {abnormalities.map((a) => (
            <li key={a.id} className={styles.item}>
              <span className={`${styles.dot} ${styles[a.severity]}`} aria-hidden="true" />
              <div className={styles.text}>
                <div className={styles.row}>
                  <span className={styles.label}>{a.label}</span>
                  <span className={`${styles.sev} ${styles[a.severity]}`}>
                    {SEVERITY_LABEL[a.severity]}
                  </span>
                </div>
                <p className={styles.explanation}>{a.explanation}</p>
                <span className={styles.detected}>Detected {formatAgo(a.detectedAt, now)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
