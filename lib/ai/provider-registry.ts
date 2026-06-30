import "server-only"

export type OsAiProviderId = "anthropic" | "groq" | "gemini" | "deepseek" | "glm"
export type OsAiProviderRole = "primary" | "complement" | "fallback"
export type OsAiProviderLane = "operator" | "fast_brief" | "visual_context" | "code_review" | "agentic_engineering"

export type OsAiProviderConfig = {
  id: OsAiProviderId
  label: string
  role: OsAiProviderRole
  lane: OsAiProviderLane
  configured: boolean
  model: string
  envKey: string
  mutationAllowed: boolean
  strengths: string[]
  failureMode: string
  verificationRule: string
}

const DEFAULT_MODELS: Record<OsAiProviderId, string> = {
  anthropic: "claude-sonnet-4-6",
  groq: "openai/gpt-oss-120b",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash",
  glm: "glm-5.2",
}

const PROVIDER_META: Record<OsAiProviderId, Omit<OsAiProviderConfig, "role" | "configured" | "model">> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    lane: "operator",
    envKey: "ANTHROPIC_API_KEY",
    mutationAllowed: false,
    strengths: ["default planning", "LanternAI communication", "structured PM reasoning"],
    failureMode: "Core AI routes should return a controlled error, not break OS navigation.",
    verificationRule: "Outputs need receipt-backed OS context and Codex verification before execution.",
  },
  groq: {
    id: "groq",
    label: "Groq",
    lane: "fast_brief",
    envKey: "GROQ_API_KEY",
    mutationAllowed: false,
    strengths: ["fast daily briefs", "low-latency summaries", "open-weight quick triage"],
    failureMode: "Brief generation can be skipped while task and dashboard data remain available.",
    verificationRule: "Use for summaries and triage only; never close, assign, or mutate tasks directly.",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    lane: "visual_context",
    envKey: "GEMINI_API_KEY",
    mutationAllowed: false,
    strengths: ["multimodal review", "large-context feature analysis", "dashboard UX critique"],
    failureMode: "Feature-agent enhancements are disabled; verified receipts and manual workflow still work.",
    verificationRule: "Use for screenshots, PDFs, and large context; Codex must verify before implementation.",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    lane: "code_review",
    envKey: "DEEPSEEK_API_KEY",
    mutationAllowed: false,
    strengths: ["code reasoning", "cost-aware implementation review", "second-pass refactor suggestions"],
    failureMode: "Code-review assistance is disabled; existing Codex/GitHub flow remains intact.",
    verificationRule: "Use for implementation plans, bug hypotheses, and second-pass reviews; Codex executes and verifies.",
  },
  glm: {
    id: "glm",
    label: "GLM / Z.AI",
    lane: "agentic_engineering",
    envKey: "ZAI_API_KEY",
    mutationAllowed: false,
    strengths: ["long-horizon agentic engineering", "large-context code reasoning", "controlled reasoning effort"],
    failureMode: "GLM advisor assistance is disabled; Codex and other configured providers continue working.",
    verificationRule: "Use for long-context implementation strategy and agentic engineering review; Codex executes and verifies.",
  },
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function parseProviderList(value: string | undefined): OsAiProviderId[] {
  if (!value) return ["gemini", "deepseek", "glm"]

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is OsAiProviderId => item in PROVIDER_META)
}

function modelFor(provider: OsAiProviderId) {
  const envName = `${provider.toUpperCase()}_MODEL`
  return process.env[envName] || DEFAULT_MODELS[provider]
}

export function getOsAiProviderRegistry(): OsAiProviderConfig[] {
  const primary = (process.env.OS_AI_PRIMARY_PROVIDER?.toLowerCase() || "anthropic") as OsAiProviderId
  const complements = new Set(parseProviderList(process.env.OS_AI_COMPLEMENTARY_PROVIDERS))

  return (Object.keys(PROVIDER_META) as OsAiProviderId[]).map((id) => {
    const meta = PROVIDER_META[id]
    const role: OsAiProviderRole = id === primary ? "primary" : complements.has(id) ? "complement" : "fallback"

    return {
      ...meta,
      role,
      configured: hasValue(process.env[meta.envKey]),
      model: modelFor(id),
    }
  })
}

export function getConfiguredComplementaryProviders() {
  return getOsAiProviderRegistry().filter((provider) => provider.role === "complement" && provider.configured)
}

export function getProviderById(id: OsAiProviderId) {
  return getOsAiProviderRegistry().find((provider) => provider.id === id) ?? null
}

export function getGroqModel() {
  return modelFor("groq")
}

export function getDeepSeekModel() {
  return modelFor("deepseek")
}

export function getGlmModel() {
  return modelFor("glm")
}

export function getProviderStatusForClient() {
  return getOsAiProviderRegistry().map(({ envKey: _envKey, ...provider }) => provider)
}
