import { NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const BUCKET_KEYS = ["critical_now", "money_moves", "quick_wins", "coming_up", "deep_work"] as const
const BUCKET_DESCRIPTIONS = {
  critical_now: "Blocked tasks, critical priority, or overdue",
  money_moves: "Revenue-generating work — HireWire, Paradise, client-facing",
  quick_wins: "Fast tasks under 30 minutes with no dependencies",
  coming_up: "Due in the next 3 days, needs awareness",
  deep_work: "Focus/research/building — no urgent deadline, needs 90+ min",
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { tasks } = await req.json()
    const activeTasks = (tasks ?? []).filter(
      (t: { status: string }) => t.status !== "done" && t.status !== "cancelled"
    ).slice(0, 40)

    if (activeTasks.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const taskList = activeTasks.map((t: {
      id: string; title: string; priority: string; status: string;
      estimated_minutes?: number; due_date?: string; blocker_flag?: boolean; revenue_impact_score?: number
    }) =>
      `ID:${t.id} | ${t.title} | priority:${t.priority} | status:${t.status}` +
      `${t.estimated_minutes ? ` | est:${t.estimated_minutes}min` : ""}` +
      `${t.due_date ? ` | due:${t.due_date}` : ""}` +
      `${t.blocker_flag ? " | BLOCKED" : ""}` +
      `${t.revenue_impact_score != null ? ` | revenue:${t.revenue_impact_score}/10` : ""}`
    ).join("\n")

    const bucketDesc = BUCKET_KEYS.map((k) => `  - ${k}: ${BUCKET_DESCRIPTIONS[k]}`).join("\n")

    const prompt = `You are triaging tasks for Keymon Penn's daily operations. Assign each task to the most appropriate bucket.

BUCKETS:
${bucketDesc}

TASKS:
${taskList}

Respond with a JSON object ONLY (no markdown):
{
  "suggestions": [
    { "taskId": "<id>", "bucket": "<bucket_key>", "reason": "<one short sentence why>" }
  ]
}

Every task must appear exactly once. Use the exact task IDs provided.`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      maxTokens: 1500,
    })

    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    // Validate bucket keys
    const validated = (parsed.suggestions ?? []).filter(
      (s: { bucket: string }) => (BUCKET_KEYS as readonly string[]).includes(s.bucket)
    )

    return NextResponse.json({ suggestions: validated })
  } catch (err) {
    console.error("[triage route]", err)
    return NextResponse.json({ error: "Triage failed" }, { status: 500 })
  }
}
