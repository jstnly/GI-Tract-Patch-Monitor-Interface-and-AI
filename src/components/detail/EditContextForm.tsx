import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { ContextEdits, MonitorContext } from '../../types/monitor'
import { Button } from '../ui/Button'
import styles from './EditContextForm.module.css'

/** Epoch ms -> "YYYY-MM-DDTHH:mm" in local time, for a datetime-local input. */
function toDatetimeLocal(epoch: number): string {
  const d = new Date(epoch)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  context: MonitorContext
  onSave: (edits: ContextEdits) => void
  onCancel: () => void
}

/** Inline editor for a baby's ages, weight, and last-feed time. */
export function EditContextForm({ context, onSave, onCancel }: Props) {
  const [ga, setGa] = useState(String(context.gestationalAgeWeeks))
  const [cad, setCad] = useState(String(context.correctedAgeDays))
  const [wt, setWt] = useState(String(context.weightGrams))
  const [fed, setFed] = useState(toDatetimeLocal(context.lastFeedTime))

  const numOr = (s: string, fallback: number) => {
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const fedMs = fed ? new Date(fed).getTime() : context.lastFeedTime
    onSave({
      gestationalAgeWeeks: numOr(ga, context.gestationalAgeWeeks),
      correctedAgeDays: numOr(cad, context.correctedAgeDays),
      weightGrams: numOr(wt, context.weightGrams),
      lastFeedTime: Number.isFinite(fedMs) ? fedMs : context.lastFeedTime,
    })
  }

  const esc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Gestational age (weeks)</span>
          <input
            className={styles.input}
            type="number"
            min="0"
            step="1"
            value={ga}
            onChange={(e) => setGa(e.target.value)}
            onKeyDown={esc}
            aria-label="Gestational age (weeks)"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Corrected age (days)</span>
          <input
            className={styles.input}
            type="number"
            min="0"
            step="1"
            value={cad}
            onChange={(e) => setCad(e.target.value)}
            onKeyDown={esc}
            aria-label="Corrected age (days)"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Weight (g)</span>
          <input
            className={styles.input}
            type="number"
            min="0"
            step="10"
            value={wt}
            onChange={(e) => setWt(e.target.value)}
            onKeyDown={esc}
            aria-label="Weight (grams)"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Last fed</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={fed}
            onChange={(e) => setFed(e.target.value)}
            onKeyDown={esc}
            aria-label="Last fed"
          />
        </label>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm">
          Save details
        </Button>
      </div>
    </form>
  )
}
