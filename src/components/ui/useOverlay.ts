import { useEffect, type RefObject } from 'react'

/**
 * Shared overlay behaviour for Modal/Drawer: Escape to close, body scroll lock,
 * move focus into the panel on open and restore it on close.
 */
export function useOverlay(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    if (panel) {
      const focusable = panel.querySelector<HTMLElement>(
        '[data-autofocus], input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable ?? panel).focus()
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, panelRef])
}
