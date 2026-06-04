import { useEffect, useRef } from 'react'
import Reveal from 'reveal.js'
import 'reveal.js/reveal.css'
import '../themes/minimal.css'
import '../themes/dark.css'
import '../themes/corporate.css'
import type { Deck, Theme } from '../lib/slideSchema'
import { renderSlidesHtml } from './slideHtml'

interface Props {
  deck: Deck
  theme: Theme
}

export function DeckViewer({ deck, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<InstanceType<typeof Reveal> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.innerHTML = `<div class="slides">${renderSlidesHtml(deck.slides)}</div>`

    const r = new Reveal(el, {
      embedded: true,
      hash: false,
      controls: true,
      progress: true,
      slideNumber: 'c/t',
      keyboardCondition: 'focused',
      width: 1024,
      height: 640,
      margin: 0.06,
    })
    r.initialize()
    revealRef.current = r

    return () => {
      try {
        r.destroy()
      } catch {
        // reveal may throw if already destroyed
      }
      revealRef.current = null
    }
  }, [deck])

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        data-theme={theme}
        data-testid="deck-viewer"
        className="reveal flex-1 border hairline rounded-md overflow-hidden"
        tabIndex={0}
      />
    </div>
  )
}
