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

/** A feeding SUGGESTION (decision support) — the care team makes the call. */
export function FeedingAdvisoryCard({ feeding }: { feeding: FeedingRecommendation }) {
  return (
    <section className={`${styles.card} ${TONE[feeding.action]}`} aria-label="Feeding suggestion">
      <span className={styles.iconWrap}>{icon(feeding.action)}</span>
      <div className={styles.body}>
        <span className={styles.eyebrow}>Feeding suggestion</span>
        <span className={styles.verb}>{feeding.label}</span>
        <span className={styles.rationale}>{feeding.rationale}</span>
        {feeding.action === 'feed_soon' && feeding.targetTime && (
          <span className={styles.meta}>Likely feed window ≈ {formatClock(feeding.targetTime)}</span>
        )}
        <span className={styles.disclaimer}>
          Decision support only — the care team decides.
        </span>
      </div>
    </section>
  )
}
