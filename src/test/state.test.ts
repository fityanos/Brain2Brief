import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../lib/state'

describe('reducer', () => {
  const s0 = initialState('s1', 'minimal')

  it('starts in idle phase with no messages', () => {
    expect(s0.phase).toBe('idle')
    expect(s0.messages).toHaveLength(0)
    expect(s0.questionsAsked).toBe(0)
  })

  it('submitBrainDump moves to clarifying and seeds messages', () => {
    const s1 = reducer(s0, { type: 'submitBrainDump', brainDump: 'topic X', systemPrompt: 'SYS' })
    expect(s1.phase).toBe('clarifying')
    expect(s1.brainDump).toBe('topic X')
    expect(s1.messages).toHaveLength(1)
    expect(s1.llmMessages[0].role).toBe('system')
    expect(s1.llmMessages[1].content).toBe('topic X')
  })

  it('gotClarifyQuestion appends a question and increments counter', () => {
    const s1 = reducer(s0, { type: 'submitBrainDump', brainDump: 't', systemPrompt: 's' })
    const s2 = reducer(s1, {
      type: 'gotClarifyQuestion',
      question: 'audience?',
      confidence: 0.3,
      missing: ['audience'],
      raw: '{}',
    })
    expect(s2.questionsAsked).toBe(1)
    expect(s2.messages.at(-1)?.text).toBe('audience?')
    expect(s2.messages.at(-1)?.meta?.missing).toEqual(['audience'])
  })

  it('gotReady moves to ready phase', () => {
    const s1 = reducer(s0, { type: 'submitBrainDump', brainDump: 't', systemPrompt: 's' })
    const s2 = reducer(s1, { type: 'gotReady', confidence: 0.9, raw: '{}' })
    expect(s2.phase).toBe('ready')
  })

  it('gotDeck stores deck and moves to done', () => {
    const s1 = reducer(s0, { type: 'submitBrainDump', brainDump: 't', systemPrompt: 's' })
    const s2 = reducer(s1, {
      type: 'gotDeck',
      raw: '{}',
      deck: { title: 'Demo', theme: 'minimal', slides: [{ type: 'title', title: 'Hi' }] },
    })
    expect(s2.phase).toBe('done')
    expect(s2.deck?.title).toBe('Demo')
  })

  it('setTheme updates state.theme and any existing deck', () => {
    const s1 = reducer(s0, {
      type: 'gotDeck',
      raw: '{}',
      deck: { title: 'D', theme: 'minimal', slides: [{ type: 'title', title: 'a' }] },
    })
    const s2 = reducer(s1, { type: 'setTheme', theme: 'dark' })
    expect(s2.theme).toBe('dark')
    expect(s2.deck?.theme).toBe('dark')
  })

  it('error sets phase=error and error message', () => {
    const s2 = reducer(s0, { type: 'error', error: 'boom' })
    expect(s2.phase).toBe('error')
    expect(s2.error).toBe('boom')
  })

  it('reset returns to a clean state with new id', () => {
    const s1 = reducer(s0, { type: 'submitBrainDump', brainDump: 't', systemPrompt: 's' })
    const s2 = reducer(s1, { type: 'reset', sessionId: 's2', theme: 'dark' })
    expect(s2.sessionId).toBe('s2')
    expect(s2.theme).toBe('dark')
    expect(s2.messages).toHaveLength(0)
    expect(s2.phase).toBe('idle')
  })
})
