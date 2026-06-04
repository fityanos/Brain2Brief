import { useEffect, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  PROVIDER_DEFAULTS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../lib/storage'
import type { Provider } from '../lib/llm'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (s: Settings) => void
}

export function SettingsModal({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Settings>(loadSettings())
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) setForm(loadSettings())
  }, [open])

  if (!open) return null

  const handleSave = () => {
    saveSettings(form)
    onSaved(form)
    onClose()
  }

  const handleReset = () => setForm(DEFAULT_SETTINGS)

  const handleProviderChange = (provider: Provider) => {
    const d = PROVIDER_DEFAULTS[provider]
    const isUsingCurrentDefaults =
      form.baseUrl === PROVIDER_DEFAULTS[form.provider].baseUrl &&
      form.model === PROVIDER_DEFAULTS[form.provider].model
    setForm({
      ...form,
      provider,
      baseUrl: isUsingCurrentDefaults ? d.baseUrl : form.baseUrl,
      model: isUsingCurrentDefaults ? d.model : form.model,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-950 rounded-md p-6 border hairline"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-title" className="text-base font-bold tracking-tight">
            Settings
          </h2>
          <button className="btn-ghost text-xs" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <Field label="Provider">
            <select
              className="input"
              value={form.provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
              data-testid="provider-select"
            >
              <option value="mock">Mock (no API key, scripted responses)</option>
              <option value="anthropic">Anthropic (native /v1/messages)</option>
              <option value="openai-compatible">OpenAI-compatible (/v1/chat/completions)</option>
            </select>
            {form.provider === 'mock' && (
              <p className="mt-1 text-xs text-neutral-500">
                Runs entirely in your browser. Scripted clarifying questions, then generates a deck based on your brain-dump text. Great for trying the UX.
              </p>
            )}
          </Field>

          {form.provider !== 'mock' && (
            <>
              <Field
                label="Base URL"
                hint={
                  form.provider === 'anthropic'
                    ? 'Anthropic /v1 endpoint'
                    : 'OpenAI-compatible /v1 endpoint'
                }
              >
                <input
                  className="input"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder={PROVIDER_DEFAULTS[form.provider].baseUrl}
                />
              </Field>

              <Field label="API key" hint="Stored locally in your browser only">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    type={showKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder={form.provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Field label="Model">
                <input
                  className="input"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder={PROVIDER_DEFAULTS[form.provider].model}
                />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Default theme">
              <select
                className="input"
                value={form.defaultTheme}
                onChange={(e) =>
                  setForm({ ...form, defaultTheme: e.target.value as Settings['defaultTheme'] })
                }
              >
                <option value="minimal">Minimal</option>
                <option value="dark">Dark</option>
                <option value="corporate">Corporate</option>
              </select>
            </Field>
            <Field label="Max slides">
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={form.maxSlides}
                onChange={(e) => setForm({ ...form, maxSlides: Number(e.target.value) })}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button className="text-xs text-neutral-500 hover:underline" onClick={handleReset}>
            Reset to .env defaults
          </button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} data-testid="settings-save">
              Save
            </button>
          </div>
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
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
