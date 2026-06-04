/**
 * Mock provider — runs entirely client-side, no API key required.
 * Returns scripted clarify turns then a generated deck that incorporates
 * the user's actual brain-dump so they get a feel for the real flow.
 */
import type { AssistantTurn, Deck } from './slideSchema'
import type { ChatMessage } from './llm'

const CLARIFY_QUESTIONS = [
  {
    next_question: 'Who is the audience for this — engineers, leadership, mixed?',
    rationale: 'Audience changes the depth and language.',
    missing: ['audience'],
  },
  {
    next_question: 'What is the one sentence you want them to remember when they leave?',
    rationale: 'A single takeaway anchors the closing slide.',
    missing: ['key takeaway'],
  },
  {
    next_question: 'How long do you have, and is there anything you want to skip?',
    rationale: 'Time budget decides slide count and depth.',
    missing: ['time'],
  },
]

function firstNonEmptyLine(s: string): string {
  const line = s.split('\n').find((l) => l.trim().length > 0)
  return line?.trim() ?? ''
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function deriveTitle(brainDump: string): string {
  const first = firstNonEmptyLine(brainDump).replace(/[.!?]+$/, '')
  if (first.length === 0) return 'Quick Demo'
  const trimmed = first.length > 60 ? first.slice(0, 57) + '...' : first
  return titleCase(trimmed)
}

function splitIntoSnippets(brainDump: string, max: number): string[] {
  const lines = brainDump
    .split(/[\n.;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 100)
  return lines.slice(0, max)
}

function isGenerateRequest(messages: ChatMessage[]): boolean {
  const last = messages.at(-1)
  if (!last || last.role !== 'user') return false
  return /generate.*deck|"generate"|GENERATE mode/i.test(last.content)
}

function countClarifyAnswers(messages: ChatMessage[]): number {
  // user messages after the very first (brain-dump), excluding the generate trigger
  const userMsgs = messages.filter((m) => m.role === 'user')
  const nonTrigger = userMsgs.filter((m) => !/generate.*deck|"generate"/i.test(m.content))
  return Math.max(0, nonTrigger.length - 1)
}

function getBrainDump(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  return firstUser?.content ?? ''
}

export function generateMockTurn(messages: ChatMessage[]): AssistantTurn {
  const brainDump = getBrainDump(messages)

  if (isGenerateRequest(messages)) {
    return { kind: 'generate', deck: buildMockDeck(brainDump) }
  }

  const answers = countClarifyAnswers(messages)

  if (answers >= CLARIFY_QUESTIONS.length) {
    return {
      kind: 'clarify',
      ready: true,
      confidence: 0.9,
      rationale: 'I have audience, takeaway, and time budget — enough to draft a tight deck.',
    }
  }

  const q = CLARIFY_QUESTIONS[answers]
  return {
    kind: 'clarify',
    ready: false,
    confidence: 0.3 + answers * 0.2,
    next_question: q.next_question,
    rationale: q.rationale,
    missing: q.missing,
  }
}

function buildMockDeck(brainDump: string): Deck {
  const title = deriveTitle(brainDump)
  const snippets = splitIntoSnippets(brainDump, 6)
  const bodyBullets = snippets.length > 0 ? snippets : [
    'Context from your brain-dump',
    'Main idea or change',
    'Why it matters',
  ]

  return {
    title,
    theme: 'minimal',
    slides: [
      {
        type: 'title',
        title,
        subtitle: 'A quick walkthrough',
        notes: 'Opening — set the room and name the goal in one sentence.',
      },
      {
        type: 'bullets',
        title: 'Context',
        bullets: bodyBullets.slice(0, 4),
        notes: 'Ground the audience in why this matters. ~30s.',
      },
      {
        type: 'two-col',
        title: 'Before / After',
        left: { heading: 'Before', bullets: ['Manual', 'Slow', 'Brittle'] },
        right: { heading: 'After', bullets: ['Automated', 'Fast', 'Resilient'] },
        notes: 'These bullets are placeholders — the real model would draw from your dump.',
      },
      {
        type: 'bullets',
        title: 'What we did',
        bullets: bodyBullets.slice(0, 5),
        notes: 'Walk through the approach without drowning the room in detail.',
      },
      {
        type: 'quote',
        title: 'In one line',
        quote: snippets[0] ?? 'The shortest version of the story.',
        attribution: 'You, basically',
        notes: 'Use this slide if you want a beat for the room to absorb.',
      },
      {
        type: 'bullets',
        title: 'Takeaway',
        bullets: [
          'One sentence the audience should remember',
          'One follow-up action',
          'One ask, if you have one',
        ],
        notes: 'Land the plane. Make the ask if there is one.',
      },
    ],
  }
}

export function mockLatencyMs(): number {
  // 400–900ms — feels like a real API call, not instant.
  return 400 + Math.floor(Math.random() * 500)
}
