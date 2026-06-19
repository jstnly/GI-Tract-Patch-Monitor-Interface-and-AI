import type { Metric, StatusBand } from '../types/monitor'

/** 'Normal' → 'normal', etc. Used as a CSS class / data key. */
export function bandKey(band: StatusBand): 'normal' | 'watch' | 'alert' {
  return band.toLowerCase() as 'normal' | 'watch' | 'alert'
}

export function formatValue(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

/** Value + unit with no space, e.g. "10.0/min", "82%", "6h", "32". */
export function formatMetric(metric: Metric): string {
  return `${metric.value.toFixed(metric.decimals)}${metric.unit}`
}

export function formatRange([lo, hi]: [number, number], unit: string): string {
  return `${lo}–${hi}${unit}`
}

/** Epoch ms → 24h clock "HH:MM". */
export function formatClock(epoch: number): string {
  const d = new Date(epoch)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Epoch ms → e.g. "Jun 19, 2026, 14:32". Used for signed-note timestamps. */
export function formatDateTime(epoch: number): string {
  return new Date(epoch).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Relative time, e.g. "just now", "4m ago", "2h ago". */
export function formatAgo(epoch: number, now: number): string {
  const s = Math.max(0, Math.floor((now - epoch) / 1000))
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${Math.max(1, m)}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
