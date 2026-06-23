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

function vsBaseline(m: Metric): string {
  if (!m.baseline) return ''
  const pct = Math.round(((m.value - m.baseline) / m.baseline) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

/** The full spectrum of metrics for the selected baby, vs. its own baseline. */
export function MetricGrid({
  metrics,
  calibrating,
}: {
  metrics: Metric[]
  calibrating: boolean
}) {
  return (
    <section aria-label="All metrics">
      <h3 className={styles.heading}>Sensor readings</h3>
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
            {calibrating ? (
              <div className={styles.calibrating}>Calibrating baseline…</div>
            ) : Number.isFinite(m.baseline) ? (
              <div className={styles.baseline}>
                Baseline {m.baseline.toFixed(m.decimals)}
                {m.unit} · <span className={styles.delta}>{vsBaseline(m)}</span>
              </div>
            ) : null}
            {m.chartable ? (
              <Sparkline
                data={m.history}
                width={200}
                height={34}
                responsive
                className={styles.spark}
                color={m.outOfRange ? 'var(--color-watch-bright)' : 'var(--color-accent)'}
              />
            ) : (
              m.key === 'coordination' && (
                <div className={styles.scaleHint}>0 = sequential · 5 = random</div>
              )
            )}
            <div className={styles.sensor}>Sensor: {m.sensor}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
