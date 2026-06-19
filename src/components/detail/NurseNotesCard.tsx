import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { NurseNote } from '../../types/monitor'
import { formatDateTime } from '../../lib/format'
import { useMonitorActions } from '../../state/hooks'
import { Button } from '../ui/Button'
import { IconClose } from '../ui/icons'
import styles from './NurseNotesCard.module.css'

const NURSE_KEY = 'dashboard.nurse'

function loadNurse(): { name: string; id: string } {
  try {
    const raw = localStorage.getItem(NURSE_KEY)
    const v = raw ? JSON.parse(raw) : {}
    return { name: v.name ?? '', id: v.id ?? '' }
  } catch {
    return { name: '', id: '' }
  }
}

function saveNurse(name: string, id: string): void {
  try {
    localStorage.setItem(NURSE_KEY, JSON.stringify({ name, id }))
  } catch {
    // ignore
  }
}

interface Props {
  monitorId: string
  notes: NurseNote[]
}

/** Append-only signed-note log for a baby's medical record. Original notes are
 *  never edited; corrections/updates are added as signed addenda, each of which
 *  becomes the newest entry, signed by whoever adds it. */
export function NurseNotesCard({ monitorId, notes }: Props) {
  const actions = useMonitorActions()
  const [text, setText] = useState('')
  const [name, setName] = useState(() => loadNurse().name)
  const [nurseId, setNurseId] = useState(() => loadNurse().id)
  const [error, setError] = useState('')
  const [addendumTo, setAddendumTo] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const items = notes ?? []
  const byId = new Map(items.map((n) => [n.id, n]))
  const addendaCount = new Map<string, number>()
  for (const n of items) {
    if (n.addendumTo) addendaCount.set(n.addendumTo, (addendaCount.get(n.addendumTo) ?? 0) + 1)
  }
  const parent = addendumTo ? byId.get(addendumTo) : undefined

  // When the nurse chooses to addend a note, bring the composer into view.
  useEffect(() => {
    if (addendumTo && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [addendumTo])

  const canSave = Boolean(text.trim() && name.trim() && nurseId.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) {
      setError('Add a note and sign with your name and ID to save.')
      return
    }
    actions.addNote(monitorId, {
      text: text.trim(),
      nurseName: name.trim(),
      nurseId: nurseId.trim(),
      addendumTo: addendumTo ?? undefined,
    })
    saveNurse(name.trim(), nurseId.trim())
    setText('')
    setError('')
    setAddendumTo(null)
  }

  const swallowEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation() // don't close the drawer mid-note
      if (addendumTo) setAddendumTo(null)
    }
  }

  const parentRef = (n: NurseNote): string => {
    const p = n.addendumTo ? byId.get(n.addendumTo) : undefined
    return p
      ? `Addendum to ${p.nurseName}'s note · ${formatDateTime(p.timestamp)}`
      : 'Addendum to an earlier note'
  }

  const ordered = [...items].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <section aria-label="Nurse notes">
      <h3 className={styles.heading}>
        Nurse notes
        {items.length > 0 && <span className={styles.count}>{items.length}</span>}
      </h3>

      <form className={styles.composer} onSubmit={submit}>
        {addendumTo && (
          <div className={styles.addendumBanner}>
            <span>
              Addendum to{' '}
              <strong>
                {parent ? `${parent.nurseName}'s note · ${formatDateTime(parent.timestamp)}` : 'an earlier note'}
              </strong>
            </span>
            <button
              type="button"
              className={styles.bannerClose}
              onClick={() => setAddendumTo(null)}
              aria-label="Cancel addendum"
            >
              <IconClose size={14} />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={swallowEscape}
          placeholder={
            addendumTo ? 'Add an addendum…' : "Add a note for this baby's medical record…"
          }
          rows={3}
          aria-label="Note"
        />
        <div className={styles.signRow}>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={swallowEscape}
            placeholder="Nurse name"
            aria-label="Nurse name"
          />
          <input
            className={`${styles.input} ${styles.idInput}`}
            value={nurseId}
            onChange={(e) => setNurseId(e.target.value)}
            onKeyDown={swallowEscape}
            placeholder="ID #"
            aria-label="Nurse ID number"
          />
          <Button type="submit" variant="primary" size="sm" disabled={!canSave}>
            {addendumTo ? 'Sign & save addendum' : 'Sign & save'}
          </Button>
        </div>
        {error && <span className={styles.error}>{error}</span>}
      </form>

      <ul className={styles.log}>
        {ordered.length === 0 ? (
          <li className={styles.empty}>
            No notes yet. Signed notes become part of this baby's record.
          </li>
        ) : (
          ordered.map((n) => {
            const isAddendum = Boolean(n.addendumTo)
            const count = addendaCount.get(n.id) ?? 0
            return (
              <li key={n.id} className={`${styles.note} ${isAddendum ? styles.addendum : ''}`}>
                {isAddendum && <div className={styles.addLabel}>↳ {parentRef(n)}</div>}
                <p className={styles.noteText}>{n.text}</p>
                <div className={styles.meta}>
                  Signed by <strong>{n.nurseName}</strong> · ID {n.nurseId} ·{' '}
                  {formatDateTime(n.timestamp)}
                </div>
                {!isAddendum && (
                  <div className={styles.noteActions}>
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => setAddendumTo(n.id)}
                    >
                      Add addendum
                    </button>
                    {count > 0 && (
                      <span className={styles.addendaHint}>
                        {count} addendum{count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
