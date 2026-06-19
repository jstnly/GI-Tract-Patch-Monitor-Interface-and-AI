import type { MetricSample } from '../../types/monitor'

interface Props {
  data: MetricSample[]
  width?: number
  height?: number
  strokeWidth?: number
  className?: string
  color?: string
  /** Scale to the container width (uses a viewBox) instead of a fixed size. */
  responsive?: boolean
}

/** Tiny inline trend line (no axes). Scales to the data's own min/max. */
export function Sparkline({
  data,
  width = 56,
  height = 20,
  strokeWidth = 1.75,
  className,
  color = 'currentColor',
  responsive = false,
}: Props) {
  const pad = 2
  const sizing = responsive
    ? { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' as const }
    : { width, height }

  if (data.length < 2) {
    const y = height / 2
    return (
      <svg {...sizing} className={className} aria-hidden="true">
        <line
          x1={pad}
          y1={y}
          x2={width - pad}
          y2={y}
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect={responsive ? 'non-scaling-stroke' : undefined}
        />
      </svg>
    )
  }

  const values = data.map((d) => d.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const n = data.length
  const x = (i: number) => pad + (i / (n - 1)) * (width - pad * 2)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)

  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ')

  return (
    <svg {...sizing} className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect={responsive ? 'non-scaling-stroke' : undefined}
      />
    </svg>
  )
}
