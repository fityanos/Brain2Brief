import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Chat } from './components/Chat'
import { Composer } from './components/Composer'
import { DeckViewer } from './components/DeckViewer'
import { PresentationView } from './components/PresentationView'
import { SettingsModal } from './components/SettingsModal'
import { SlideEditor } from './components/SlideEditor'
import { SlideStrip } from './components/SlideStrip'
import { ThemePicker } from './components/ThemePicker'
import { CloseIcon, DownloadIcon, PlayIcon, PrinterIcon } from './components/Icons'
import { printDeck } from './components/printDeck'
import { initialState, reducer, type ChatState } from './lib/state'
import {
  deleteSession,
  loadSessions,
  loadSettings,
  newSessionId,
  upsertSession,
  type Settings,
  type SessionRecord,
} from './lib/storage'
import { callLlm, LlmError } from './lib/llm'
import { buildGenerateTrigger, buildSystemPrompt } from './lib/prompts'
import { DeckSchema, type Deck, type Slide, type Theme } from './lib/slideSchema'

const STATE_KEY_PREFIX = 'slidekick.state.'
const MAX_SLIDES = 10
const SESSION_QUERY_PARAM = 'id'

function getSessionIdFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(SESSION_QUERY_PARAM)
  } catch {
    return null
  }
}

function setSessionIdInUrl(id: string | null): void {
  try {
    const url = new URL(window.location.href)
    if (id) {
      url.searchParams.set(SESSION_QUERY_PARAM, id)
    } else {
      url.searchParams.delete(SESSION_QUERY_PARAM)
    }
    window.history.pushState({}, '', url)
  } catch {
    // ignore
  }
}

function loadChatState(sessionId: string): ChatState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY_PREFIX + sessionId)
    if (!raw) return null
    return JSON.parse(raw) as ChatState
  } catch {
    return null
  }
}

