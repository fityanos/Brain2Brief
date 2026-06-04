import type { Slide } from '../lib/slideSchema'
import { PencilIcon, PlusIcon, TrashIcon } from './Icons'

interface Props {
  slides: Slide[]
  onEdit: (idx: number) => void
  onDelete: (idx: number) => void
  onAdd: () => void
  canAdd: boolean
}

function summarize(slide: Slide): string {
  switch (slide.type) {
    case 'title':
      return slide.title
    case 'bullets':
      return slide.title
    case 'quote':
      return slide.title ?? '“' + slide.quote.slice(0, 40) + '”'
    case 'code':
      return slide.title
    case 'two-col':
      return slide.title
  }
}

export function SlideStrip({ slides, onEdit, onDelete, onAdd, canAdd }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-2">
      {slides.map((s, i) => (
        <div
          key={i}
          className="group relative shrink-0 w-36 h-20 rounded-md border hairline bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 flex flex-col justify-between"
          data-testid={`slide-thumb-${i}`}
        >
          <div className="flex items-start justify-between gap-1">
            <span className="font-mono text-[10px] text-neutral-500">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
              {s.type}
            </span>
          </div>
          <div className="text-[11px] leading-tight line-clamp-2 text-neutral-800 dark:text-neutral-200">
            {summarize(s)}
          </div>
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center gap-1.5 transition-opacity">
            <button
              className="btn-ghost text-white hover:text-white hover:bg-white/20"
              onClick={() => onEdit(i)}
              aria-label={`Edit slide ${i + 1}`}
              data-testid={`edit-slide-${i}`}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              className="btn-ghost text-white hover:text-red-300 hover:bg-white/20"
              onClick={() => onDelete(i)}
              aria-label={`Delete slide ${i + 1}`}
              data-testid={`delete-slide-${i}`}
              disabled={slides.length <= 1}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        className="shrink-0 w-20 h-20 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-neutral-100 hover:border-neutral-100 dark:hover:border-neutral-400 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        onClick={onAdd}
        disabled={!canAdd}
        aria-label="Add slide"
        data-testid="add-slide"
        title={canAdd ? 'Add slide' : 'Maximum slides reached'}
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
