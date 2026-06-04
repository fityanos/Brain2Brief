import { useEffect, useRef } from 'react'
import Reveal from 'reveal.js'
import 'reveal.js/reveal.css'
import type { Deck, Theme } from '../lib/slideSchema'
import { renderSlidesHtml } from './slideHtml'

interface Props {
  deck: Deck
  theme: Theme
  onClose: () => void
}

export function PresentationView({ deck, theme, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.innerHTML = `<div class="slides">${renderSlidesHtml(deck.slides)}</div>`

    const r = new Reveal(el, {
      embedded: false,
      hash: false,
      controls: true,
      progress: true,
      slideNumber: 'c/t',
      keyboard: true,
      transition: 'slide',
      backgroundTransition: 'fade',
    })
    r.initialize()
    el.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // Try entering browser fullscreen automatically for the immersive feel.
    // Will silently no-op if the browser blocks it without a user gesture.
    const requestFs = () => {
      const target = document.documentElement
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {})
      }
    }
    requestFs()

    return () => {
      window.removeEventListener('keydown', onKey)
      try {
        r.destroy()
      } catch {
        // ignore
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [deck, onClose])

  return (
    <div
      className="fixed inset-0 z-[60] bg-black"
      data-testid="presentation-view"
    >
      <div
        ref={containerRef}
        data-theme={theme}
        className="reveal w-full h-full outline-none"
        tabIndex={0}
      />
      <div className="absolute top-4 right-4 flex gap-2 z-[70]">
        <button
          className="btn-secondary text-xs"
          onClick={onClose}
          aria-label="Exit presentation"
          data-testid="exit-presentation"
        >
          Esc · Exit
        </button>
      </div>
    </div>
  )
}
