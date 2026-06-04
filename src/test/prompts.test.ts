import { describe, it, expect } from 'vitest'
import {
  buildGenerateTrigger,
  buildInitialUserMessage,
  buildRetryMessage,
  buildSystemPrompt,
  MAX_CLARIFY_QUESTIONS,
} from '../lib/prompts'

describe('buildSystemPrompt', () => {
  it('injects the theme, max slides, and questions-asked counter', () => {
    const p = buildSystemPrompt({ theme: 'dark', maxSlides: 6, questionsAskedSoFar: 2 })
    expect(p).toContain('"theme": "dark"')
    expect(p).toContain('1 to 6 slides')
    expect(p).toContain('Never exceed 6 total')
    expect(p).toContain('asked 2 clarifying question(s)')
    expect(p).toContain(`Maximum is ${MAX_CLARIFY_QUESTIONS}`)
  })

  it('mentions both clarify and generate modes', () => {
    const p = buildSystemPrompt({ theme: 'minimal', maxSlides: 8, questionsAskedSoFar: 0 })
    expect(p).toContain('CLARIFY')
    expect(p).toContain('GENERATE')
  })

  it('forbids fabricated metrics', () => {
    const p = buildSystemPrompt({ theme: 'minimal', maxSlides: 8, questionsAskedSoFar: 0 })
    expect(p.toLowerCase()).toContain('never fabricate')
  })
})

describe('buildInitialUserMessage', () => {
  it('wraps the brain-dump and instructs clarify mode', () => {
    const m = buildInitialUserMessage('  hello world  ')
    expect(m).toContain('hello world')
    expect(m).not.toContain('  hello world  ')
    expect(m).toContain('CLARIFY')
  })
})

describe('buildGenerateTrigger', () => {
  it('caps slide count and requests generate mode', () => {
    const m = buildGenerateTrigger(5)
    expect(m).toContain('Cap at 5')
    expect(m).toContain('"generate"')
  })
})

describe('buildRetryMessage', () => {
  it('includes the parse error', () => {
    const m = buildRetryMessage('unexpected token at position 3')
    expect(m).toContain('unexpected token at position 3')
    expect(m).toContain('valid JSON')
  })
})
