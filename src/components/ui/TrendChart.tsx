import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
const clampN = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * Lightweight SVG line chart. Hover — or press-and-hold + drag on touch — reads
 * the exact value at the nearest sample (crosshair + tooltip). No dependency.
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
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)

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
    n >= 2 ? `${padX},${height - padY} ${line} ${x(n - 1).toFixed(1)},${height - padY}` : ''
  const last = data[data.length - 1]

  // --- interactivity --------------------------------------------------------
  const indexFromX = (clientX: number): number | null => {
    const svg = svgRef.current
    if (!svg || n < 2) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return null
    const vbX = ((clientX - rect.left) / rect.width) * VIEW_W
    const i = Math.round(((vbX - padX) / (VIEW_W - padX * 2)) * (n - 1))
    return clampN(i, 0, n - 1)
  }
  const onMove = (e: ReactPointerEvent) => {
    const i = indexFromX(e.clientX)
    if (i !== null) setActive(i)
  }
  const onDown = (e: ReactPointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    onMove(e)
  }
  const clear = () => setActive(null)

  const point = active !== null ? data[active] : undefined
  const ax = active !== null ? x(active) : 0
  const ay = point ? y(point.v) : 0
  const leftPct = clampN((ax / VIEW_W) * 100, 7, 93)
  const topPct = point ? (ay / height) * 100 : 0
  const below = topPct < 30
  const relSec = point && last ? Math.round((last.t - point.t) / 1000) : 0

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.chart}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        role="img"
        aria-label="Trend over time"
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
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
        {last && !point && (
          <circle cx={x(n - 1)} cy={y(last.v)} r={3.5} fill={color} vectorEffect="non-scaling-stroke" />
        )}

        {point && (
          <>
            <line
              className={styles.crosshair}
              x1={ax}
              y1={padY}
              x2={ax}
              y2={height - padY}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={ax}
              cy={ay}
              r={4.5}
              fill={color}
              stroke="var(--color-surface)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
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

      {point && (
        <div
          className={styles.tooltip}
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            transform: below ? 'translate(-50%, 12px)' : 'translate(-50%, calc(-100% - 12px))',
          }}
        >
          <span className={styles.tipValue}>
            {point.v.toFixed(decimals)}
            {unit}
          </span>
          <span className={styles.tipTime}>{relSec <= 0 ? 'now' : `−${relSec}s`}</span>
        </div>
      )}
    </div>
  )
}
