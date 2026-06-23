import type { MotilityIndex } from '../../types/monitor'
import styles from './MotilityIndexCard.module.css'

/** Combined Motility Index box: post-fed Gain vs. resting baseline. */
export function MotilityIndexCard({ motility }: { motility: MotilityIndex }) {
  const [lo, hi] = motility.normalGain
  const out = motility.gain < lo || motility.gain > hi

  return (
    <section className={styles.card} aria-label="Motility Index">
      <h3 className={styles.heading}>Motility Index</h3>
      <div className={styles.gainRow}>
        <div className={styles.gainBlock}>
          <span className={`${styles.gainVal} tnum ${out ? styles.out : ''}`}>
            {motility.gain.toFixed(1)}
            <span className={styles.times}>×</span>
          </span>
          <span className={styles.gainLabel}>Gain · post-fed ÷ baseline</span>
        </div>
        <span className={`${styles.normalTag} ${out ? styles.normalTagOut : ''}`}>
          Normal {lo}–{hi}×
        </span>
      </div>
      <div className={styles.subStats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Motility Index</span>
          <span className={`${styles.statVal} tnum`}>{motility.index.toFixed(1)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Baseline (first 48 h)</span>
          <span className={`${styles.statVal} tnum`}>{motility.baseline.toFixed(1)}</span>
        </div>
      </div>
    </section>
  )
}
