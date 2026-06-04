import { useState, type KeyboardEvent } from 'react'
import type { Phase } from '../lib/state'

interface Props {
  phase: Phase
  disabled: boolean
  onSubmit: (text: string) => void
  onGenerateNow: () => void
}

const PANEL_BG = '#343434'
const PANEL_BORDER = '#454545'
const TEXTAREA_BG = '#404040'

export function Composer({ phase, disabled, onSubmit, onGenerateNow }: Props) {
  const [text, setText] = useState('')

  const placeholder =
    phase === 'idle'
      ? 'Brain-dump your topic. Rough thoughts, bullets, anything — Cmd/Ctrl+Enter to send.'
      : phase === 'clarifying'
        ? 'Answer the question, or add more context...'
        : phase === 'done'
          ? 'Ask for a tweak, or start a new deck...'
          : 'Add a clarification...'

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setText('')
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canGenerateNow =
    (phase === 'idle' || phase === 'clarifying' || phase === 'ready') && !disabled

  return (
    <div
      className="px-5 py-3"
      style={{ background: PANEL_BG, borderTop: `1px solid ${PANEL_BORDER}` }}
    >
      <textarea
        className="w-full resize-none rounded-md border px-3 py-2.5 text-[13.5px] leading-relaxed text-white placeholder:text-neutral-400 outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
        style={{ background: TEXTAREA_BG, borderColor: '#525252' }}
        rows={3}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        data-testid="composer-input"
      />
      <div className="flex justify-between items-center mt-2.5">
        <div className="text-[11px] text-neutral-400 font-mono">Cmd/Ctrl + Enter to send</div>
        <div className="flex gap-2">
          {canGenerateNow && phase !== 'idle' && (
            <button
              className="btn-secondary text-xs"
              onClick={onGenerateNow}
              disabled={disabled}
              data-testid="composer-generate-now"
            >
              Generate now
            </button>
          )}
          <button
            className="btn-primary text-sm"
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
            data-testid="composer-send"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
