import { useMemo } from 'react'
import type { MetricSample } from '../../types/monitor'
import styles from './TrendChart.module.css'

interface Props {
  data: MetricSample[]
  /** y-axis domain. Defaults to data min/max (with the normal band included). */
  domain?: [number, number]
  /** Highlighted healthy band, shaded behind the line. */
  normalRange?: [number, number]
  color?: string
  unit?: string
  decimals?: number
  height?: number
}

const VIEW_W = 600

/**
 * Lightweight SVG line chart used in the detail drawer. No dependency — if
 * richer charts are wanted later, only this file changes (props stay the same).
 */
export function TrendChart({
  data,
  domain,
  normalRange,
  color = 'var(--color-accent)',
  unit = '',
  decimals = 0,
  height = 160,
}: Props) {
  const padX = 8
  const padY = 12

  const { lo, hi } = useMemo(() => {
    const values = data.map((d) => d.v)
    let min = domain ? domain[0] : Math.min(...values, normalRange?.[0] ?? Infinity)
    let max = domain ? domain[1] : Math.max(...values, normalRange?.[1] ?? -Infinity)
    if (!isFinite(min) || !isFinite(max)) {
      min = 0
      max = 1
    }
    if (min === max) {
      min -= 1
      max += 1
    }
    const margin = (max - min) * 0.08
    return { lo: domain ? min : min - margin, hi: domain ? max : max + margin }
  }, [data, domain, normalRange])

  const span = hi - lo || 1
  const n = data.length
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (VIEW_W - padX * 2)
  const y = (v: number) => padY + (1 - (v - lo) / span) * (height - padY * 2)

  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ')
  const area =
    n >= 2
      ? `${padX},${height - padY} ${line} ${x(n - 1).toFixed(1)},${height - padY}`
      : ''

  const last = data[data.length - 1]

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      role="img"
      aria-label="Trend over time"
    >
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {normalRange && (
        <rect
          x={0}
          y={y(normalRange[1])}
          width={VIEW_W}
          height={Math.max(0, y(normalRange[0]) - y(normalRange[1]))}
          className={styles.normalBand}
        />
      )}

      {n >= 2 && <polygon points={area} fill="url(#trendFill)" />}
      {n >= 2 && (
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {last && (
        <circle cx={x(n - 1)} cy={y(last.v)} r={3.5} fill={color} vectorEffect="non-scaling-stroke" />
      )}

      <text x={padX} y={14} className={styles.axisLabel}>
        {hi.toFixed(decimals)}
        {unit}
      </text>
      <text x={padX} y={height - 4} className={styles.axisLabel}>
        {lo.toFixed(decimals)}
        {unit}
      </text>
    </svg>
  )
}
