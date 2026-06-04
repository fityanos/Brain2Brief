import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLlm, LlmError, parseAssistantTurn, stripJsonFences } from '../lib/llm'

describe('stripJsonFences', () => {
  it('removes ```json fences', () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('removes plain ``` fences', () => {
    expect(stripJsonFences('```\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('returns raw JSON unchanged', () => {
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}')
  })
})

describe('parseAssistantTurn', () => {
  it('parses a clarify turn from raw JSON', () => {
    const turn = parseAssistantTurn(
      '{"kind":"clarify","ready":false,"confidence":0.5,"next_question":"who?"}',
    )
    expect(turn.kind).toBe('clarify')
  })

  it('throws on malformed JSON', () => {
    expect(() => parseAssistantTurn('not json')).toThrow()
  })

  it('throws on schema mismatch', () => {
    expect(() => parseAssistantTurn('{"kind":"nope"}')).toThrow()
  })
})

describe('callLlm — openai-compatible', () => {
  const config = {
    provider: 'openai-compatible' as const,
    baseUrl: 'https://x.test/v1',
    apiKey: 'k',
    model: 'm',
  }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  const okResponse = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  it('returns a parsed clarify turn', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse(
        '{"kind":"clarify","ready":false,"confidence":0.4,"next_question":"who is the audience?"}',
      ),
    )
    const t = await callLlm(config, [{ role: 'user', content: 'topic' }])
    expect(t.kind).toBe('clarify')
  })

  it('retries once on bad JSON then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('not json at all'))
    fetchMock.mockResolvedValueOnce(
      okResponse('{"kind":"clarify","ready":true,"confidence":0.9}'),
    )
    const t = await callLlm(config, [{ role: 'user', content: 'topic' }])
    expect(t.kind).toBe('clarify')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws LlmError if retry also fails', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('not json'))
    fetchMock.mockResolvedValueOnce(okResponse('still not json'))
    await expect(callLlm(config, [{ role: 'user', content: 'topic' }])).rejects.toBeInstanceOf(
      LlmError,
    )
  })

  it('throws LlmError on non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream', { status: 401 }))
    await expect(callLlm(config, [{ role: 'user', content: 'topic' }])).rejects.toBeInstanceOf(
      LlmError,
    )
  })

  it('sends authorization header and JSON body with model + messages', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse('{"kind":"clarify","ready":true,"confidence":1}'),
    )
    await callLlm(config, [{ role: 'user', content: 'hi' }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://x.test/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer k')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toBe('hi')
    expect(body.response_format.type).toBe('json_object')
  })
})

describe('callLlm — anthropic', () => {
  const config = {
    provider: 'anthropic' as const,
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: 'sk-ant-test',
    model: 'claude-sonnet-4-6',
  }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  const anthropicResponse = (text: string) =>
    new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  it('hits /messages and parses content[0].text', async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse('{"kind":"clarify","ready":true,"confidence":0.9}'),
    )
    const t = await callLlm(config, [{ role: 'user', content: 'topic' }])
    expect(t.kind).toBe('clarify')
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
  })

  it('sends Anthropic-specific headers including the browser-access flag', async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse('{"kind":"clarify","ready":true,"confidence":1}'),
    )
    await callLlm(config, [{ role: 'user', content: 'hi' }])
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers['x-api-key']).toBe('sk-ant-test')
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('lifts system messages into the top-level system field', async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse('{"kind":"clarify","ready":true,"confidence":1}'),
    )
    await callLlm(config, [
      { role: 'system', content: 'SYS_PROMPT' },
      { role: 'user', content: 'hi' },
    ])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.system).toBe('SYS_PROMPT')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    expect(body.max_tokens).toBeGreaterThan(0)
  })

  it('extracts JSON object even when wrapped with stray prose', async () => {
    fetchMock.mockResolvedValueOnce(
      anthropicResponse(
        'Sure: {"kind":"clarify","ready":true,"confidence":0.9} — let me know.',
      ),
    )
    const t = await callLlm(config, [{ role: 'user', content: 'topic' }])
    expect(t.kind).toBe('clarify')
  })

  it('throws LlmError on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 401 }))
    await expect(callLlm(config, [{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(
      LlmError,
    )
  })
})