function saveChatState(state: ChatState): void {
  try {
    localStorage.setItem(STATE_KEY_PREFIX + state.sessionId, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

function deriveTitle(brainDump: string, deck: ChatState['deck']): string {
  if (deck?.title) return deck.title
  const firstLine = brainDump.split('\n').find((l) => l.trim().length > 0) ?? ''
  return firstLine.slice(0, 60) || 'Untitled'
}

interface EditorState {
  open: boolean
  index: number | null // null = adding new
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessions())
  const [activeId, setActiveId] = useState<string>(() => {
    const urlId = getSessionIdFromUrl()
    if (urlId && sessions.some((s) => s.id === urlId)) return urlId
    return newSessionId()
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showDeck, setShowDeck] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [editor, setEditor] = useState<EditorState>({ open: false, index: null })

  const [state, dispatch] = useReducer(
    reducer,
    null,
    (): ChatState =>
      loadChatState(activeId) ?? initialState(activeId, settings.defaultTheme),
  )

  useEffect(() => {
    saveChatState(state)
    if (state.brainDump || state.deck) {
      const existing = sessions.find((s) => s.id === state.sessionId)
      const record: SessionRecord = {
        id: state.sessionId,
        title: deriveTitle(state.brainDump, state.deck),
        createdAt: existing?.createdAt ?? Date.now(),
        brainDump: state.brainDump,
        deck: state.deck,
      }
      setSessions(upsertSession(record))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    if (state.deck && !showDeck) setShowDeck(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.deck])

  const switchSession = useCallback(
    (id: string) => {
      const loaded = loadChatState(id) ?? initialState(id, settings.defaultTheme)
      setActiveId(id)
      setShowDeck(Boolean(loaded.deck))
      dispatch({ type: 'load', state: loaded })
      setSessionIdInUrl(id)
    },
    [settings.defaultTheme],
  )

  const handleNewDeck = useCallback(() => {
    const id = newSessionId()
    setActiveId(id)
    setShowDeck(false)
    dispatch({ type: 'reset', sessionId: id, theme: settings.defaultTheme })
    setSessionIdInUrl(null)
  }, [settings.defaultTheme])

  const handleDelete = useCallback(
    (id: string) => {
      const next = deleteSession(id)
      setSessions(next)
      localStorage.removeItem(STATE_KEY_PREFIX + id)
      if (id === activeId) {
        if (next.length > 0) {
          switchSession(next[0].id)
        } else {
          handleNewDeck()
        }
      }
    },
    [activeId, switchSession, handleNewDeck],
  )

  const askLlm = useCallback(
    async (
      action:
        | { type: 'initial'; brainDump: string }
        | { type: 'reply'; text: string }
        | { type: 'generate' },
    ) => {
      if (settings.provider !== 'mock' && (!settings.apiKey || !settings.baseUrl || !settings.model)) {
        dispatch({ type: 'error', error: 'Please configure your API settings first (click Settings).' })
        setSettingsOpen(true)
        return
      }

      const systemPrompt = buildSystemPrompt({
        theme: state.theme,
        maxSlides: settings.maxSlides,
        questionsAskedSoFar: state.questionsAsked,
      })

      let nextLlmMessages = state.llmMessages
      if (action.type === 'initial') {
        dispatch({ type: 'submitBrainDump', brainDump: action.brainDump, systemPrompt })
        nextLlmMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: action.brainDump },
        ]
      } else if (action.type === 'reply') {
        dispatch({ type: 'addUserMessage', text: action.text })
        nextLlmMessages = [...state.llmMessages, { role: 'user', content: action.text }]
      } else {
        const trigger = buildGenerateTrigger(settings.maxSlides)
        dispatch({ type: 'addUserMessage', text: trigger })
        dispatch({ type: 'startGenerating' })
        nextLlmMessages = [...state.llmMessages, { role: 'user', content: trigger }]
      }

      try {
        const turn = await callLlm(
          {
            provider: settings.provider,
            baseUrl: settings.baseUrl,
            apiKey: settings.apiKey,
            model: settings.model,
          },
          nextLlmMessages,
        )
        const raw = JSON.stringify(turn)

        if (turn.kind === 'clarify') {
          if (turn.ready) {
            dispatch({ type: 'gotReady', confidence: turn.confidence, rationale: turn.rationale, raw })
          } else if (turn.next_question) {
            dispatch({
              type: 'gotClarifyQuestion',
              question: turn.next_question,
              rationale: turn.rationale,
              missing: turn.missing,
              confidence: turn.confidence,
              raw,
            })
          } else {
            dispatch({ type: 'error', error: 'Model did not provide a question or ready signal.' })
          }
        } else if (turn.kind === 'generate') {
          const deck = DeckSchema.parse({ ...turn.deck, theme: state.theme })
          dispatch({ type: 'gotDeck', deck, raw })
        }
      } catch (err) {
        const msg =
          err instanceof LlmError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err)
        dispatch({ type: 'error', error: msg })
      }
    },
    [settings, state],
  )

  const onComposerSubmit = useCallback(
    (text: string) => {
      if (state.phase === 'idle') {
        askLlm({ type: 'initial', brainDump: text })
      } else {
        askLlm({ type: 'reply', text })
      }
    },
    [askLlm, state.phase],
  )

  const onGenerateNow = useCallback(() => {
    askLlm({ type: 'generate' })
  }, [askLlm])

  const isBusy = state.phase === 'generating'

  const printPdf = useCallback(() => {
    if (state.deck) printDeck(state.deck, state.theme)
  }, [state.deck, state.theme])

  const startPresenting = useCallback(() => {
    if (state.deck) setPresenting(true)
  }, [state.deck])

  const exportJson = useCallback(() => {
    if (!state.deck) return
    const blob = new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${state.deck.title.replace(/[^a-z0-9-_]+/gi, '_')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [state.deck])

  // --- Local slide editing (no LLM call, no generating indicator) ---
  const replaceDeck = useCallback(
    (mut: (deck: Deck) => Deck) => {
      if (!state.deck) return
      const next = mut(state.deck)
      const parsed = DeckSchema.safeParse(next)
      if (parsed.success) {
        dispatch({ type: 'updateDeck', deck: parsed.data })
      } else {
        dispatch({ type: 'error', error: parsed.error.issues[0]?.message ?? 'Invalid deck' })
      }
    },
    [state.deck],
  )

  const handleSaveSlide = useCallback(
    (slide: Slide) => {
      if (!state.deck) return
      if (editor.index === null) {
        // Add new
        replaceDeck((d) => ({ ...d, slides: [...d.slides, slide] }))
      } else {
        const idx = editor.index
        replaceDeck((d) => ({
          ...d,
          slides: d.slides.map((s, i) => (i === idx ? slide : s)),
        }))
      }
    },
    [editor.index, replaceDeck, state.deck],
  )

  const handleDeleteSlide = useCallback(
    (idx: number) => {
      replaceDeck((d) => ({ ...d, slides: d.slides.filter((_, i) => i !== idx) }))
    },
    [replaceDeck],
  )

  const hasDeck = useMemo(() => Boolean(state.deck), [state.deck])
  const slideCount = state.deck?.slides.length ?? 0
  const canAddSlide = slideCount < MAX_SLIDES

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={switchSession}
        onNew={handleNewDeck}
        onDelete={handleDelete}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 flex min-w-0 min-h-0">
        <section
          className={`${
            hasDeck && showDeck ? 'w-1/2 border-r border-neutral-200 dark:border-neutral-800' : 'w-full'
          } flex flex-col min-w-0 min-h-0`}
        >
          <Chat state={state} onGenerate={onGenerateNow} />
          <Composer
            phase={state.phase}
            disabled={isBusy}
            onSubmit={onComposerSubmit}
            onGenerateNow={onGenerateNow}
          />
        </section>

        {hasDeck && showDeck && state.deck && (
          <section className="w-1/2 flex flex-col min-w-0 min-h-0 relative bg-white dark:bg-neutral-950">
            {/* HEADER: title (left) | theme + print + export | close */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b hairline">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
                  Preview
                </div>
                <div className="font-medium truncate text-sm" data-testid="deck-title">
                  {state.deck.title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemePicker
                  value={state.theme}
                  onChange={(t: Theme) => dispatch({ type: 'setTheme', theme: t })}
                />

                <IconButton
                  onClick={printPdf}
                  title="Print / PDF"
                  testid="print"
                  aria-label="Print or save as PDF"
                >
                  <PrinterIcon className="w-4 h-4" />
                </IconButton>

                <IconButton
                  onClick={exportJson}
                  title="Export JSON"
                  aria-label="Export deck as JSON"
                >
                  <DownloadIcon className="w-4 h-4" />
                </IconButton>
              </div>

              {/* Close — separated with margin so it doesn't crowd the toolset */}
              <div className="ml-3 pl-3 border-l hairline">
                <IconButton
                  onClick={() => setShowDeck(false)}
                  title="Hide deck"
                  aria-label="Hide deck"
                >
                  <CloseIcon className="w-4 h-4" />
                </IconButton>
              </div>
            </div>

            {/* PREVIEW */}
            <div className="flex-1 min-h-0 p-4">
              <DeckViewer deck={state.deck} theme={state.theme} />
            </div>

            {/* FOOTER: slide strip + Present (lower RHS, logo gradient) */}
            <div className="border-t hairline flex items-center gap-2 pl-2 pr-3 py-2">
              <div className="flex-1 min-w-0 overflow-x-auto">
                <SlideStrip
                  slides={state.deck.slides}
                  canAdd={canAddSlide}
                  onAdd={() => setEditor({ open: true, index: null })}
                  onEdit={(i) => setEditor({ open: true, index: i })}
                  onDelete={handleDeleteSlide}
                />
              </div>
              <button
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-medium text-white text-sm hover:opacity-90 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #6A3DFF 0%, #2563FF 100%)',
                }}
                onClick={startPresenting}
                data-testid="present"
                title="Enter fullscreen presentation"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                Present
              </button>
            </div>
          </section>
        )}

        {hasDeck && !showDeck && (
          <button
            className="absolute right-4 top-16 btn-secondary text-xs"
            onClick={() => setShowDeck(true)}
          >
            Show deck
          </button>
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(s) => {
          setSettings(s)
          if (state.phase === 'idle') {
            dispatch({ type: 'setTheme', theme: s.defaultTheme })
          }
        }}
      />

      <SlideEditor
        open={editor.open}
        initial={
          editor.open && editor.index !== null && state.deck
            ? state.deck.slides[editor.index]
            : null
        }
        onClose={() => setEditor({ open: false, index: null })}
        onSave={handleSaveSlide}
      />

      {presenting && state.deck && (
        <PresentationView
          deck={state.deck}
          theme={state.theme}
          onClose={() => setPresenting(false)}
        />
      )}

      {!settings.apiKey && settings.provider !== 'mock' && (
        <button
          className="fixed bottom-4 right-4 btn-primary text-xs shadow-lg"
          onClick={() => setSettingsOpen(true)}
          data-testid="setup-cta"
        >
          Set up your API key (or try Mock mode)
        </button>
      )}
    </div>
  )
}

function IconButton({
  children,
  onClick,
  title,
  testid,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  testid?: string
  'aria-label'?: string
}) {
  return (
    <button
      className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      data-testid={testid}
    >
      {children}
    </button>
  )
}
