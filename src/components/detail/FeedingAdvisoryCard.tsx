import type { FeedingAction, FeedingRecommendation } from '../../types/monitor'
import { formatClock } from '../../lib/format'
import { IconBell, IconClock, IconFeed, IconHold } from '../ui/icons'
import styles from './FeedingAdvisoryCard.module.css'

const TONE: Record<FeedingAction, string> = {
  feed_now: styles.feed,
  feed_soon: styles.soon,
  hold: styles.hold,
  consult: styles.consult,
}

function icon(action: FeedingAction) {
  switch (action) {
    case 'feed_now':
      return <IconFeed size={22} />
    case 'feed_soon':
      return <IconClock size={22} />
    case 'hold':
      return <IconHold size={22} />
    case 'consult':
      return <IconBell size={22} />
  }
}

/** Action-first feeding recommendation — the decision a nurse came to make. */
export function FeedingAdvisoryCard({ feeding }: { feeding: FeedingRecommendation }) {
  return (
    <section className={`${styles.card} ${TONE[feeding.action]}`} aria-label="Feeding recommendation">
      <span className={styles.iconWrap}>{icon(feeding.action)}</span>
      <div className={styles.body}>
        <span className={styles.eyebrow}>Feeding advisory</span>
        <span className={styles.verb}>{feeding.label}</span>
        <span className={styles.rationale}>{feeding.rationale}</span>
        {feeding.action === 'feed_soon' && feeding.targetTime && (
          <span className={styles.meta}>Next feed ≈ {formatClock(feeding.targetTime)}</span>
        )}
      </div>
    </section>
  )
}
