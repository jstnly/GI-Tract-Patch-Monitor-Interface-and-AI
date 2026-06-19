import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'
import {
  applyDrag,
  applyResize,
  clampToViewport,
  defaultRect,
  type Rect,
  type ResizeDir,
} from './floatingWindow.geometry'
import styles from './FloatingWindow.module.css'

const HANDLES: Array<{ key: string; cls: string; dir: ResizeDir }> = [
  // edges
  { key: 'n', cls: 'n', dir: { top: true } },
  { key: 's', cls: 's', dir: { bottom: true } },
  { key: 'w', cls: 'w', dir: { left: true } },
  { key: 'e', cls: 'e', dir: { right: true } },
  // corners
  { key: 'nw', cls: 'nw', dir: { left: true, top: true } },
  { key: 'ne', cls: 'ne', dir: { right: true, top: true } },
  { key: 'sw', cls: 'sw', dir: { left: true, bottom: true } },
  { key: 'se', cls: 'se', dir: { right: true, bottom: true } },
]

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })

interface Props {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Cascade offset for the initial position (used with multiple windows). */
  index?: number
  /** Stacking order (higher = on top). Driven by the window's z-position. */
  zIndex?: number
  /** Called when the window should be brought to the front. */
  onFocus?: () => void
}

/**
 * A non-modal, draggable, resizable floating panel. It does NOT dim or block the
 * page, so several can be open at once (e.g. comparing twins) while the rest of
 * the unit stays visible and clickable.
 */
export function FloatingWindow({
  open,
  onClose,
  title,
  children,
  index = 0,
  zIndex,
  onFocus,
}: Props) {
  const [rect, setRect] = useState<Rect>(() => defaultRect(viewport(), index))
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ sx: number; sy: number; start: Rect } | null>(null)
  const resize = useRef<{ sx: number; sy: number; start: Rect; dir: ResizeDir } | null>(null)

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onResize = () => setRect((r) => clampToViewport(r, viewport()))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  if (!open) return null

  const capture = (el: HTMLElement, id: number) => {
    try {
      el.setPointerCapture(id)
    } catch {
      // synthetic / unsupported — handlers still work
    }
  }
  const release = (el: HTMLElement, id: number) => {
    try {
      el.releasePointerCapture(id)
    } catch {
      // ignore
    }
  }

  const onHeaderDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, [data-no-drag]')) return
    e.preventDefault()
    capture(e.currentTarget as HTMLElement, e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, start: rect }
  }
  const onHeaderMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    setRect(applyDrag(d.start, e.clientX - d.sx, e.clientY - d.sy, viewport()))
  }
  const onHeaderUp = (e: ReactPointerEvent) => {
    drag.current = null
    release(e.currentTarget as HTMLElement, e.pointerId)
  }

  const onResizeDown = (e: ReactPointerEvent, dir: ResizeDir) => {
    e.preventDefault()
    capture(e.currentTarget as HTMLElement, e.pointerId)
    resize.current = { sx: e.clientX, sy: e.clientY, start: rect, dir }
  }
  const onResizeMove = (e: ReactPointerEvent) => {
    const z = resize.current
    if (!z) return
    setRect(applyResize(z.start, z.dir, e.clientX - z.sx, e.clientY - z.sy, viewport()))
  }
  const onResizeUp = (e: ReactPointerEvent) => {
    resize.current = null
    release(e.currentTarget as HTMLElement, e.pointerId)
  }

  return createPortal(
    <div
      ref={panelRef}
      className={styles.window}
      role="dialog"
      aria-modal="false"
      aria-label="Monitor detail"
      tabIndex={-1}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex }}
      onPointerDown={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        className={styles.header}
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        onPointerCancel={onHeaderUp}
      >
        <div className={styles.title}>{title}</div>
        <button className={styles.close} onClick={onClose} aria-label="Close" data-no-drag>
          <IconClose size={20} />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {HANDLES.map((c) => (
        <div
          key={c.key}
          className={`${styles.handle} ${styles[c.cls]}`}
          onPointerDown={(e) => onResizeDown(e, c.dir)}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          aria-hidden="true"
          title="Drag to resize"
        />
      ))}
    </div>,
    document.body,
  )
}
