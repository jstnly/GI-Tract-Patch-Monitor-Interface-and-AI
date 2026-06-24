import { useState } from 'react'
import type { Monitor, StatusBand } from '../../types/monitor'
import { TrendChart } from '../ui/TrendChart'
import styles from './TrendChartPanel.module.css'

const BAND_COLOR: Record<StatusBand, string> = {
  Normal: 'var(--color-normal)',
  Watch: 'var(--color-watch-bright)',
  Alert: 'var(--color-alert)',
}

type Selection = 'motile' | string

export function TrendChartPanel({ monitor }: { monitor: Monitor }) {
  const [selected, setSelected] = useState<Selection>('motile')
  // Coordination (and any non-chartable metric) has no trend graph.
  const chartable = monitor.metrics.filter((m) => m.chartable)
  const metric = chartable.find((m) => m.key === selected)

  return (
    <section aria-label="Trends over time">
      <h3 className={styles.heading}>Trend</h3>
      <div className={styles.chips} role="tablist" aria-label="Choose a series to plot">
        <button
          role="tab"
          aria-selected={selected === 'motile'}
          className={`${styles.chip} ${selected === 'motile' ? styles.active : ''}`}
          onClick={() => setSelected('motile')}
        >
          Motile prob.
        </button>
        {chartable.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={selected === m.key}
            className={`${styles.chip} ${selected === m.key ? styles.active : ''}`}
            onClick={() => setSelected(m.key)}
          >
            {m.shortLabel}
          </button>
        ))}
      </div>

      {selected === 'motile' || !metric ? (
        <TrendChart
          data={monitor.motileHistory}
          domain={[0, 100]}
          normalRange={[60, 100]}
          color={BAND_COLOR[monitor.status]}
          unit="%"
          decimals={0}
        />
      ) : (
        <TrendChart
          data={metric.history}
          normalRange={metric.normalRange}
          color="var(--color-accent)"
          unit={metric.unit}
          decimals={metric.decimals}
        />
      )}
    </section>
  )
}
