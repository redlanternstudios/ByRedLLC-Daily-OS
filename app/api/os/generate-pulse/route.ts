import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { mapTaskFromDb } from "@/types/db"
import { generateText } from "ai"
import type { ByredTask } from "@/types/database"

// Enterprise-grade: retry wrapper for LLM calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[generate-pulse] Attempt ${attempt}/${maxAttempts} failed:`, lastError.message)
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt)) // Exponential backoff
      }
    }
  }
  throw lastError
}

export async function POST() {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Enterprise: Authentication check - only authenticated users can generate pulses
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error("[generate-pulse] Auth failed:", authError?.message)
      return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 })
    }
    
    const sa = supabase as any

    // Enterprise: Check for recent pulse to prevent spam (rate limit: 1 per 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentPulses } = await sa
      .from("byred_daily_briefs")
      .select("id, created_at")
      .is("user_id", null)
      .gte("created_at", fiveMinutesAgo)
      .limit(1)
    
    if (recentPulses?.length > 0) {
      const lastPulseTime = new Date(recentPulses[0].created_at)
      const waitSeconds = Math.ceil((5 * 60 * 1000 - (Date.now() - lastPulseTime.getTime())) / 1000)
      return NextResponse.json({ 
        error: `Rate limited — a pulse was generated recently. Please wait ${waitSeconds}s.` 
      }, { status: 429 })
    }

    // Fetch data in parallel
    const [usersRes, tasksRes] = await Promise.all([
      sa
        .from("byred_users")
        .select("id, name, role")
        .eq("active", true)
        .order("name") as Promise<{ data: Array<{ id: string; name: string; role: string }> | null; error: any }>,
      sa
        .from("byred_tasks")
        .select("*")
        .not("status", "in", "(done,cancelled)") as Promise<{ data: ByredTask[] | null; error: any }>,
    ])

    if (usersRes.error) throw new Error(`Failed to fetch users: ${usersRes.error.message}`)
    if (tasksRes.error) throw new Error(`Failed to fetch tasks: ${tasksRes.error.message}`)

    const users = usersRes.data ?? []
    const tasks = (tasksRes.data ?? []).map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.status === "blocked" || t.blocker_flag)

    if (users.length === 0) {
      return NextResponse.json({ error: "No active team members found" }, { status: 400 })
    }

    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? "Morning Standup" : hour >= 17 ? "Evening Sync" : "Midday Check"

    const team = users.map((u) => {
      const memberTasks = tasks.filter((t) => t.owner_user_id === u.id)
      const hasBlocker = memberTasks.some((t) => t.status === "blocked" || t.blocker_flag)
      const hasCritical = memberTasks.some((t) => t.priority === "critical" && t.status !== "done")
      return {
        name: u.name,
        role: u.role,
        taskCount: memberTasks.length,
        status: hasBlocker ? "BLOCKED" : hasCritical ? "AT RISK" : "ON TRACK",
      }
    })

    const prompt = `You are the operations voice for By Red, LLC.
Generate a concise ${timeOfDay} team pulse for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

TEAM (${team.length} members):
${team.map((m) => `  ${m.name} (${m.role}) — ${m.taskCount} active tasks — ${m.status}`).join("\n")}

ACTIVE TASKS: ${tasks.length} total
BLOCKERS: ${blockers.length}${blockers.length > 0 ? "\n" + blockers.map((b) => `  - ${b.title}${b.blocker_reason ? `: ${b.blocker_reason}` : ""}`).join("\n") : ""}

Write 3-4 sentences as a spoken team update. Be direct and actionable. Flag blockers urgently. End with the single most important next action.`

    // Enterprise: retry LLM call up to 3 times with exponential backoff
    const { text } = await withRetry(
      () => generateText({
        model: "groq/llama-3.3-70b-versatile",
        prompt,
        maxTokens: 300,
      }),
      3,
      1000
    )

    if (!text || text.trim().length < 20) {
      throw new Error("LLM returned empty or invalid response")
    }

    const today = new Date().toISOString().split("T")[0]
    const now = new Date().toISOString()
    
    // Use admin client to bypass RLS for team-wide pulse insert (user_id = NULL)
    // Enterprise: Pre-check for service role key before attempting insert
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[generate-pulse] SUPABASE_SERVICE_ROLE_KEY is not configured")
      return NextResponse.json({ 
        error: "Server configuration error — admin key not set. Contact administrator.",
        pulse: text, // Still return the generated text so it's not wasted
      }, { status: 503 })
    }
    
    const adminClient = createAdminClient()
    
    const { error: insertError } = await adminClient.from("byred_daily_briefs").insert({
      user_id: null,
      date: today,
      summary: {
        text,
        time_of_day: timeOfDay,
        task_count: tasks.length,
        blocker_count: blockers.length,
        generated_at: now,
        generated_by: "manual",
        team,
      },
    })

    if (insertError) {
      console.error("[generate-pulse] Insert failed:", insertError)
      throw new Error(`Failed to save pulse: ${insertError.message}`)
    }

    const duration = Date.now() - startTime
    console.log(`[generate-pulse] Success in ${duration}ms — ${tasks.length} tasks, ${blockers.length} blockers`)

    return NextResponse.json({
      ok: true,
      timeOfDay,
      pulse: text,
      stats: { tasks: tasks.length, blockers: blockers.length, team: team.length },
      duration,
    })
  } catch (err) {
    const duration = Date.now() - startTime
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[generate-pulse] POST failed after ${duration}ms:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
