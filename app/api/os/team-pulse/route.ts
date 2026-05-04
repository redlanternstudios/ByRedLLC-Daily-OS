import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { mapTaskFromDb } from "@/types/db"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

// GET — fetch last 7 days of team pulse records
export async function GET() {
  try {
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const since = new Date()
    since.setDate(since.getDate() - 7)
    const sinceStr = since.toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("byred_daily_briefs")
      .select("id, date, summary, created_at")
      .is("user_id", null)
      .gte("date", sinceStr)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Filter to only pulses that belong to one of the user's tenants
    // (byred_daily_briefs has no tenant_id — team pulses are global, so return all)
    return NextResponse.json({ pulses: data ?? [] })
  } catch (err) {
    console.error("[v0] GET /api/os/team-pulse failed:", err)
    return NextResponse.json({ error: "Failed to fetch pulses" }, { status: 500 })
  }
}

// POST — manually trigger a new team pulse generation (same logic as cron)
export async function POST() {
  try {
    await requireTenantScope() // ensures user is authenticated
    const supabase = await createClient()

    const [usersRes, tasksRes] = await Promise.all([
      supabase.from("byred_users").select("id, name, role").eq("active", true).order("name"),
      supabase.from("byred_tasks").select("*").not("status", "in", "(done,cancelled)"),
    ])

    const users = usersRes.data ?? []
    const tasks = (tasksRes.data ?? []).map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.blocker_flag)

    // Determine time of day in PST (UTC-8 standard, UTC-7 daylight)
    const nowUTC = new Date()
    const pstOffset = -8 * 60 // use standard PST; close enough for display purposes
    const pstHour = ((nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + pstOffset + 1440) % 1440) / 60
    const timeOfDay = pstHour < 12 ? "Morning Standup" : "Evening Sync"

    const team = users.map((u) => {
      const memberTasks = tasks.filter((t) => t.owner_user_id === u.id)
      const hasBlocker = memberTasks.some((t) => t.blocker_flag)
      const hasCritical = memberTasks.some((t) => t.priority === "critical")
      return {
        name: u.name,
        role: u.role,
        taskCount: memberTasks.length,
        status: hasBlocker ? "BLOCKED" : hasCritical ? "AT RISK" : "ON TRACK",
      }
    })

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

    const dateLabel = nowUTC.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
    })

    const prompt = `You are the operations voice for By Red, LLC.
Generate a concise ${timeOfDay} team pulse for ${dateLabel}.

TEAM (${team.length} members):
${team.map((m) => `  ${m.name} (${m.role}) — ${m.taskCount} active tasks — ${m.status}`).join("\n")}

ACTIVE TASKS: ${tasks.length} total
BLOCKERS: ${blockers.length}${blockers.length > 0 ? "\n" + blockers.map((b) => `  - ${b.title}${b.blocker_reason ? `: ${b.blocker_reason}` : ""}`).join("\n") : ""}

Write 3-4 sentences as a spoken team update. Be direct and actionable. Flag blockers urgently. End with the single most important next action.`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      maxTokens: 300,
    })

    const today = nowUTC.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }) // YYYY-MM-DD in PST

    // Delete any existing pulse for today then insert fresh
    await supabase
      .from("byred_daily_briefs")
      .delete()
      .is("user_id", null)
      .eq("date", today)

    const { data: inserted, error: insertError } = await supabase
      .from("byred_daily_briefs")
      .insert({
        user_id: null,
        date: today,
        summary: {
          text,
          time_of_day: timeOfDay,
          task_count: tasks.length,
          blocker_count: blockers.length,
          generated_at: nowUTC.toISOString(),
          generated_by: "manual",
          team,
        },
      })
      .select("id, date, summary, created_at")
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ pulse: inserted })
  } catch (err) {
    console.error("[v0] POST /api/os/team-pulse failed:", err)
    return NextResponse.json({ error: "Failed to generate pulse" }, { status: 500 })
  }
}
