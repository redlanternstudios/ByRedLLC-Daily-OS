import { afterEach, describe, expect, it, vi } from "vitest"
import { getGroqModel, getOsAiProviderRegistry } from "@/lib/ai/provider-registry"

vi.mock("server-only", () => ({}))

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("OS AI provider registry", () => {
  it("keeps Gemini and DeepSeek optional complements when keys are missing", () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    process.env.OS_AI_COMPLEMENTARY_PROVIDERS = "gemini,deepseek"

    const providers = getOsAiProviderRegistry()
    const gemini = providers.find((provider) => provider.id === "gemini")
    const deepseek = providers.find((provider) => provider.id === "deepseek")

    expect(gemini?.role).toBe("complement")
    expect(gemini?.configured).toBe(false)
    expect(deepseek?.role).toBe("complement")
    expect(deepseek?.configured).toBe(false)
    expect(deepseek?.mutationAllowed).toBe(false)
  })

  it("marks complementary providers configured only when API keys are present", () => {
    process.env.GEMINI_API_KEY = "test-gemini-key"
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key"
    process.env.GEMINI_MODEL = "gemini-test-model"
    process.env.DEEPSEEK_MODEL = "deepseek-test-model"

    const providers = getOsAiProviderRegistry()

    expect(providers.find((provider) => provider.id === "gemini")).toMatchObject({
      configured: true,
      model: "gemini-test-model",
    })
    expect(providers.find((provider) => provider.id === "deepseek")).toMatchObject({
      configured: true,
      model: "deepseek-test-model",
    })
  })

  it("uses current open-weight and complementary defaults from the central registry", () => {
    delete process.env.GROQ_MODEL
    delete process.env.GEMINI_MODEL
    delete process.env.DEEPSEEK_MODEL

    const providers = getOsAiProviderRegistry()

    expect(getGroqModel()).toBe("openai/gpt-oss-120b")
    expect(providers.find((provider) => provider.id === "gemini")).toMatchObject({
      lane: "visual_context",
      model: "gemini-2.5-flash",
      mutationAllowed: false,
    })
    expect(providers.find((provider) => provider.id === "deepseek")).toMatchObject({
      lane: "code_review",
      model: "deepseek-v4-flash",
      mutationAllowed: false,
    })
  })
})
