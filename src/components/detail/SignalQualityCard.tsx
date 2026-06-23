import type { SignalQuality, SignalStatus } from '../../types/monitor'
import { IconActivity, IconAlert, IconCheck } from '../ui/icons'
import styles from './SignalQualityCard.module.css'

const TONE: Record<SignalStatus, string> = {
  good: styles.good,
  placement: styles.placement,
  motion: styles.motion,
}

function icon(status: SignalStatus) {
  if (status === 'good') return <IconCheck size={18} />
  if (status === 'placement') return <IconAlert size={18} />
  return <IconActivity size={18} />
}

/**
 * AI signal-quality panel. Reports whether the three sensors look reliable
 * (patch placement / motion artifacts) — data-quality analysis only, never a
 * clinical diagnosis.
 */
export function SignalQualityCard({ signal }: { signal: SignalQuality }) {
  return (
    <section className={`${styles.card} ${TONE[signal.status]}`} aria-label="Signal quality">
      <div className={styles.header}>
        <span className={styles.iconWrap}>{icon(signal.status)}</span>
        <div className={styles.titles}>
          <span className={styles.eyebrow}>AI signal check</span>
          <span className={styles.label}>{signal.label}</span>
        </div>
      </div>
      <p className={styles.detail}>{signal.detail}</p>
      {signal.sensor && <span className={styles.sensor}>Source: {signal.sensor}</span>}
      <div className={`${styles.confidence} ${styles[`conf_${signal.confidence}`]}`}>
        <span className={styles.confDot} aria-hidden="true" />
        <span>
          <strong>{CONF_LABEL[signal.confidence]} confidence</strong> · {signal.sensorsAgreeing} of 3
          sensors agree
        </span>
      </div>
    </section>
  )
}

const CONF_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const
