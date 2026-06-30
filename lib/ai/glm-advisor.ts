import "server-only"

import { getGlmModel, getProviderById } from "@/lib/ai/provider-registry"

type GlmMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type GlmResponse = {
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

export type GlmAdvisorResult = {
  provider: "glm"
  model: string
  content: string
  usage: GlmResponse["usage"] | null
}

export function isGlmConfigured() {
  return Boolean(process.env.ZAI_API_KEY?.trim())
}

export async function runGlmAdvisor(messages: GlmMessage[]): Promise<GlmAdvisorResult> {
  const provider = getProviderById("glm")
  const apiKey = process.env.ZAI_API_KEY?.trim()

  if (!provider?.configured || !apiKey) {
    throw new Error("GLM / Z.AI is not configured")
  }

  const model = getGlmModel()
  const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1600,
      reasoning_effort: "high",
      response_format: { type: "json_object" },
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as GlmResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `GLM request failed with ${response.status}`)
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("GLM returned an empty response")
  }

  return {
    provider: "glm",
    model,
    content,
    usage: payload.usage ?? null,
  }
}
