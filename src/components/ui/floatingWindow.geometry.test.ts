import { describe, expect, it } from 'vitest'
import {
  applyDrag,
  applyResize,
  clampToViewport,
  defaultRect,
  MIN_H,
  MIN_W,
  type Rect,
} from './floatingWindow.geometry'

const VP = { width: 1000, height: 800 }
const base: Rect = { x: 200, y: 150, w: 400, h: 360 }

describe('applyDrag', () => {
  it('moves the window by the delta', () => {
    expect(applyDrag(base, 50, -30, VP)).toMatchObject({ x: 250, y: 120 })
  })

  it('clamps to the top-left edge', () => {
    expect(applyDrag(base, -1000, -1000, VP)).toMatchObject({ x: 0, y: 0 })
  })

  it('clamps to the bottom-right edge (stays fully on-screen)', () => {
    const r = applyDrag(base, 5000, 5000, VP)
    expect(r.x).toBe(VP.width - base.w) // 600
    expect(r.y).toBe(VP.height - base.h) // 440
  })
})

describe('applyResize — each corner', () => {
  it('SE grows width/height, keeps origin', () => {
    expect(applyResize(base, { right: true, bottom: true }, 60, 40, VP)).toEqual({
      x: 200,
      y: 150,
      w: 460,
      h: 400,
    })
  })

  it('NW keeps the bottom-right edge fixed', () => {
    const r = applyResize(base, { left: true, top: true }, 50, 30, VP)
    expect(r).toEqual({ x: 250, y: 180, w: 350, h: 330 })
    expect(r.x + r.w).toBe(base.x + base.w) // right edge unchanged
    expect(r.y + r.h).toBe(base.y + base.h) // bottom edge unchanged
  })

  it('NE moves the top edge and grows to the right', () => {
    const r = applyResize(base, { right: true, top: true }, 40, 30, VP)
    expect(r).toEqual({ x: 200, y: 180, w: 440, h: 330 })
  })

  it('SW moves the left edge and grows downward', () => {
    const r = applyResize(base, { left: true, bottom: true }, 50, 40, VP)
    expect(r).toEqual({ x: 250, y: 150, w: 350, h: 400 })
  })
})

describe('applyResize — single edges', () => {
  it('right edge changes only width', () => {
    const r = applyResize(base, { right: true }, 40, 0, VP)
    expect(r).toEqual({ x: 200, y: 150, w: 440, h: 360 })
  })

  it('bottom edge changes only height', () => {
    const r = applyResize(base, { bottom: true }, 0, 30, VP)
    expect(r).toEqual({ x: 200, y: 150, w: 400, h: 390 })
  })

  it('top edge changes height + y, keeps the bottom edge fixed', () => {
    const r = applyResize(base, { top: true }, 0, 25, VP)
    expect(r).toEqual({ x: 200, y: 175, w: 400, h: 335 })
    expect(r.y + r.h).toBe(base.y + base.h)
  })

  it('left edge changes width + x, keeps the right edge fixed', () => {
    const r = applyResize(base, { left: true }, 25, 0, VP)
    expect(r).toEqual({ x: 225, y: 150, w: 375, h: 360 })
    expect(r.x + r.w).toBe(base.x + base.w)
  })
})

describe('applyResize — constraints', () => {
  it('never shrinks below the minimum size', () => {
    const r = applyResize(base, { right: true, bottom: true }, -9999, -9999, VP)
    expect(r.w).toBe(MIN_W)
    expect(r.h).toBe(MIN_H)
  })

  it('left-resize stops at the screen edge instead of going off-screen', () => {
    // dragging the left handle far left would push x below 0 — it must clamp to 0
    const r = applyResize({ x: 100, y: 100, w: 400, h: 300 }, { left: true }, -500, 0, VP)
    expect(r.x).toBe(0)
    expect(r.x + r.w).toBe(500) // right edge preserved
  })

  it('right-resize cannot exceed the viewport width', () => {
    // x leaves more than MIN_W of room, so the right edge clamps to the viewport
    const r = applyResize({ x: 600, y: 100, w: 250, h: 300 }, { right: true }, 1000, 0, VP)
    expect(r.x + r.w).toBe(VP.width)
  })

  it('NW shrinking below min keeps the bottom-right corner anchored', () => {
    const r = applyResize(base, { left: true, top: true }, 9999, 9999, VP)
    expect(r.w).toBe(MIN_W)
    expect(r.h).toBe(MIN_H)
    expect(r.x + r.w).toBe(base.x + base.w)
    expect(r.y + r.h).toBe(base.y + base.h)
  })
})

describe('defaultRect', () => {
  it('docks to the top-right and stays on-screen', () => {
    const r = defaultRect(VP, 0)
    expect(r.x + r.w).toBeLessThanOrEqual(VP.width)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.x).toBeGreaterThanOrEqual(0)
  })

  it('cascades subsequent windows so they do not perfectly overlap', () => {
    const a = defaultRect(VP, 0)
    const b = defaultRect(VP, 1)
    expect(a).not.toEqual(b)
  })

  it('respects the minimum size even on a tiny viewport', () => {
    const r = defaultRect({ width: 300, height: 250 }, 0)
    expect(r.w).toBe(MIN_W)
    expect(r.h).toBe(MIN_H)
  })
})

describe('clampToViewport', () => {
  it('pulls an off-screen window back on-screen after the viewport shrinks', () => {
    const r = clampToViewport({ x: 900, y: 700, w: 400, h: 360 }, { width: 600, height: 500 })
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.x + r.w).toBeLessThanOrEqual(600)
    expect(r.y + r.h).toBeLessThanOrEqual(500)
  })
})
