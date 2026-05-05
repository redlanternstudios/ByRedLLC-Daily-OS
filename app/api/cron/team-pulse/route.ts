import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { mapTaskFromDb } from "@/types/db"
import { generateText } from "ai"

// Vercel Cron: runs at 7:05am and 7:05pm PST daily (03:05 + 15:05 UTC)
// vercel.json schedule: "5 3,15 * * *"

export async function GET(request: Request) {
  // Verify this is a legitimate Vercel cron invocation
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const sa = supabase as any

    // Fetch all active tasks and users
    const [usersRes, tasksRes] = await Promise.all([
      sa.from("byred_users").select("id, name, role").eq("active", true).order("name") as Promise<{ data: Array<{ id: string; name: string; role: string }> | null }>,
      sa.from("byred_tasks").select("*").not("status", "in", "(done,cancelled)") as Promise<{ data: import("@/types/database").ByredTask[] | null }>,
    ])

    const users = usersRes.data ?? []
    const tasks = (tasksRes.data ?? []).map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.blocker_flag)

    const hour = new Date().getUTCHours()
    const timeOfDay = hour < 12 ? "Morning Standup" : "Evening Sync"

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

    const prompt = `You are the operations voice for By Red, LLC.
Generate a concise ${timeOfDay} team pulse for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

TEAM (${team.length} members):
${team.map((m) => `  ${m.name} (${m.role}) — ${m.taskCount} active tasks — ${m.status}`).join("\n")}

ACTIVE TASKS: ${tasks.length} total
BLOCKERS: ${blockers.length}${blockers.length > 0 ? "\n" + blockers.map((b) => `  - ${b.title}${b.blocker_reason ? `: ${b.blocker_reason}` : ""}`).join("\n") : ""}

Write 3-4 sentences as a spoken team update. Be direct and actionable. Flag blockers urgently. End with the single most important next action.`

    const { text } = await generateText({
      model: "groq/llama-3.3-70b-versatile",
      prompt,
      maxTokens: 300,
    })

    // Use admin client to bypass RLS for team-wide pulse insert (user_id = NULL)
    const adminClient = createAdminClient()
    const today = new Date().toISOString().split("T")[0]
    const now = new Date().toISOString()

    const { error: insertError } = await adminClient.from("byred_daily_briefs").insert({
      user_id: null,
      date: today,
      summary: {
        text,
        time_of_day: timeOfDay,
        task_count: tasks.length,
        blocker_count: blockers.length,
        generated_at: now,
        generated_by: "cron",
        team,
      },
    })

    if (insertError) {
      console.error("[cron/team-pulse] Insert failed:", insertError)
      throw new Error(`Failed to save pulse: ${insertError.message}`)
    }

    return NextResponse.json({
      ok: true,
      timeOfDay,
      pulse: text,
      stats: { tasks: tasks.length, blockers: blockers.length, team: team.length },
    })
  } catch (err) {
    console.error("[v0] Cron team-pulse failed:", err)
    return NextResponse.json({ error: "Failed to generate pulse" }, { status: 500 })
  }
}
