/**
 * Pure geometry for the floating window: dragging, all-corner resizing, and the
 * default cascade position. Kept free of DOM/`window` (the viewport is passed
 * in) so it is deterministic and unit-testable.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Size {
  width: number
  height: number
}

/** Which edges a resize handle moves. */
export interface ResizeDir {
  left?: boolean
  right?: boolean
  top?: boolean
  bottom?: boolean
}

export const MIN_W = 320
export const MIN_H = 280

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** Move a window by (dx, dy), keeping it fully on-screen. */
export function applyDrag(start: Rect, dx: number, dy: number, vp: Size): Rect {
  return {
    ...start,
    x: clamp(start.x + dx, 0, vp.width - start.w),
    y: clamp(start.y + dy, 0, vp.height - start.h),
  }
}

/**
 * Resize from any corner. Right/bottom grow within the viewport; left/top keep
 * the opposite edge fixed and never push the window off-screen, all subject to
 * the minimum size.
 */
export function applyResize(start: Rect, dir: ResizeDir, dx: number, dy: number, vp: Size): Rect {
  let { x, y, w, h } = start

  if (dir.right) {
    w = clamp(start.w + dx, MIN_W, vp.width - start.x)
  }
  if (dir.bottom) {
    h = clamp(start.h + dy, MIN_H, vp.height - start.y)
  }
  if (dir.left) {
    const rightEdge = start.x + start.w // stays fixed
    w = clamp(start.w - dx, MIN_W, rightEdge)
    x = rightEdge - w
  }
  if (dir.top) {
    const bottomEdge = start.y + start.h // stays fixed
    h = clamp(start.h - dy, MIN_H, bottomEdge)
    y = bottomEdge - h
  }

  return { x, y, w, h }
}

/** Default position/size for the Nth open window (cascaded so they don't overlap). */
export function defaultRect(vp: Size, index = 0): Rect {
  const margin = 16
  const topGap = 68 // below the sticky top bar
  const w = Math.max(MIN_W, Math.min(480, vp.width - margin * 2))
  const h = Math.max(MIN_H, Math.min(680, vp.height - topGap - margin))
  const offset = (index % 6) * 36
  const x = clamp(vp.width - w - margin - offset, 0, vp.width - w)
  const y = clamp(topGap + offset, 0, vp.height - h)
  return { x, y, w, h }
}

/** Re-fit a window into a (possibly smaller) viewport. */
export function clampToViewport(r: Rect, vp: Size): Rect {
  const w = Math.min(r.w, vp.width)
  const h = Math.min(r.h, vp.height)
  return {
    w,
    h,
    x: clamp(r.x, 0, vp.width - w),
    y: clamp(r.y, 0, vp.height - h),
  }
}
