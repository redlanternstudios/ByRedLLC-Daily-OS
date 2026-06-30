import fs from "node:fs"

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const index = trimmed.indexOf("=")
    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim()
    if (!key || process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }
}

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
