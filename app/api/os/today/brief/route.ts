import { NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { tasks, blockers, timeOfDay } = await req.json()

    const taskSummary = (tasks ?? []).slice(0, 30).map((t: {
      title: string; priority: string; status: string; due_date?: string; blocker_flag?: boolean
    }) =>
      `- [${t.priority?.toUpperCase() ?? "MEDIUM"}] ${t.title} (${t.status})${t.due_date ? ` — due ${t.due_date}` : ""}${t.blocker_flag ? " [BLOCKED]" : ""}`
    ).join("\n")

    const blockerSummary = (blockers ?? []).slice(0, 10).map((b: { title: string; blocker_reason?: string }) =>
      `- ${b.title}${b.blocker_reason ? `: ${b.blocker_reason}` : ""}`
    ).join("\n")

    const prompt = `You are Keymon Penn's operations assistant for By Red LLC. Generate a concise ${timeOfDay} brief.

ACTIVE TASKS:
${taskSummary || "No active tasks."}

BLOCKERS:
${blockerSummary || "No blockers."}

Respond with a JSON object ONLY (no markdown, no explanation) with this exact shape:
{
  "headline": "one sentence summary",
  "body": "2-3 sentence spoken brief Keymon can read aloud to his team",
  "top_3": ["first priority", "second priority", "third priority"],
  "warnings": ["warning if any"],
  "next_action": "single most important next step"
}`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      maxOutputTokens: 500,
    })

    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      ...parsed,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[brief route]", err)
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 })
  }
}
