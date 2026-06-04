import { describe, it, expect } from 'vitest'
import {
  AssistantTurnSchema,
  DeckSchema,
  SlideSchema,
} from '../lib/slideSchema'

describe('SlideSchema', () => {
  it('accepts a valid title slide', () => {
    const r = SlideSchema.safeParse({ type: 'title', title: 'Hello', subtitle: 'World' })
    expect(r.success).toBe(true)
  })

  it('rejects a bullets slide with empty bullets', () => {
    const r = SlideSchema.safeParse({ type: 'bullets', title: 'X', bullets: [] })
    expect(r.success).toBe(false)
  })

  it('rejects a bullets slide with more than 7 bullets', () => {
    const r = SlideSchema.safeParse({
      type: 'bullets',
      title: 'X',
      bullets: Array.from({ length: 8 }, (_, i) => `b${i}`),
    })
    expect(r.success).toBe(false)
  })

  it('accepts a two-col slide', () => {
    const r = SlideSchema.safeParse({
      type: 'two-col',
      title: 'Compare',
      left: { heading: 'A', bullets: ['x'] },
      right: { heading: 'B', bullets: ['y'] },
    })
    expect(r.success).toBe(true)
  })

  it('rejects unknown slide types', () => {
    const r = SlideSchema.safeParse({ type: 'pyramid', title: 'X' })
    expect(r.success).toBe(false)
  })
})

describe('DeckSchema', () => {
  it('rejects decks with zero slides', () => {
    const r = DeckSchema.safeParse({ title: 'T', theme: 'minimal', slides: [] })
    expect(r.success).toBe(false)
  })

  it('rejects decks with more than 10 slides', () => {
    const r = DeckSchema.safeParse({
      title: 'T',
      theme: 'minimal',
      slides: Array.from({ length: 11 }, () => ({ type: 'title', title: 'x' })),
    })
    expect(r.success).toBe(false)
  })

  it('defaults theme to minimal when missing', () => {
    const r = DeckSchema.parse({
      title: 'T',
      slides: [{ type: 'title', title: 'x' }],
    } as never)
    expect(r.theme).toBe('minimal')
  })
})

describe('AssistantTurnSchema', () => {
  it('parses a clarify turn', () => {
    const r = AssistantTurnSchema.parse({
      kind: 'clarify',
      ready: false,
      confidence: 0.3,
      next_question: 'Who is the audience?',
    })
    expect(r.kind).toBe('clarify')
  })

  it('parses a generate turn', () => {
    const r = AssistantTurnSchema.parse({
      kind: 'generate',
      deck: {
        title: 'Demo',
        theme: 'dark',
        slides: [{ type: 'title', title: 'Hi' }],
      },
    })
    expect(r.kind).toBe('generate')
  })

  it('rejects unknown kinds', () => {
    const r = AssistantTurnSchema.safeParse({ kind: 'chitchat' })
    expect(r.success).toBe(false)
  })
})
