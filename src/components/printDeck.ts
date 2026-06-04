import type { Deck, Theme } from '../lib/slideSchema'
import { renderSlidesHtml } from './slideHtml'

const THEME_VARS: Record<Theme, Record<string, string>> = {
  minimal: {
    '--slide-bg': '#ffffff',
    '--slide-ink': '#0a0a0a',
    '--slide-muted': '#525252',
    '--slide-accent': '#1e6fff',
    '--slide-rule': '#e5e5e5',
  },
  dark: {
    '--slide-bg': '#0a0a0a',
    '--slide-ink': '#fafafa',
    '--slide-muted': '#a3a3a3',
    '--slide-accent': '#1e6fff',
    '--slide-rule': '#262626',
  },
  corporate: {
    '--slide-bg': '#ffffff',
    '--slide-ink': '#111827',
    '--slide-muted': '#4b5563',
    '--slide-accent': '#0f4c81',
    '--slide-rule': '#d1d5db',
    '--slide-band': '#f3f4f6',
  },
}

function vars(theme: Theme): string {
  return Object.entries(THEME_VARS[theme])
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')
}

function buildPrintHtml(deck: Deck, theme: Theme): string {
  const slidesHtml = renderSlidesHtml(deck.slides)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(deck.title)} — Brain2Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { ${vars(theme)} }
  @page { size: 1280px 720px; margin: 0; }
  html, body { margin: 0; padding: 0; background: var(--slide-bg); color: var(--slide-ink); font-family: "Inter", system-ui, sans-serif; }
  .deck { display: block; }
  section {
    box-sizing: border-box;
    width: 1280px;
    height: 720px;
    padding: 64px 80px;
    page-break-after: always;
    page-break-inside: avoid;
    break-after: page;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: var(--slide-bg);
    color: var(--slide-ink);
    border-top: ${theme === 'corporate' ? '6px solid var(--slide-accent)' : 'none'};
  }
  section:last-child { page-break-after: auto; }
  h1 { font-weight: 700; font-size: 56px; letter-spacing: -0.02em; margin: 0 0 16px; color: var(--slide-ink); }
  h2 { font-weight: 600; font-size: 36px; margin: 0 0 24px; color: var(--slide-ink); letter-spacing: -0.01em; ${theme === 'corporate' ? 'text-transform: uppercase; color: var(--slide-accent);' : ''} }
  h3 { font-weight: 600; font-size: 20px; color: var(--slide-accent); margin: 0 0 12px; }
  p { margin: 0; }
  .subtitle { color: ${theme === 'dark' ? 'var(--slide-accent)' : 'var(--slide-muted)'}; font-size: 22px; margin-top: 12px; }
  ul { list-style: ${theme === 'corporate' ? 'disc' : 'none'}; padding: ${theme === 'corporate' ? '0 0 0 24px' : '0'}; margin: 0; }
  ul li { padding: ${theme === 'corporate' ? '8px 0' : '12px 0'}; font-size: 22px; line-height: 1.4; ${theme !== 'corporate' ? 'border-bottom: 1px solid var(--slide-rule);' : ''} }
  ul li:last-child { border-bottom: none; }
  ${theme === 'dark' ? 'ul li::before { content: "→ "; color: var(--slide-accent); }' : ''}
  blockquote { margin: 0; padding-left: ${theme === 'minimal' ? '24px' : '0'}; ${theme === 'minimal' ? 'border-left: 4px solid var(--slide-accent);' : ''} ${theme === 'corporate' ? 'background: var(--slide-band); border-left: 4px solid var(--slide-accent); padding: 24px 28px;' : ''} font-size: 32px; ${theme === 'dark' ? 'font-style: italic;' : ''} color: var(--slide-ink); }
  .attribution { color: var(--slide-muted); font-size: 18px; margin-top: 20px; }
  pre { background: ${theme === 'dark' ? '#171717' : '#fafafa'}; border: 1px solid var(--slide-rule); border-radius: 4px; font-family: "JetBrains Mono", monospace; font-size: 16px; padding: 20px; overflow: hidden; margin: 0; color: var(--slide-ink); }
  .caption { color: var(--slide-muted); font-size: 16px; margin-top: 12px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .notes { display: none; }
</style>
</head>
<body>
  <div class="deck print-root">${slidesHtml}</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printDeck(deck: Deck, theme: Theme): void {
  const html = buildPrintHtml(deck, theme)
  const win = window.open('', '_blank', 'width=1280,height=720,noopener=no')
  if (!win) {
    alert(
      'Pop-up blocked. Please allow pop-ups for this site and click Print again.',
    )
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()

  // Drive the print dialog from the parent context so the popup itself never
  // needs an inline <script> (which the parent CSP would block).
  const triggerPrint = () => {
    try {
      win.focus()
      win.print()
    } catch {
      // popup closed before we could print — ignore
    }
  }

  // Give the popup a beat to lay out fonts + slides before printing.
  const wait = 350
  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, wait)
  } else {
    win.addEventListener('load', () => setTimeout(triggerPrint, wait), { once: true })
  }
  win.addEventListener('afterprint', () => {
    try {
      win.close()
    } catch {
      // ignore
    }
  })
}
