import type { Deck, Theme } from './slideSchema'
import type { ChatMessage } from './llm'

export type Phase =
  | 'idle'
  | 'clarifying'
  | 'ready'
  | 'generating'
  | 'done'
  | 'error'

export interface UiMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  meta?: {
    ready?: boolean
    confidence?: number
    missing?: string[]
  }
}

export interface ChatState {
  sessionId: string
  phase: Phase
  brainDump: string
  messages: UiMessage[]
  llmMessages: ChatMessage[]
  questionsAsked: number
  deck: Deck | null
  theme: Theme
  error: string | null
}

export type Action =
  | { type: 'reset'; sessionId: string; theme: Theme }
  | { type: 'load'; state: ChatState }
  | { type: 'submitBrainDump'; brainDump: string; systemPrompt: string }
  | { type: 'addUserMessage'; text: string }
  | { type: 'pushLlmMessage'; message: ChatMessage }
  | { type: 'gotClarifyQuestion'; question: string; rationale?: string; missing?: string[]; confidence: number; raw: string }
  | { type: 'gotReady'; confidence: number; rationale?: string; raw: string }
  | { type: 'startGenerating' }
  | { type: 'gotDeck'; deck: Deck; raw: string }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'updateDeck'; deck: Deck }
  | { type: 'error'; error: string }

let msgCounter = 0
const mid = () => `m_${Date.now().toString(36)}_${(msgCounter++).toString(36)}`

export function initialState(sessionId: string, theme: Theme): ChatState {
  return {
    sessionId,
    phase: 'idle',
    brainDump: '',
    messages: [],
    llmMessages: [],
    questionsAsked: 0,
    deck: null,
    theme,
    error: null,
  }
}

export function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'reset':
      return initialState(action.sessionId, action.theme)
    case 'load':
      return action.state
    case 'submitBrainDump':
      return {
        ...state,
        phase: 'clarifying',
        brainDump: action.brainDump,
        messages: [
          ...state.messages,
          { id: mid(), role: 'user', text: action.brainDump },
        ],
        llmMessages: [
          { role: 'system', content: action.systemPrompt },
          { role: 'user', content: action.brainDump },
        ],
        error: null,
      }
    case 'addUserMessage':
      return {
        ...state,
        messages: [...state.messages, { id: mid(), role: 'user', text: action.text }],
        llmMessages: [...state.llmMessages, { role: 'user', content: action.text }],
      }
    case 'pushLlmMessage':
      return { ...state, llmMessages: [...state.llmMessages, action.message] }
    case 'gotClarifyQuestion':
      return {
        ...state,
        phase: 'clarifying',
        questionsAsked: state.questionsAsked + 1,
        messages: [
          ...state.messages,
          {
            id: mid(),
            role: 'assistant',
            text: action.question,
            meta: { ready: false, confidence: action.confidence, missing: action.missing },
          },
        ],
        llmMessages: [...state.llmMessages, { role: 'assistant', content: action.raw }],
      }
    case 'gotReady':
      return {
        ...state,
        phase: 'ready',
        messages: [
          ...state.messages,
          {
            id: mid(),
            role: 'assistant',
            text: action.rationale
              ? `I have enough to draft the deck. ${action.rationale}`
              : 'I have enough to draft the deck.',
            meta: { ready: true, confidence: action.confidence },
          },
        ],
        llmMessages: [...state.llmMessages, { role: 'assistant', content: action.raw }],
      }
    case 'startGenerating':
      return { ...state, phase: 'generating', error: null }
    case 'gotDeck':
      return {
        ...state,
        phase: 'done',
        deck: action.deck,
        messages: [
          ...state.messages,
          {
            id: mid(),
            role: 'system',
            text: `Generated deck: "${action.deck.title}" (${action.deck.slides.length} slides).`,
          },
        ],
        llmMessages: [...state.llmMessages, { role: 'assistant', content: action.raw }],
      }
    case 'setTheme':
      return {
        ...state,
        theme: action.theme,
        deck: state.deck ? { ...state.deck, theme: action.theme } : null,
      }
    case 'updateDeck':
      return { ...state, deck: action.deck, error: null }
    case 'error':
      return { ...state, phase: 'error', error: action.error }
  }
}
