import type { StatusBand } from '../../types/monitor'
import { bandKey } from '../../lib/format'
import styles from './RiskMeter.module.css'

interface Props {
  /** 0–100 */
  value: number
  band: StatusBand
  /** Diameter in px. */
  size?: number
  stroke?: number
  showCaption?: boolean
}

/** Circular risk gauge: a single arc coloured by band, percentage in the centre. */
export function RiskMeter({ value, band, size = 64, stroke = 7, showCaption = false }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = (Math.max(0, Math.min(100, value)) / 100) * c
  const center = size / 2

  return (
    <div
      className={`${styles.meter} ${styles[bandKey(band)]}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Risk ${value}%, ${band}`}
    >
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform={`rotate(-90 ${center} ${center})`}
          className={styles.arc}
        />
      </svg>
      <div className={styles.center}>
        <span className={`${styles.value} tnum`} style={{ fontSize: size * 0.26 }}>
          {value}
          <span className={styles.pct}>%</span>
        </span>
        {showCaption && <span className={styles.caption}>RISK</span>}
      </div>
    </div>
  )
}
