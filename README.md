# Brain2Brief

Brain-dump a topic → answer a few clarifying questions → get a 1–10 slide deck.
For engineers who get pulled into "can you demo this real quick" with no time to design slides.

100% local. No backend. Bring your own LLM API key.

## Quick start

```bash
git clone https://github.com/fityanos/Brain2Brief.git
cd Brain2Brief
npm install
npm run dev
```

Open `http://localhost:5173`. Click the gear icon → choose a provider → paste your API key → save. Or start with **Mock** mode (no key required) to try the flow.

## Providers

Pick one in Settings:

| Provider | Base URL | Notes |
|---|---|---|
| **Mock** | (none) | No key needed. Scripted Q&A + a deck built from your brain-dump text. Great for trying it out. |
| **Anthropic** | `https://api.anthropic.com/v1` | Use a key from [console.anthropic.com](https://console.anthropic.com). Default model: `claude-sonnet-4-6`. |
| **OpenAI-compatible** | any `/v1/chat/completions` endpoint | Works with OpenAI, OpenRouter, Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`). |

Optional: copy `.env.example` to `.env.local` to pre-fill the Settings panel.

## How your key is handled

- **Stored only in your browser's localStorage.** Never written to disk by this app, never sent anywhere except the LLM endpoint you configured.
- **No backend.** The browser calls the LLM provider directly.
- **No telemetry, no analytics.** Search the repo for `fetch(` — the only outbound calls are to your configured LLM endpoint and (for the print popup) Google Fonts.
- **CSP enforced in production builds.** See below.

## Content Security Policy

The production build (`npm run build`) injects a strict CSP into `index.html`:

- `script-src 'self'` — no inline scripts, no `eval`, no third-party JS
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — inline styles allowed for React's `style={{...}}` props
- `font-src 'self' data: https://fonts.gstatic.com` — Inter + JetBrains Mono only
- `img-src 'self' data:` — only same-origin and bundled assets
- `connect-src` — same-origin, any `localhost` (for Ollama / LM Studio), and the three known remote providers (`api.anthropic.com`, `api.openai.com`, `openrouter.ai`)
- `form-action 'none'` — the app never submits a form
- `frame-ancestors 'none'` — cannot be embedded in an iframe
- `object-src 'none'`, `base-uri 'self'`

If you point Settings at a provider not in the `connect-src` list above, the browser will block the request. Edit the `CSP` constant in [`vite.config.ts`](vite.config.ts) to add the host, then rebuild.

The dev server (`npm run dev`) runs **without** CSP — Vite's HMR needs inline scripts. For a hardened local run, use:

```bash
npm run build
npm run preview
```

## How it works

1. **Brain-dump** — your topic, in any form (bullets, half-sentences, raw thoughts).
2. **Clarify** — the model asks up to 5 focused questions (audience, goal, key takeaway, etc.) and self-signals when it has enough.
3. **Generate** — click the button inside the "ready" message. The model returns a structured deck (zod-validated, retried once on bad JSON).
4. **Edit** — add / delete / modify slides locally in the deck panel. No API calls.
5. **Export** — Print/PDF (popup window with stacked slides), JSON export, or full-screen **Present** mode (Reveal.js).

Past decks are listed in the left sidebar (localStorage, refresh-safe).

## Scripts

```bash
npm run dev        # Vite dev server (no CSP)
npm run build      # Production build (CSP injected)
npm run preview    # Serve the production build locally
npm test           # Vitest unit tests
npm run e2e        # Playwright end-to-end (mocked LLM, no key needed)
```

## Project layout

```
src/
  components/   Sidebar, Chat, Composer, DeckViewer, SlideEditor, SlideStrip,
                PresentationView, SettingsModal, BrainLogo, Icons
  lib/          slideSchema (zod), prompts, llm (Anthropic + OpenAI-compat + Mock),
                state (reducer), storage
  themes/       minimal.css, dark.css, corporate.css
  test/         vitest unit tests
e2e/            Playwright + mocked LLM
public/         favicon.svg
```

## License

MIT — do whatever you like.
