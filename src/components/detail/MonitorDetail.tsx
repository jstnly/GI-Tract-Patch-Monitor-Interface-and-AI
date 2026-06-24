import { useState } from 'react'
import type { Monitor } from '../../types/monitor'
import { formatAgo } from '../../lib/format'
import { useMonitorActions, useOpenMonitors } from '../../state/hooks'
import { FloatingWindow } from '../ui/FloatingWindow'
import { RiskMeter } from '../ui/RiskMeter'
import { StatusBadge } from '../ui/StatusBadge'
import { IconPencil } from '../ui/icons'
import { DemoControls } from './DemoControls'
import { EditContextForm } from './EditContextForm'
import { FeedingAdvisoryCard } from './FeedingAdvisoryCard'
import { MetricGrid } from './MetricGrid'
import { MotilityIndexCard } from './MotilityIndexCard'
import { NurseNotesCard } from './NurseNotesCard'
import { RemoveMonitorButton } from './RemoveMonitorButton'
import { RenameMonitorForm } from './RenameMonitorForm'
import { SignalQualityCard } from './SignalQualityCard'
import { TrendChartPanel } from './TrendChartPanel'
import styles from './MonitorDetail.module.css'

/** One floating detail window for a single baby. Keyed by monitor id, so its
 *  local editing state is naturally scoped to that baby. */
function MonitorWindow({ monitor, index }: { monitor: Monitor; index: number }) {
  const actions = useMonitorActions()
  const [editing, setEditing] = useState(false)
  const [editingContext, setEditingContext] = useState(false)
  const now = Date.now()

  return (
    <FloatingWindow
      open
      index={index}
      zIndex={90 + index}
      onClose={() => actions.close(monitor.id)}
      onFocus={() => actions.focus(monitor.id)}
      title={
        editing ? (
          <RenameMonitorForm
            initialLabel={monitor.label}
            initialBed={monitor.bed}
            initialBabyId={monitor.context.babyId}
            onSave={(label, bed, babyId) => {
              actions.renameMonitor(monitor.id, label, bed, babyId)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <div className={styles.titleRow}>
              <span className={styles.titleName}>{monitor.label}</span>
              <button
                className={styles.editBtn}
                onClick={() => setEditing(true)}
                aria-label="Rename monitor"
              >
                <IconPencil size={15} />
              </button>
            </div>
            <div className={styles.titleSub}>
              {monitor.bed} · {monitor.context.babyId}
            </div>
          </div>
        )
      }
    >
      {editingContext ? (
        <EditContextForm
          context={monitor.context}
          onSave={(edits) => {
            actions.updateContext(monitor.id, edits)
            setEditingContext(false)
          }}
          onCancel={() => setEditingContext(false)}
        />
      ) : (
        <section className={styles.summary}>
          <RiskMeter value={monitor.motileProbability} band={monitor.status} size={112} stroke={10} showCaption />
          <div className={styles.facts}>
            <div className={styles.factsHeader}>
              <StatusBadge band={monitor.status} />
              <button
                className={styles.editBtn}
                onClick={() => setEditingContext(true)}
                aria-label="Edit ages, weight, and last fed"
              >
                <IconPencil size={14} />
                <span>Edit</span>
              </button>
            </div>
            <ul className={styles.factList}>
              <li>
                <span>Gestational age</span>
                <span className="tnum">{monitor.context.gestationalAgeWeeks} wk</span>
              </li>
              <li>
                <span>Corrected age</span>
                <span className="tnum">{monitor.context.correctedAgeDays} d</span>
              </li>
              <li>
                <span>Weight</span>
                <span className="tnum">{monitor.context.weightGrams} g</span>
              </li>
              <li>
                <span>Last fed</span>
                <span className="tnum">{formatAgo(monitor.context.lastFeedTime, now)}</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {monitor.calibrating && (
        <div className={styles.calibratingBanner}>
          Establishing this baby's baseline (first ~48 h). Live readings show now; baseline
          comparisons appear once calibration completes.
        </div>
      )}
      <SignalQualityCard signal={monitor.signal} />
      <FeedingAdvisoryCard feeding={monitor.feeding} />
      <MotilityIndexCard motility={monitor.motility} />
      <MetricGrid metrics={monitor.metrics} calibrating={monitor.calibrating} />
      <TrendChartPanel monitor={monitor} />
      <NurseNotesCard monitorId={monitor.id} notes={monitor.notes} />

      {actions.forceState && <DemoControls monitorId={monitor.id} forceState={actions.forceState} />}

      <RemoveMonitorButton label={monitor.label} onRemove={() => actions.removeMonitor(monitor.id)} />
    </FloatingWindow>
  )
}

/** Renders a floating window for every open monitor (multiple at once). */
export function MonitorDetail() {
  const open = useOpenMonitors()
  return (
    <>
      {open.map((m, i) => (
        <MonitorWindow key={m.id} monitor={m} index={i} />
      ))}
    </>
  )
}
