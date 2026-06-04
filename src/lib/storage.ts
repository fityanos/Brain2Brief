import type { Deck, Theme } from './slideSchema'
import type { Provider } from './llm'

const SETTINGS_KEY = 'slidekick.settings.v1'
const SESSIONS_KEY = 'slidekick.sessions.v1'

export interface Settings {
  provider: Provider
  baseUrl: string
  apiKey: string
  model: string
  defaultTheme: Theme
  maxSlides: number
}

export const PROVIDER_DEFAULTS: Record<Provider, { baseUrl: string; model: string }> = {
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-6',
  },
  mock: {
    baseUrl: '(local, no network)',
    model: 'mock-v1',
  },
}

const envProvider = (import.meta.env.VITE_LLM_PROVIDER as Provider) ?? 'openai-compatible'
const providerDefaults = PROVIDER_DEFAULTS[envProvider] ?? PROVIDER_DEFAULTS['openai-compatible']

export const DEFAULT_SETTINGS: Settings = {
  provider: envProvider,
  baseUrl: import.meta.env.VITE_LLM_BASE_URL ?? providerDefaults.baseUrl,
  apiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
  model: import.meta.env.VITE_LLM_MODEL ?? providerDefaults.model,
  defaultTheme: (import.meta.env.VITE_DEFAULT_THEME as Theme) ?? 'minimal',
  maxSlides: Number(import.meta.env.VITE_MAX_SLIDES ?? 8),
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export interface SessionRecord {
  id: string
  title: string
  createdAt: number
  brainDump: string
  deck: Deck | null
}

export function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: SessionRecord[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function upsertSession(session: SessionRecord): SessionRecord[] {
  const all = loadSessions()
  const idx = all.findIndex((s) => s.id === session.id)
  const next = idx >= 0 ? [...all.slice(0, idx), session, ...all.slice(idx + 1)] : [session, ...all]
  saveSessions(next)
  return next
}

export function deleteSession(id: string): SessionRecord[] {
  const next = loadSessions().filter((s) => s.id !== id)
  saveSessions(next)
  return next
}

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
