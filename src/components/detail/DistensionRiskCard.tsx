import styles from './DistensionRiskCard.module.css'

function level(pct: number): { label: string; cls: string } {
  if (pct >= 60) return { label: 'High', cls: styles.high }
  if (pct >= 30) return { label: 'Elevated', cls: styles.elevated }
  return { label: 'Low', cls: styles.low }
}

/** Derived distension risk — a conclusion estimated from bioimpedance + motility,
 *  not a directly measured value. */
export function DistensionRiskCard({ value }: { value: number }) {
  const l = level(value)
  return (
    <section className={styles.card} aria-label="Distension risk">
      <div className={styles.row}>
        <div className={styles.block}>
          <span className={styles.eyebrow}>Derived · distension risk</span>
          <span className={`${styles.val} tnum`}>{value}%</span>
        </div>
        <span className={`${styles.level} ${l.cls}`}>{l.label}</span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <div className={`${styles.fill} ${l.cls}`} style={{ width: `${value}%` }} />
      </div>
      <p className={styles.note}>
        Estimated from the bioimpedance and motility signals — not a direct measurement.
      </p>
    </section>
  )
}
