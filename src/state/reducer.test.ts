import { describe, expect, it } from 'vitest'
import type { Monitor } from '../types/monitor'
import { initialState, reducer, type MonitorState } from './reducer'

const mon = (id: string) => ({ id }) as unknown as Monitor
const withOpen = (ids: string[], monitors = ids.map(mon)): MonitorState => ({
  ...initialState,
  monitors,
  openIds: ids,
})

describe('window open/close/focus', () => {
  it('OPEN adds a window', () => {
    const s = reducer(initialState, { type: 'OPEN', id: 'a' })
    expect(s.openIds).toEqual(['a'])
  })

  it('OPEN never duplicates and brings an existing window to the front', () => {
    let s = withOpen(['a', 'b', 'c'])
    s = reducer(s, { type: 'OPEN', id: 'a' })
    expect(s.openIds).toEqual(['b', 'c', 'a']) // moved to top, no dupe
  })

  it('opens multiple distinct windows at once (twins use-case)', () => {
    let s = reducer(initialState, { type: 'OPEN', id: 'twin-1' })
    s = reducer(s, { type: 'OPEN', id: 'twin-2' })
    expect(s.openIds).toEqual(['twin-1', 'twin-2'])
  })

  it('CLOSE removes only that window', () => {
    const s = reducer(withOpen(['a', 'b', 'c']), { type: 'CLOSE', id: 'b' })
    expect(s.openIds).toEqual(['a', 'c'])
  })

  it('FOCUS moves an open window to the top', () => {
    const s = reducer(withOpen(['a', 'b', 'c']), { type: 'FOCUS', id: 'a' })
    expect(s.openIds).toEqual(['b', 'c', 'a'])
  })

  it('FOCUS on the already-top window is an identity no-op (avoids re-render)', () => {
    const s = withOpen(['a', 'b', 'c'])
    expect(reducer(s, { type: 'FOCUS', id: 'c' })).toBe(s)
  })

  it('FOCUS on a window that is not open does nothing', () => {
    const s = withOpen(['a', 'b'])
    expect(reducer(s, { type: 'FOCUS', id: 'zzz' })).toBe(s)
  })
})

describe('SET_MONITORS keeps open windows consistent', () => {
  it('closes windows whose monitor was removed', () => {
    const s = withOpen(['a', 'b', 'c'])
    const next = reducer(s, { type: 'SET_MONITORS', monitors: [mon('a'), mon('c')] })
    expect(next.openIds).toEqual(['a', 'c'])
  })

  it('preserves the openIds reference when nothing was removed (no needless work)', () => {
    const s = withOpen(['a', 'b'])
    const next = reducer(s, { type: 'SET_MONITORS', monitors: [mon('a'), mon('b'), mon('x')] })
    expect(next.openIds).toBe(s.openIds)
  })
})

describe('other ui flags', () => {
  it('toggles add modal, paused, density', () => {
    let s = reducer(initialState, { type: 'SET_ADD_OPEN', open: true })
    expect(s.addModalOpen).toBe(true)
    s = reducer(s, { type: 'SET_PAUSED', paused: true })
    expect(s.paused).toBe(true)
    s = reducer(s, { type: 'SET_DENSITY', density: 'compact' })
    expect(s.density).toBe('compact')
  })
})
