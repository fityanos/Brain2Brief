import { test, expect, type Route } from '@playwright/test'

type Turn =
  | { kind: 'clarify'; ready: false; confidence: number; next_question: string; rationale?: string; missing?: string[] }
  | { kind: 'clarify'; ready: true; confidence: number; rationale?: string }
  | { kind: 'generate'; deck: { title: string; theme: string; slides: { type: string; title: string; bullets?: string[]; subtitle?: string }[] } }

const scripted: Turn[] = [
  {
    kind: 'clarify',
    ready: false,
    confidence: 0.4,
    next_question: 'Who is the audience for this demo?',
    missing: ['audience'],
  },
  {
    kind: 'clarify',
    ready: true,
    confidence: 0.9,
    rationale: 'I have audience and goal — enough to draft.',
  },
  {
    kind: 'generate',
    deck: {
      title: 'Inference Latency Wins',
      theme: 'minimal',
      slides: [
        { type: 'title', title: 'Inference Latency Wins', subtitle: 'A 30-second pitch' },
        {
          type: 'bullets',
          title: 'What changed',
          bullets: ['Batched requests', 'Cached embeddings', 'Quantized model'],
        },
        {
          type: 'bullets',
          title: 'Result',
          bullets: ['p95 latency: 180ms → 65ms', 'GPU utilization up 22%'],
        },
        {
          type: 'bullets',
          title: 'Next',
          bullets: ['Roll out to staging', 'Measure for one week'],
        },
      ],
    },
  },
]

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem(
      'slidekick.settings.v1',
      JSON.stringify({
        provider: 'openai-compatible',
        baseUrl: 'https://mock.test/v1',
        apiKey: 'mock-key',
        model: 'mock-model',
        defaultTheme: 'minimal',
        maxSlides: 8,
      }),
    )
  })

  let callIdx = 0
  await page.route('**/mock.test/v1/chat/completions', async (route: Route) => {
    const turn = scripted[Math.min(callIdx, scripted.length - 1)]
    callIdx++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify(turn) } }],
      }),
    })
  })
})

test('brain-dump → clarify → ready → generate → deck renders', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('phase-hint')).toContainText('Drop in your brain-dump')

  await page
    .getByTestId('composer-input')
    .fill('demoing how we cut inference latency in half last sprint')
  await page.getByTestId('composer-send').click()

  await expect(page.getByText('Who is the audience for this demo?')).toBeVisible({
    timeout: 10_000,
  })

  await page.getByTestId('composer-input').fill('engineering leadership, mixed familiarity')
  await page.getByTestId('composer-send').click()

  await expect(page.getByTestId('generate-now')).toBeVisible({ timeout: 10_000 })

  await page.getByTestId('generate-now').click()

  await expect(page.getByTestId('deck-title')).toHaveText('Inference Latency Wins', {
    timeout: 15_000,
  })

  const deck = page.getByTestId('deck-viewer')
  await expect(deck).toBeVisible()
  await expect(deck.locator('section')).toHaveCount(4)
})

test('theme picker swaps data-theme attribute on rendered deck', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('composer-input').fill('topic')
  await page.getByTestId('composer-send').click()
  await page.getByTestId('composer-input').fill('answer')
  await page.getByTestId('composer-send').click()
  await page.getByTestId('generate-now').click()
  await expect(page.getByTestId('deck-title')).toBeVisible({ timeout: 15_000 })

  await expect(page.getByTestId('deck-viewer')).toHaveAttribute('data-theme', 'minimal')
  await page.getByTestId('theme-dark').click()
  await expect(page.getByTestId('deck-viewer')).toHaveAttribute('data-theme', 'dark')
})
