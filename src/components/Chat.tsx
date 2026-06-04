import { useEffect, useRef } from 'react'
import type { ChatState, Phase } from '../lib/state'
import { BrainLogo } from './BrainLogo'
import { SparkIcon } from './Icons'

interface Props {
  state: ChatState
  onGenerate: () => void
}

const PHASE_HINT: Record<Phase, string> = {
  idle: 'Drop in your brain-dump below.',
  clarifying: 'I have a question to sharpen the deck.',
  ready: 'I have enough — generate when you are.',
  generating: 'Building the deck...',
  done: 'Deck ready. Edit slides on the right, or refine in chat.',
  error: 'Something went wrong.',
}

const PANEL_BG = '#343434'
const PANEL_BORDER = '#454545'
const BUBBLE_BG = '#2a2a2a'

export function Chat({ state, onGenerate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [state.messages.length, state.phase])

  return (
    <div className="flex flex-col flex-1 min-h-0 text-neutral-100" style={{ background: PANEL_BG }}>
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
      >
        <div>
          <div
            className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium font-mono mb-0.5"
            style={{ background: BUBBLE_BG, color: '#d4d4d4' }}
          >
            Status
          </div>
          <div className="text-[13px] text-neutral-200" data-testid="phase-hint">
            {PHASE_HINT[state.phase]}
          </div>
        </div>
        <div className="text-[11px] text-neutral-400 font-mono">Q {state.questionsAsked}</div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        data-testid="chat-log"
      >
        {state.messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center text-center max-w-md mx-auto pt-20 pb-8"
            data-testid="empty-hero"
          >
            <BrainLogo className="w-24 h-24 mb-5" />
            <h2 className="text-[28px] font-bold tracking-tight text-white mb-1.5">Brain2Brief</h2>
            <p className="text-[12px] text-neutral-400 font-mono uppercase tracking-wider">
              brain-dump → brief deck
            </p>
          </div>
        )}
        {state.messages.map((m) => (
          <MessageBubble key={m.id} message={m} onGenerate={onGenerate} />
        ))}
        {state.phase === 'generating' && <GeneratingShimmer />}
        {state.error && (
          <div
            className="text-sm text-red-200 border border-red-900/60 rounded-md p-3"
            style={{ background: 'rgba(127, 29, 29, 0.25)' }}
            data-testid="chat-error"
          >
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onGenerate,
}: {
  message: ChatState['messages'][number]
  onGenerate: () => void
}) {
  const base =
    'rounded-md px-3.5 py-2.5 text-[13.5px] max-w-[85%] whitespace-pre-wrap leading-relaxed'

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className={`${base} text-white`} style={{ background: 'var(--color-accent)' }}>
          {message.text}
        </div>
      </div>
    )
  }
  if (message.role === 'system') {
    return (
      <div className="text-xs text-neutral-400 italic text-center font-mono">{message.text}</div>
    )
  }

  // Assistant — "ready" messages get the highlighted treatment.
  if (message.meta?.ready) {
    return (
      <div className="flex justify-start" data-testid="ready-message">
        <div
          className="rounded-md p-4 max-w-[90%] text-[13.5px] leading-relaxed text-white shadow-[0_0_0_1px_rgba(106,61,255,0.35)]"
          style={{
            background:
              'linear-gradient(135deg, rgba(106,61,255,0.18) 0%, rgba(37,99,255,0.18) 100%), #1a1a2e',
            border: '1px solid rgba(106,61,255,0.4)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <SparkIcon
              className="w-3.5 h-3.5"
              strokeWidth={2.5}
            />
            <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-300">
              Ready to draft
            </span>
          </div>
          <div className="whitespace-pre-wrap text-neutral-100 mb-3">{message.text}</div>
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 font-medium text-white text-sm hover:opacity-90 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #6A3DFF 0%, #2563FF 100%)',
            }}
            onClick={onGenerate}
            data-testid="generate-now"
          >
            <SparkIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            Generate slides
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div
        className={`${base} text-neutral-100 border`}
        style={{ background: BUBBLE_BG, borderColor: PANEL_BORDER }}
      >
        {message.text}
        {message.meta?.missing && message.meta.missing.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.meta.missing.map((m) => (
              <span
                key={m}
                className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium font-mono"
                style={{ background: '#404040', color: '#d4d4d4' }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GeneratingShimmer() {
  return (
    <div className="flex items-center gap-2.5" data-testid="generating">
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse"
        style={{
          background: 'linear-gradient(135deg, #6A3DFF, #2563FF)',
        }}
      />
      <span
        className="text-sm font-medium animate-pulse"
        style={{
          backgroundImage: 'linear-gradient(135deg, #6A3DFF 0%, #2563FF 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Generating deck...
      </span>
    </div>
  )
}
