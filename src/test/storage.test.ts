import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteSession,
  loadSessions,
  loadSettings,
  newSessionId,
  saveSettings,
  upsertSession,
  type SessionRecord,
} from '../lib/storage'

const sample = (id: string, title: string): SessionRecord => ({
  id,
  title,
  createdAt: 1,
  brainDump: 'b',
  deck: null,
})

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('newSessionId returns unique ids', () => {
    const a = newSessionId()
    const b = newSessionId()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^s_/)
  })

  it('saveSettings + loadSettings round-trips', () => {
    const s = loadSettings()
    saveSettings({ ...s, model: 'custom-model' })
    expect(loadSettings().model).toBe('custom-model')
  })

  it('upsertSession adds a new session at the top', () => {
    upsertSession(sample('1', 'A'))
    upsertSession(sample('2', 'B'))
    const all = loadSessions()
    expect(all.map((s) => s.id)).toEqual(['2', '1'])
  })

  it('upsertSession replaces an existing session in place', () => {
    upsertSession(sample('1', 'A'))
    upsertSession(sample('2', 'B'))
    upsertSession({ ...sample('1', 'A-renamed'), createdAt: 5 })
    const all = loadSessions()
    expect(all.find((s) => s.id === '1')?.title).toBe('A-renamed')
    expect(all.map((s) => s.id)).toEqual(['2', '1'])
  })

  it('deleteSession removes by id', () => {
    upsertSession(sample('1', 'A'))
    upsertSession(sample('2', 'B'))
    deleteSession('1')
    expect(loadSessions().map((s) => s.id)).toEqual(['2'])
  })

  it('loadSettings falls back to defaults on malformed JSON', () => {
    localStorage.setItem('slidekick.settings.v1', '{not json')
    const s = loadSettings()
    expect(s.baseUrl).toBeTruthy()
  })
})
