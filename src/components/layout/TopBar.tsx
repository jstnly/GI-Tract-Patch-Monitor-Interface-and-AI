import { useState } from 'react'
import { useMonitorActions, useUIState } from '../../state/hooks'
import { Button } from '../ui/Button'
import { IconActivity, IconPause, IconPlay, IconPlus, IconSliders } from '../ui/icons'
import { Clock } from './Clock'
import { FleetSummary } from './FleetSummary'
import styles from './TopBar.module.css'

export function TopBar() {
  const actions = useMonitorActions()
  const { paused, density } = useUIState()
  const [demoOpen, setDemoOpen] = useState(false)
  const hasDemo = Boolean(actions.demo)

  return (
    <header className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.brand}>
          <span className={styles.glyph} aria-hidden="true">
            <IconActivity size={20} />
          </span>
          <div>
            <h1 className={styles.title}>Monitor Overview</h1>
            <Clock className={styles.clock} />
          </div>
        </div>

        <div className={styles.actions}>
          <FleetSummary />
          <div className={styles.density} role="group" aria-label="Layout density">
            <button
              className={density === 'comfortable' ? styles.densityActive : ''}
              onClick={() => actions.setDensity('comfortable')}
              aria-pressed={density === 'comfortable'}
            >
              Detailed
            </button>
            <button
              className={density === 'compact' ? styles.densityActive : ''}
              onClick={() => actions.setDensity('compact')}
              aria-pressed={density === 'compact'}
            >
              Minimal
            </button>
          </div>
          {hasDemo && (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<IconSliders size={16} />}
              onClick={() => setDemoOpen((v) => !v)}
              aria-expanded={demoOpen}
            >
              Demo
            </Button>
          )}
          <Button variant="primary" iconLeft={<IconPlus size={18} />} onClick={actions.openAdd}>
            Add monitor
          </Button>
        </div>
      </div>

      {hasDemo && demoOpen && (
        <div className={styles.demoBar}>
          <span className={styles.demoLabel}>Demo controls</span>
          <Button size="sm" onClick={() => actions.demo?.addRandom()}>
            Add random monitor
          </Button>
          <Button size="sm" onClick={() => actions.demo?.driftRandomToAlert()}>
            Drift one to Alert
          </Button>
          <Button
            size="sm"
            iconLeft={paused ? <IconPlay size={14} /> : <IconPause size={14} />}
            onClick={() => actions.demo?.setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'} simulation
          </Button>
        </div>
      )}
    </header>
  )
}
