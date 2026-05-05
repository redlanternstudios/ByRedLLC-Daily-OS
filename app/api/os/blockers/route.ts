import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const sa = supabase as any

    const [tasksRes, usersRes, tenantsRes] = await Promise.all([
      sa
        .from("byred_tasks")
        .select("id, title, status, priority, due_date, blocker_reason, blocked_by_task_id, tenant_id, owner_user_id, created_at, updated_at")
        .or("status.eq.blocked,blocker_flag.eq.true")
        .order("priority") as Promise<{ data: any[] | null }>,
      sa
        .from("byred_users")
        .select("id, name, role, avatar_url")
        .eq("active", true) as Promise<{ data: any[] | null }>,
      sa
        .from("byred_tenants")
        .select("id, name") as Promise<{ data: any[] | null }>,
    ])

    const blockedTasks = tasksRes.data ?? []
    const users = usersRes.data ?? []
    const tenants = tenantsRes.data ?? []

    // Resolve dependency links
    const blockingIds = blockedTasks.map((t: any) => t.blocked_by_task_id).filter(Boolean)
    let blockingTasks: any[] = []
    if (blockingIds.length > 0) {
      const { data } = await sa
        .from("byred_tasks")
        .select("id, title, status, owner_user_id")
        .in("id", blockingIds)
      blockingTasks = data ?? []
    }

    const today = new Date().toISOString().split("T")[0]

    const enriched = blockedTasks.map((t: any) => {
      const blockingTask = blockingTasks.find((bt: any) => bt.id === t.blocked_by_task_id) ?? null
      return {
        ...t,
        owner: users.find((u: any) => u.id === t.owner_user_id) ?? null,
        project: tenants.find((ten: any) => ten.id === t.tenant_id) ?? null,
        blocking_task: blockingTask
          ? {
              ...blockingTask,
              owner: users.find((u: any) => u.id === blockingTask.owner_user_id) ?? null,
            }
          : null,
        days_overdue: t.due_date && t.due_date < today
          ? Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86400000)
          : 0,
      }
    })

    // Group by owner
    const ownerMap: Record<string, { owner: any; tasks: any[] }> = {}
    const unassigned: any[] = []
    for (const task of enriched) {
      if (!task.owner) {
        unassigned.push(task)
      } else {
        if (!ownerMap[task.owner.id]) ownerMap[task.owner.id] = { owner: task.owner, tasks: [] }
        ownerMap[task.owner.id].tasks.push(task)
      }
    }

    return NextResponse.json({
      blockers: enriched,
      grouped: Object.values(ownerMap),
      unassigned,
      stats: {
        total: enriched.length,
        critical: enriched.filter((t: any) => t.priority === "critical").length,
        ownersAffected: Object.keys(ownerMap).length + (unassigned.length > 0 ? 1 : 0),
        overdue: enriched.filter((t: any) => t.days_overdue > 0).length,
      },
    })
  } catch (err) {
    console.error("[blockers] GET failed:", err)
    return NextResponse.json({ error: "Failed to load blockers" }, { status: 500 })
  }
}
