import { useEffect, useState } from 'react'
import type { Slide, SlideType } from '../lib/slideSchema'
import { SlideSchema } from '../lib/slideSchema'
import { CloseIcon } from './Icons'

interface Props {
  open: boolean
  initial: Slide | null
  onClose: () => void
  onSave: (slide: Slide) => void
}

const DEFAULTS: Record<SlideType, Slide> = {
  title: { type: 'title', title: 'New title', subtitle: '' },
  bullets: { type: 'bullets', title: 'New section', bullets: ['First point'] },
  quote: { type: 'quote', quote: 'A short, memorable line.', attribution: '' },
  code: { type: 'code', title: 'Code', language: 'ts', code: 'const x = 1', caption: '' },
  'two-col': {
    type: 'two-col',
    title: 'Compare',
    left: { heading: 'Left', bullets: ['A'] },
    right: { heading: 'Right', bullets: ['B'] },
  },
}

const TYPE_LABELS: Record<SlideType, string> = {
  title: 'Title',
  bullets: 'Bullets',
  quote: 'Quote',
  code: 'Code',
  'two-col': 'Two columns',
}

function linesToList(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

function listToLines(arr: string[]): string {
  return arr.join('\n')
}

export function SlideEditor({ open, initial, onClose, onSave }: Props) {
  const [slide, setSlide] = useState<Slide>(initial ?? DEFAULTS.bullets)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSlide(initial ?? DEFAULTS.bullets)
      setErr(null)
    }
  }, [open, initial])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const changeType = (next: SlideType) => {
    if (next === slide.type) return
    setSlide(DEFAULTS[next])
  }

  const save = () => {
    const r = SlideSchema.safeParse(slide)
    if (!r.success) {
      setErr(r.error.issues[0]?.message ?? 'Invalid slide')
      return
    }
    onSave(r.data)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-editor-title"
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-neutral-950 rounded-md border hairline overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <h2 id="slide-editor-title" className="text-base font-bold tracking-tight">
            {initial ? 'Edit slide' : 'New slide'}
          </h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
          <Field label="Type">
            <select
              className="input"
              value={slide.type}
              onChange={(e) => changeType(e.target.value as SlideType)}
            >
              {(Object.keys(TYPE_LABELS) as SlideType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>

          {slide.type === 'title' && (
            <>
              <Field label="Title">
                <input
                  className="input"
                  value={slide.title}
                  onChange={(e) => setSlide({ ...slide, title: e.target.value })}
                />
              </Field>
              <Field label="Subtitle">
                <input
                  className="input"
                  value={slide.subtitle ?? ''}
                  onChange={(e) => setSlide({ ...slide, subtitle: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'bullets' && (
            <>
              <Field label="Title">
                <input
                  className="input"
                  value={slide.title}
                  onChange={(e) => setSlide({ ...slide, title: e.target.value })}
                />
              </Field>
              <Field label="Bullets" hint="One per line (max 7)">
                <textarea
                  className="input min-h-[120px] resize-y"
                  value={listToLines(slide.bullets)}
                  onChange={(e) => setSlide({ ...slide, bullets: linesToList(e.target.value) })}
                />
              </Field>
            </>
          )}

          {slide.type === 'quote' && (
            <>
              <Field label="Title (optional)">
                <input
                  className="input"
                  value={slide.title ?? ''}
                  onChange={(e) => setSlide({ ...slide, title: e.target.value })}
                />
              </Field>
              <Field label="Quote">
                <textarea
                  className="input min-h-[100px] resize-y"
                  value={slide.quote}
                  onChange={(e) => setSlide({ ...slide, quote: e.target.value })}
                />
              </Field>
              <Field label="Attribution">
                <input
                  className="input"
                  value={slide.attribution ?? ''}
                  onChange={(e) => setSlide({ ...slide, attribution: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'code' && (
            <>
              <Field label="Title">
                <input
                  className="input"
                  value={slide.title}
                  onChange={(e) => setSlide({ ...slide, title: e.target.value })}
                />
              </Field>
              <Field label="Language">
                <input
                  className="input"
                  value={slide.language}
                  onChange={(e) => setSlide({ ...slide, language: e.target.value })}
                />
              </Field>
              <Field label="Code">
                <textarea
                  className="input min-h-[140px] resize-y font-mono text-xs"
                  value={slide.code}
                  onChange={(e) => setSlide({ ...slide, code: e.target.value })}
                />
              </Field>
              <Field label="Caption (optional)">
                <input
                  className="input"
                  value={slide.caption ?? ''}
                  onChange={(e) => setSlide({ ...slide, caption: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'two-col' && (
            <>
              <Field label="Title">
                <input
                  className="input"
                  value={slide.title}
                  onChange={(e) => setSlide({ ...slide, title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Field label="Left heading">
                    <input
                      className="input"
                      value={slide.left.heading ?? ''}
                      onChange={(e) =>
                        setSlide({ ...slide, left: { ...slide.left, heading: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Left bullets" hint="One per line">
                    <textarea
                      className="input min-h-[100px] resize-y"
                      value={listToLines(slide.left.bullets)}
                      onChange={(e) =>
                        setSlide({
                          ...slide,
                          left: { ...slide.left, bullets: linesToList(e.target.value) },
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="space-y-2">
                  <Field label="Right heading">
                    <input
                      className="input"
                      value={slide.right.heading ?? ''}
                      onChange={(e) =>
                        setSlide({ ...slide, right: { ...slide.right, heading: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Right bullets" hint="One per line">
                    <textarea
                      className="input min-h-[100px] resize-y"
                      value={listToLines(slide.right.bullets)}
                      onChange={(e) =>
                        setSlide({
                          ...slide,
                          right: { ...slide.right, bullets: linesToList(e.target.value) },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          <Field label="Speaker notes (optional)">
            <textarea
              className="input min-h-[60px] resize-y"
              value={slide.notes ?? ''}
              onChange={(e) => setSlide({ ...slide, notes: e.target.value })}
            />
          </Field>

          {err && <div className="text-xs text-red-600">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t hairline">
          <button className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-sm" onClick={save} data-testid="slide-editor-save">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex justify-between mb-1">
        <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        {hint && <span className="text-[10px] text-neutral-500 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
