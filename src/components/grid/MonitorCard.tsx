import { memo, type ReactNode } from 'react'
import type { Metric, Monitor } from '../../types/monitor'
import { CARD_METRIC_KEYS } from '../../lib/engine/config'
import { bandKey, formatMetric } from '../../lib/format'
import { useMonitorActions } from '../../state/hooks'
import { FeedingChip } from '../ui/FeedingChip'
import { RiskMeter } from '../ui/RiskMeter'
import { Sparkline } from '../ui/Sparkline'
import { StatusBadge } from '../ui/StatusBadge'
import {
  IconAlert,
  IconChevronRight,
  IconTrendDown,
  IconTrendFlat,
  IconTrendUp,
} from '../ui/icons'
import styles from './MonitorCard.module.css'

interface Props {
  monitor: Monitor
  compact?: boolean
}

function trendIcon(trend: Metric['trend']): ReactNode {
  if (trend === 'up') return <IconTrendUp size={13} />
  if (trend === 'down') return <IconTrendDown size={13} />
  return <IconTrendFlat size={13} />
}

function MonitorCardImpl({ monitor, compact = false }: Props) {
  const actions = useMonitorActions()
  const byKey = new Map(monitor.metrics.map((m) => [m.key, m]))
  const cardMetrics = CARD_METRIC_KEYS.map((k) => byKey.get(k)).filter((m): m is Metric => !!m)
  const bandClass = styles[bandKey(monitor.status)] ?? ''
  const signalIssue = monitor.signal.status !== 'good'

  return (
    <button
      className={`${styles.card} ${bandClass} ${compact ? styles.compact : ''}`}
      onClick={() => actions.open(monitor.id)}
      aria-label={`${monitor.label}, ${monitor.bed}, risk ${monitor.riskPct}%, status ${monitor.status}.${signalIssue ? ` Signal: ${monitor.signal.label}.` : ''} Open details.`}
    >
      <div className={styles.top}>
        <div className={styles.ident}>
          <span className={styles.label}>{monitor.label}</span>
          <span className={styles.sub}>
            {monitor.bed}
            {!compact && ` · ${monitor.context.babyId}`}
          </span>
        </div>
        <StatusBadge band={monitor.status} size="sm" />
      </div>

      {monitor.calibrating && <div className={styles.calibratingFlag}>Calibrating baseline…</div>}
      {signalIssue && (
        <div className={styles.signalFlag}>
          <IconAlert size={12} />
          <span>{monitor.signal.label}</span>
        </div>
      )}

      <div className={styles.mid}>
        <RiskMeter
          value={monitor.riskPct}
          band={monitor.status}
          size={compact ? 52 : 78}
          stroke={compact ? 6 : 7}
          showCaption={!compact}
        />
        <ul className={styles.metrics}>
          {cardMetrics.map((m) => (
            <li key={m.key} className={styles.metricRow}>
              <span className={styles.mlabel}>{m.shortLabel}</span>
              <span className={`${styles.mval} tnum ${m.outOfRange ? styles.out : ''}`}>
                {formatMetric(m)}
              </span>
              {!compact && (
                <>
                  {m.chartable ? (
                    <Sparkline data={m.history} width={44} height={16} className={styles.spark} />
                  ) : (
                    <span className={styles.spark} />
                  )}
                  <span className={styles.trend}>{trendIcon(m.trend)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.foot}>
        <FeedingChip feeding={monitor.feeding} size="sm" showTime={!compact} />
        {!compact && (
          <span className={styles.more}>
            Details
            <IconChevronRight size={14} />
          </span>
        )}
      </div>
    </button>
  )
}

/** Re-render only when this monitor's revision changes (set by the engine on
 *  any meaningful update) or the density changes. */
export const MonitorCard = memo(
  MonitorCardImpl,
  (a, b) => a.monitor.revision === b.monitor.revision && a.compact === b.compact,
)
