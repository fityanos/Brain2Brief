/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Content Security Policy.
 *
 * Applied to the production build only (so Vite's dev HMR — which injects
 * inline scripts — keeps working in `npm run dev`).
 *
 * Allowed origins:
 *   - script-src: same-origin only — no inline, no eval, no third-party JS
 *   - style-src:  same-origin + Google Fonts stylesheet + inline (React `style={{...}}` props)
 *   - font-src:   same-origin + Google Fonts CDN
 *   - img-src:    same-origin + data: (Vite asset inlining)
 *   - connect-src: same-origin + Anthropic + OpenAI + OpenRouter + any localhost
 *                 (for Ollama / LM Studio / corporate proxies). Edit if you need
 *                 a different remote provider.
 *   - form-action: 'none' (the app never submits a real form)
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data:",
  [
    'connect-src',
    "'self'",
    'http://localhost:*',
    'http://127.0.0.1:*',
    'https://api.anthropic.com',
    'https://api.openai.com',
    'https://openrouter.ai',
  ].join(' '),
  "form-action 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function cspPlugin(): PluginOption {
  return {
    name: 'brain2brief-csp',
    apply: 'build',
    transformIndexHtml(html: string) {
      return html.replace(
        /<head>/i,
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
