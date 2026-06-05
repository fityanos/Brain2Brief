import type { Slide } from '../lib/slideSchema'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderSlideHtml(slide: Slide): string {
  const notes = slide.notes ? `<aside class="notes">${escapeHtml(slide.notes)}</aside>` : ''
  switch (slide.type) {
    case 'title':
      return `<section class="slide-title">
        <h1>${escapeHtml(slide.title)}</h1>
        ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
        ${notes}
      </section>`
    case 'bullets':
      return `<section>
        <h2>${escapeHtml(slide.title)}</h2>
        <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
        ${notes}
      </section>`
    case 'quote':
      return `<section>
        ${slide.title ? `<h2>${escapeHtml(slide.title)}</h2>` : ''}
        <blockquote>${escapeHtml(slide.quote)}</blockquote>
        ${slide.attribution ? `<p class="attribution">— ${escapeHtml(slide.attribution)}</p>` : ''}
        ${notes}
      </section>`
    case 'code':
      return `<section>
        <h2>${escapeHtml(slide.title)}</h2>
        <pre><code class="language-${escapeHtml(slide.language)}">${escapeHtml(slide.code)}</code></pre>
        ${slide.caption ? `<p class="caption">${escapeHtml(slide.caption)}</p>` : ''}
        ${notes}
      </section>`
    case 'two-col':
      return `<section>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="two-col">
          <div>
            ${slide.left.heading ? `<h3>${escapeHtml(slide.left.heading)}</h3>` : ''}
            <ul>${slide.left.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
          </div>
          <div>
            ${slide.right.heading ? `<h3>${escapeHtml(slide.right.heading)}</h3>` : ''}
            <ul>${slide.right.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
          </div>
        </div>
        ${notes}
      </section>`
  }
}

export function renderSlidesHtml(slides: Slide[]): string {
  return slides.map(renderSlideHtml).join('')
}
