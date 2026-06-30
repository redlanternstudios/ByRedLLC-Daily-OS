import "server-only"

import { getDeepSeekModel, getProviderById } from "@/lib/ai/provider-registry"

type DeepSeekMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: {
    message?: string
  }
}

export type DeepSeekAdvisorResult = {
  provider: "deepseek"
  model: string
  content: string
  usage: DeepSeekResponse["usage"] | null
}

export function isDeepSeekConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
}

export async function runDeepSeekAdvisor(messages: DeepSeekMessage[]): Promise<DeepSeekAdvisorResult> {
  const provider = getProviderById("deepseek")
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()

  if (!provider?.configured || !apiKey) {
    throw new Error("DeepSeek is not configured")
  }

  const model = getDeepSeekModel()
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1600,
      response_format: { type: "json_object" },
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as DeepSeekResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `DeepSeek request failed with ${response.status}`)
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("DeepSeek returned an empty response")
  }

  return {
    provider: "deepseek",
    model,
    content,
    usage: payload.usage ?? null,
  }
}
