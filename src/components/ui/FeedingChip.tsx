import type { FeedingAction, FeedingRecommendation } from '../../types/monitor'
import { formatClock } from '../../lib/format'
import { IconBell, IconClock, IconFeed, IconHold } from './icons'
import styles from './FeedingChip.module.css'

interface Props {
  feeding: FeedingRecommendation
  size?: 'sm' | 'md'
  showTime?: boolean
}

const TONE: Record<FeedingAction, string> = {
  feed_now: styles.feed,
  feed_soon: styles.soon,
  hold: styles.hold,
  consult: styles.consult,
}

function iconFor(action: FeedingAction, size: number) {
  switch (action) {
    case 'feed_now':
      return <IconFeed size={size} />
    case 'feed_soon':
      return <IconClock size={size} />
    case 'hold':
      return <IconHold size={size} />
    case 'consult':
      return <IconBell size={size} />
  }
}

/** Compact feeding-advice pill: "Feed now", "Hold feeds", "Consult", etc. */
export function FeedingChip({ feeding, size = 'md', showTime = false }: Props) {
  const iconSize = size === 'sm' ? 13 : 15
  const time =
    showTime && feeding.action === 'feed_soon' && feeding.targetTime
      ? ` · ${formatClock(feeding.targetTime)}`
      : ''
  return (
    <span className={`${styles.chip} ${TONE[feeding.action]} ${styles[size]}`}>
      {iconFor(feeding.action, iconSize)}
      <span>
        {feeding.label}
        {time}
      </span>
    </span>
  )
}
