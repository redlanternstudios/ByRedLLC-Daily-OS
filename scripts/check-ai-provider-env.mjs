const providers = [
  { label: "Groq", key: "GROQ_API_KEY", model: "GROQ_MODEL", fallback: "openai/gpt-oss-120b" },
  { label: "Gemini", key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  { label: "DeepSeek", key: "DEEPSEEK_API_KEY", model: "DEEPSEEK_MODEL", fallback: "deepseek-v4-flash" },
  { label: "GLM / Z.AI", key: "ZAI_API_KEY", model: "GLM_MODEL", fallback: "glm-5.2" },
]

for (const provider of providers) {
  const hasKey = Boolean(process.env[provider.key]?.trim())
  const model = process.env[provider.model]?.trim() || provider.fallback || "default"
  console.log(`${provider.label}: ${hasKey ? "configured" : "missing"} (${provider.model}=${model})`)
}

console.log("Rule: provider keys must stay separate and must never use NEXT_PUBLIC_* names.")
