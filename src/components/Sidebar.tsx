import type { SessionRecord } from '../lib/storage'
import { BrainLogo } from './BrainLogo'
import { SettingsGradientIcon } from './Icons'

interface Props {
  sessions: SessionRecord[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, onOpenSettings }: Props) {
  return (
    <aside className="w-72 shrink-0 border-r hairline flex flex-col surface">
      <div className="px-4 py-4 border-b hairline">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrainLogo className="w-5 h-5" />
            <h1 className="font-bold tracking-tight text-[15px]">Brain2Brief</h1>
          </div>
          <button
            className="relative p-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors group"
            onClick={onOpenSettings}
            aria-label="Open settings"
            data-testid="open-settings"
            title="Settings"
          >
            <SettingsGradientIcon className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" strokeWidth={2.2} />
          </button>
        </div>
        <button
          className="btn-primary w-full text-sm"
          onClick={onNew}
          data-testid="new-deck"
        >
          + New deck
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5">
        {sessions.length === 0 ? (
          <p className="text-xs text-neutral-500 px-3 py-6 leading-relaxed">
            No decks yet.<br />Start one above to begin.
          </p>
        ) : (
          sessions.map((s) => {
            const active = s.id === activeId
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                  active
                    ? 'bg-white dark:bg-neutral-900 border hairline'
                    : 'hover:bg-white/60 dark:hover:bg-neutral-900/60 border border-transparent'
                }`}
                onClick={() => onSelect(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{s.title || 'Untitled'}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 text-base leading-none px-1.5 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(s.id)
                  }}
                  aria-label="Delete deck"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </nav>

      <div className="px-4 py-3 text-[10px] text-neutral-500 border-t hairline leading-relaxed">
        Local-only. Your API key never leaves the browser.
      </div>
    </aside>
  )
}
