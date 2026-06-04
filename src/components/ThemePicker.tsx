import type { Theme } from '../lib/slideSchema'
import { MoonIcon, SunIcon } from './Icons'

interface Props {
  value: Theme
  onChange: (t: Theme) => void
}

const ITEMS: { id: Theme; label: string; Icon: typeof SunIcon }[] = [
  { id: 'minimal', label: 'Light', Icon: SunIcon },
  { id: 'dark', label: 'Dark', Icon: MoonIcon },
]

export function ThemePicker({ value, onChange }: Props) {
  return (
    <div className="inline-flex border hairline rounded-md overflow-hidden" role="radiogroup" aria-label="Theme">
      {ITEMS.map(({ id, label, Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            className={`p-1.5 transition-colors ${
              active
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            onClick={() => onChange(id)}
            data-testid={`theme-${id}`}
            aria-label={`${label} theme`}
            aria-pressed={active}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}
