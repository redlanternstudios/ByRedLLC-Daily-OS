import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mapTaskFromDb } from "@/types/db"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [usersRes, tasksRes] = await Promise.all([
      supabase.from("byred_users").select("id, name, role, avatar_url").eq("active", true).order("name"),
      supabase.from("byred_tasks").select("*").not("status", "in", '("done","cancelled")'),
    ])

    const users = usersRes.data ?? []
    const tasks = (tasksRes.data ?? []).map(mapTaskFromDb)

    const team = users.map((u) => {
      const memberTasks = tasks.filter((t) => t.owner_user_id === u.id)
      const hasBlocker = memberTasks.some((t) => t.blocker_flag)
      const hasCritical = memberTasks.some((t) => t.priority === "critical")
      const status = hasBlocker ? "blocked" : hasCritical ? "at_risk" : "on_track"
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        avatar_url: u.avatar_url,
        taskCount: memberTasks.length,
        tasks: memberTasks.slice(0, 10),
        status,
      }
    })

    return NextResponse.json({ team })
  } catch {
    return NextResponse.json({ team: [] }, { status: 500 })
  }
}
