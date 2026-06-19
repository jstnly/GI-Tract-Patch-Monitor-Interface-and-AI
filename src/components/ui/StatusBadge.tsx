import type { StatusBand } from '../../types/monitor'
import { bandKey } from '../../lib/format'
import { IconAlert, IconCheck, IconWatch } from './icons'
import styles from './StatusBadge.module.css'

interface Props {
  band: StatusBand
  size?: 'sm' | 'md'
}

const LABEL: Record<StatusBand, string> = {
  Normal: 'Normal',
  Watch: 'Watch',
  Alert: 'ALERT',
}

/** Pill carrying icon + word + colour — so band is never signalled by colour alone. */
export function StatusBadge({ band, size = 'md' }: Props) {
  const Icon = band === 'Alert' ? IconAlert : band === 'Watch' ? IconWatch : IconCheck
  return (
    <span className={`${styles.badge} ${styles[bandKey(band)]} ${styles[size]}`}>
      <Icon size={size === 'sm' ? 13 : 15} />
      <span>{LABEL[band]}</span>
    </span>
  )
}
