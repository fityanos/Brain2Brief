import { AssistantTurnSchema, type AssistantTurn } from './slideSchema'
import { buildRetryMessage } from './prompts'
import { generateMockTurn, mockLatencyMs } from './mockProvider'

export type Provider = 'openai-compatible' | 'anthropic' | 'mock'

export interface LlmConfig {
  provider: Provider
  baseUrl: string
  apiKey: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class LlmError extends Error {
  cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'LlmError'
    this.cause = cause
  }
}

interface OpenAiCompletionResponse {
  choices: Array<{ message: { content: string | null } }>
}

interface AnthropicMessagesResponse {
  content: Array<{ type: string; text?: string }>
}

async function callOpenAiCompatible(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const url = config.baseUrl.replace(/\/$/, '') + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new LlmError(`LLM request failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as OpenAiCompletionResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new LlmError('LLM returned empty content')
  return content
}

async function callAnthropic(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const url = config.baseUrl.replace(/\/$/, '') + '/messages'

  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.4,
      system: systemParts.join('\n\n') || undefined,
      messages: turns,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new LlmError(
      `Anthropic request failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`,
    )
  }

  const data = (await res.json()) as AnthropicMessagesResponse
  const text = data.content?.find((b) => b.type === 'text')?.text
  if (!text) throw new LlmError('Anthropic returned no text content')
  return text
}

async function callOnce(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  if (config.provider === 'mock') {
    await new Promise((r) => setTimeout(r, mockLatencyMs()))
    if (signal?.aborted) throw new LlmError('Aborted')
    return JSON.stringify(generateMockTurn(messages))
  }
  return config.provider === 'anthropic'
    ? callAnthropic(config, messages, signal)
    : callOpenAiCompatible(config, messages, signal)
}

export function stripJsonFences(raw: string): string {
  const trimmed = raw.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()
  return trimmed
}

export function extractJsonObject(raw: string): string {
  const cleaned = stripJsonFences(raw)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1)
  return cleaned
}

export function parseAssistantTurn(raw: string): AssistantTurn {
  const cleaned = extractJsonObject(raw)
  const json = JSON.parse(cleaned)
  return AssistantTurnSchema.parse(json)
}

export async function callLlm(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<AssistantTurn> {
  const raw = await callOnce(config, messages, signal)
  try {
    return parseAssistantTurn(raw)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: buildRetryMessage(errMsg) },
    ]
    const retryRaw = await callOnce(config, retryMessages, signal)
    try {
      return parseAssistantTurn(retryRaw)
    } catch (retryErr) {
      throw new LlmError(
        `Could not parse LLM response after one retry. Last error: ${
          retryErr instanceof Error ? retryErr.message : String(retryErr)
        }`,
        retryErr,
      )
    }
  }
}
