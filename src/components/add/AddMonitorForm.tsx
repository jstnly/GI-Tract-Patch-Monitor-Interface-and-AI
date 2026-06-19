import { useState, type FormEvent } from 'react'
import type { NewMonitorSeed, StartingProfile } from '../../types/monitor'
import { Button } from '../ui/Button'
import styles from './AddMonitorForm.module.css'

const PROFILES: Array<{ value: StartingProfile; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'watch', label: 'Watch' },
  { value: 'alert', label: 'Alert' },
  { value: 'random', label: 'Random' },
]

interface Props {
  onSubmit: (seed: NewMonitorSeed) => void
  onCancel: () => void
}

export function AddMonitorForm({ onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState('')
  const [bed, setBed] = useState('')
  const [profile, setProfile] = useState<StartingProfile>('normal')
  const [error, setError] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      setError(true)
      return
    }
    onSubmit({ label: trimmed, bed: bed.trim() || undefined, startingProfile: profile })
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.labelText}>Baby label</span>
        <input
          data-autofocus
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            if (error) setError(false)
          }}
          placeholder="e.g. Baby G"
        />
        {error && <span className={styles.err}>Enter a label.</span>}
      </label>

      <label className={styles.field}>
        <span className={styles.labelText}>
          Bed <span className={styles.optional}>(optional)</span>
        </span>
        <input
          className={styles.input}
          value={bed}
          onChange={(e) => setBed(e.target.value)}
          placeholder="e.g. Bed 7"
        />
      </label>

      <div className={styles.field}>
        <span className={styles.labelText}>Starting state</span>
        <div className={styles.segment} role="group" aria-label="Starting state">
          {PROFILES.map((p) => (
            <button
              type="button"
              key={p.value}
              className={`${styles.seg} ${profile === p.value ? styles.segActive : ''}`}
              onClick={() => setProfile(p.value)}
              aria-pressed={profile === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className={styles.hint}>For the demo — picks the monitor's initial risk band.</span>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add monitor
        </Button>
      </div>
    </form>
  )
}
