import type { Metric } from '../../types/monitor'
import { formatMetric, formatRange } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { IconTrendDown, IconTrendFlat, IconTrendUp } from '../ui/icons'
import styles from './MetricGrid.module.css'

function Trend({ trend }: { trend: Metric['trend'] }) {
  if (trend === 'up') return <IconTrendUp size={14} />
  if (trend === 'down') return <IconTrendDown size={14} />
  return <IconTrendFlat size={14} />
}

/** The full spectrum of metrics for the selected baby. */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section aria-label="All metrics">
      <h3 className={styles.heading}>Movement &amp; bowel data</h3>
      <div className={styles.grid}>
        {metrics.map((m) => (
          <div key={m.key} className={`${styles.tile} ${m.outOfRange ? styles.out : ''}`}>
            <div className={styles.row1}>
              <span className={styles.label}>{m.label}</span>
              <span className={styles.trend}>
                <Trend trend={m.trend} />
              </span>
            </div>
            <div className={`${styles.value} tnum`}>{formatMetric(m)}</div>
            <div className={styles.range}>Normal {formatRange(m.normalRange, m.unit)}</div>
            <Sparkline
              data={m.history}
              width={200}
              height={34}
              responsive
              className={styles.spark}
              color={m.outOfRange ? 'var(--color-watch-bright)' : 'var(--color-accent)'}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
