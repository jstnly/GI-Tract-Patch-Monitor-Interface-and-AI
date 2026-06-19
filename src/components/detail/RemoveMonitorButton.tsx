import { useState } from 'react'
import { Button } from '../ui/Button'
import { IconTrash } from '../ui/icons'
import styles from './RemoveMonitorButton.module.css'

interface Props {
  label: string
  onRemove: () => void
}

/** Destructive remove with an inline confirm so nothing is deleted by accident. */
export function RemoveMonitorButton({ label, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <div className={styles.wrap}>
        <Button variant="danger" iconLeft={<IconTrash size={16} />} onClick={() => setConfirming(true)}>
          Remove monitor
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.confirm}>
      <span className={styles.question}>Remove {label}?</span>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}
