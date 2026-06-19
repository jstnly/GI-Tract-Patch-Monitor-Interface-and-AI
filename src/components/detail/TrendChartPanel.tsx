import { useState } from 'react'
import type { Monitor, StatusBand } from '../../types/monitor'
import { TrendChart } from '../ui/TrendChart'
import styles from './TrendChartPanel.module.css'

const BAND_COLOR: Record<StatusBand, string> = {
  Normal: 'var(--color-normal)',
  Watch: 'var(--color-watch-bright)',
  Alert: 'var(--color-alert)',
}

type Selection = 'risk' | string

export function TrendChartPanel({ monitor }: { monitor: Monitor }) {
  const [selected, setSelected] = useState<Selection>('risk')
  const metric = monitor.metrics.find((m) => m.key === selected)

  return (
    <section aria-label="Trends over time">
      <h3 className={styles.heading}>Trend</h3>
      <div className={styles.chips} role="tablist" aria-label="Choose a series to plot">
        <button
          role="tab"
          aria-selected={selected === 'risk'}
          className={`${styles.chip} ${selected === 'risk' ? styles.active : ''}`}
          onClick={() => setSelected('risk')}
        >
          Risk
        </button>
        {monitor.metrics.map((m) => (
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

      {selected === 'risk' || !metric ? (
        <TrendChart
          data={monitor.riskHistory}
          domain={[0, 100]}
          normalRange={[0, 39]}
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
