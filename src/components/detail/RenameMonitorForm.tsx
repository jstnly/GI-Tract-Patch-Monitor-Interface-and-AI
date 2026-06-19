import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import styles from './RenameMonitorForm.module.css'

interface Props {
  initialLabel: string
  initialBed: string
  initialBabyId: string
  onSave: (label: string, bed: string, babyId: string) => void
  onCancel: () => void
}

/** Inline editor for a monitor's baby label, bed, and DICU id. */
export function RenameMonitorForm({
  initialLabel,
  initialBed,
  initialBabyId,
  onSave,
  onCancel,
}: Props) {
  const [label, setLabel] = useState(initialLabel)
  const [bed, setBed] = useState(initialBed)
  const [babyId, setBabyId] = useState(initialBabyId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    onSave(trimmed, bed.trim() || initialBed, babyId.trim() || initialBabyId)
  }

  const cancelOnEscape = (e: { key: string; stopPropagation: () => void }) => {
    if (e.key === 'Escape') {
      e.stopPropagation() // cancel the edit, don't close the drawer
      onCancel()
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        autoFocus
        className={`${styles.input} ${styles.name}`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label="Baby label"
        placeholder="Baby label"
        onKeyDown={cancelOnEscape}
      />
      <div className={styles.fields}>
        <input
          className={styles.input}
          value={bed}
          onChange={(e) => setBed(e.target.value)}
          aria-label="Bed"
          placeholder="Bed"
          onKeyDown={cancelOnEscape}
        />
        <input
          className={styles.input}
          value={babyId}
          onChange={(e) => setBabyId(e.target.value)}
          aria-label="DICU ID"
          placeholder="DICU ID"
          onKeyDown={cancelOnEscape}
        />
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!label.trim()}>
          Save
        </Button>
      </div>
    </form>
  )
}
