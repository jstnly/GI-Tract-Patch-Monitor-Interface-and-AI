import { beforeEach, describe, expect, it } from 'vitest'
import { SimulatedDataSource } from './SimulatedDataSource'

beforeEach(() => {
  localStorage.clear()
})

describe('SimulatedDataSource', () => {
  it('starts with a seeded fleet, each with an empty notes list', () => {
    const ds = new SimulatedDataSource()
    const list = ds.list()
    expect(list.length).toBe(6)
    expect(list[0].id).toBe('seed-1') // stable id for note persistence
    expect(list.every((m) => Array.isArray(m.notes) && m.notes.length === 0)).toBe(true)
  })

  it('adds and removes monitors', () => {
    const ds = new SimulatedDataSource()
    const created = ds.addMonitor({ label: 'Baby Z', startingProfile: 'alert' })
    expect(ds.list().length).toBe(7)
    expect(created.label).toBe('Baby Z')
    expect(created.status).toBe('Alert')
    ds.removeMonitor(created.id)
    expect(ds.list().length).toBe(6)
    expect(ds.list().some((m) => m.id === created.id)).toBe(false)
  })

  it('renames label, bed, and DICU id', () => {
    const ds = new SimulatedDataSource()
    const id = ds.list()[0].id
    ds.renameMonitor(id, 'Noah', 'Bay 3', 'DICU-207')
    const m = ds.list().find((x) => x.id === id)!
    expect(m.label).toBe('Noah')
    expect(m.bed).toBe('Bay 3')
    expect(m.context.babyId).toBe('DICU-207')
  })

  it('appends signed notes and links addenda to their parent', () => {
    const ds = new SimulatedDataSource()
    const id = ds.list()[0].id
    ds.addNote(id, { text: 'Initial note', nurseName: 'A. Chen', nurseId: 'RN-1' })
    let m = ds.list().find((x) => x.id === id)!
    expect(m.notes.length).toBe(1)
    expect(m.notes[0]).toMatchObject({ text: 'Initial note', nurseName: 'A. Chen', nurseId: 'RN-1' })
    expect(m.notes[0].addendumTo).toBeUndefined()

    const parentId = m.notes[0].id
    ds.addNote(id, { text: 'Addendum', nurseName: 'M. Patel', nurseId: 'RN-2', addendumTo: parentId })
    m = ds.list().find((x) => x.id === id)!
    expect(m.notes.length).toBe(2)
    expect(m.notes[1].addendumTo).toBe(parentId)
    expect(m.notes[1].nurseName).toBe('M. Patel')
  })

  it('persists notes across a fresh data source (same seeded id)', () => {
    const ds = new SimulatedDataSource()
    expect(ds.list()[0].id).toBe('seed-1')
    ds.addNote('seed-1', { text: 'Persist me', nurseName: 'A', nurseId: '1' })

    const ds2 = new SimulatedDataSource()
    const restored = ds2.list().find((m) => m.id === 'seed-1')!
    expect(restored.notes.length).toBe(1)
    expect(restored.notes[0].text).toBe('Persist me')
  })

  it('force-state moves a monitor into and back out of Alert (demo control)', () => {
    const ds = new SimulatedDataSource()
    const id = ds.list()[0].id
    ds.forceState(id, 'Alert')
    expect(ds.list().find((m) => m.id === id)!.status).toBe('Alert')
    ds.forceState(id, 'Normal')
    expect(ds.list().find((m) => m.id === id)!.status).toBe('Normal')
  })

  it('exposes demo controls but no-ops safely on unknown ids', () => {
    const ds = new SimulatedDataSource()
    expect(ds.demo).toBeDefined()
    expect(() => ds.renameMonitor('does-not-exist', 'x', 'y', 'z')).not.toThrow()
    expect(() => ds.addNote('does-not-exist', { text: 't', nurseName: 'n', nurseId: 'i' })).not.toThrow()
    expect(ds.list().length).toBe(6)
  })
})
