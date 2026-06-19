import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'
import { useOverlay } from './useOverlay'
import styles from './Modal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Centred modal dialog, rendered through a portal. */
export function Modal({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useOverlay(open, onClose, panelRef)

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
