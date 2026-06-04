import { describe, expect, it } from 'vitest'
import { generateMockTurn } from '../lib/mockProvider'
import type { ChatMessage } from '../lib/llm'

const sys: ChatMessage = { role: 'system', content: 'SYS' }

describe('mockProvider', () => {
  it('asks the first clarifying question after a brain-dump', () => {
    const turn = generateMockTurn([sys, { role: 'user', content: 'demoing latency wins' }])
    expect(turn.kind).toBe('clarify')
    if (turn.kind === 'clarify') {
      expect(turn.ready).toBe(false)
      expect(turn.next_question).toMatch(/audience/i)
    }
  })

  it('progresses through clarifying questions as the user answers', () => {
    const t2 = generateMockTurn([
      sys,
      { role: 'user', content: 'demoing latency wins' },
      { role: 'assistant', content: '{"kind":"clarify",...}' },
      { role: 'user', content: 'eng leadership' },
    ])
    if (t2.kind === 'clarify') {
      expect(t2.next_question).toMatch(/sentence|remember/i)
    } else {
      expect.fail('expected clarify')
    }
  })

  it('signals ready after enough answers', () => {
    const turn = generateMockTurn([
      sys,
      { role: 'user', content: 'topic' },
      { role: 'assistant', content: '{}' },
      { role: 'user', content: 'answer 1' },
      { role: 'assistant', content: '{}' },
      { role: 'user', content: 'answer 2' },
      { role: 'assistant', content: '{}' },
      { role: 'user', content: 'answer 3' },
    ])
    expect(turn.kind).toBe('clarify')
    if (turn.kind === 'clarify') expect(turn.ready).toBe(true)
  })

  it('generates a deck when the user message is a generate trigger', () => {
    const turn = generateMockTurn([
      sys,
      { role: 'user', content: 'We cut p95 latency from 180ms to 65ms by batching requests.' },
      { role: 'user', content: 'Generate the deck now in GENERATE mode. Cap at 8 slides.' },
    ])
    expect(turn.kind).toBe('generate')
    if (turn.kind === 'generate') {
      expect(turn.deck.slides.length).toBeGreaterThan(0)
      expect(turn.deck.slides.length).toBeLessThanOrEqual(10)
      expect(turn.deck.slides[0].type).toBe('title')
    }
  })

  it('derives the deck title from the brain-dump first line', () => {
    const turn = generateMockTurn([
      sys,
      { role: 'user', content: 'inference latency wins\nbatching\ncaching' },
      { role: 'user', content: 'Generate the deck now in GENERATE mode. Cap at 8 slides.' },
    ])
    if (turn.kind === 'generate') {
      expect(turn.deck.title.toLowerCase()).toContain('inference')
    } else {
      expect.fail('expected generate')
    }
  })
})
