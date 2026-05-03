import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ByredTask, ByredUser, ByredLead } from "@/types/database"

export type KPIOverduetask = {
  id: string
  title: string
  tenant_id: string
  tenant_name: string
  tenant_color: string
  priority: string
  due_date: string
  days_overdue: number
  owner_user_id: string | null
}

export type KPIPayload = {
  as_of: string
  ops: {
    total_active: number
    done_this_week: number
    overdue: number
    blockers: number
    completion_rate: number
    critical_count: number
    estimated_hours_at_risk: number
  }
  priority_mix: { critical: number; high: number; medium: number; low: number }
  by_tenant: Array<{
    tenant_id: string
    tenant_name: string
    tenant_color: string
    total: number
    done: number
    in_progress: number
    blocked: number
    overdue: number
    pct: number
  }>
  team: Array<{
    user_id: string
    name: string
    role: string
    total_active: number
    done_this_week: number
    has_blocker: boolean
    has_critical: boolean
    tenant_breakdown: Array<{
      tenant_id: string
      tenant_name: string
      tenant_color: string
      task_count: number
      has_blocker: boolean
    }>
  }>
  pipeline: Array<{
    stage: string
    count: number
    revenue_potential: number
  }>
  overdue_detail: KPIOverduetask[]
  velocity: Array<{
    date: string
    label: string
    completed: number
  }>
}

function tenantColorHex(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const byredUserId = (byredUserRaw as { id: string } | null)?.id
  if (!byredUserId) return NextResponse.json({ error: "No profile" }, { status: 403 })

  type MemberRow = { tenant_id: string; byred_tenants: { id: string; name: string; color: string } | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRows } = await (supabase as any)
    .from("byred_user_tenants")
    .select("tenant_id, byred_tenants(id, name, color)")
    .eq("user_id", byredUserId) as { data: MemberRow[] | null }
  const tenantRows = (memberRows ?? []).map((r) => {
    const t = r.byred_tenants
    return { id: t?.id ?? r.tenant_id, name: t?.name ?? r.tenant_id, color: tenantColorHex(t?.color ?? null) }
  })
  const tenantIds = tenantRows.map((t) => t.id)
  const tenantMap = new Map(tenantRows.map((t) => [t.id, t]))

  if (tenantIds.length === 0) {
    const empty: KPIPayload = {
      as_of: new Date().toISOString(),
      ops: { total_active: 0, done_this_week: 0, overdue: 0, blockers: 0, completion_rate: 0, critical_count: 0, estimated_hours_at_risk: 0 },
      priority_mix: { critical: 0, high: 0, medium: 0, low: 0 },
      by_tenant: [], team: [], pipeline: [], overdue_detail: [], velocity: [],
    }
    return NextResponse.json(empty)
  }

  const today = new Date().toISOString().split("T")[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [tasksRes, teamRes, leadsRes] = await Promise.all([
    supabase.from("byred_tasks").select("*").in("tenant_id", tenantIds),
    supabase.from("byred_users").select("id, name, role").eq("active", true),
    supabase.from("byred_leads").select("stage, revenue_potential, tenant_id").in("tenant_id", tenantIds),
  ])

  const allTasks = (tasksRes.data as ByredTask[] | null) ?? []
  const teamMembers = (teamRes.data as Pick<ByredUser, "id" | "name" | "role">[] | null) ?? []
  const leads = (leadsRes.data as Pick<ByredLead, "stage" | "revenue_potential" | "tenant_id">[] | null) ?? []

  const activeTasks = allTasks.filter((t) => t.status !== "cancelled" && t.status !== "done")
  const doneTasks = allTasks.filter((t) => t.status === "done")
  const doneThisWeek = doneTasks.filter((t) => (t.updated_at ?? t.created_at ?? "") >= weekAgo)
  const overdueTasks = activeTasks.filter((t) => t.due_date && t.due_date < today)
  const blockerTasks = activeTasks.filter((t) => t.blocker_flag)
  const criticalTasks = activeTasks.filter((t) => t.priority === "critical")

  const atRiskMinutes = [...new Map([...overdueTasks, ...blockerTasks].map((t) => [t.id, t])).values()]
    .reduce((s, t) => s + (t.estimated_minutes ?? 30), 0)

  const ops: KPIPayload["ops"] = {
    total_active: activeTasks.length,
    done_this_week: doneThisWeek.length,
    overdue: overdueTasks.length,
    blockers: blockerTasks.length,
    completion_rate: allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.filter((t) => t.status !== "cancelled").length) * 100) : 0,
    critical_count: criticalTasks.length,
    estimated_hours_at_risk: Math.round(atRiskMinutes / 6) / 10,
  }

  const byTenant: KPIPayload["by_tenant"] = tenantRows.map((tenant) => {
    const tt = allTasks.filter((t) => t.tenant_id === tenant.id && t.status !== "cancelled")
    const tdone = tt.filter((t) => t.status === "done")
    const total = tt.length
    return {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      tenant_color: tenant.color,
      total,
      done: tdone.length,
      in_progress: tt.filter((t) => t.status === "in_progress").length,
      blocked: tt.filter((t) => t.blocker_flag).length,
      overdue: tt.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length,
      pct: total > 0 ? Math.round((tdone.length / total) * 100) : 0,
    }
  }).filter((t) => t.total > 0).sort((a, b) => b.total - a.total)

  const team: KPIPayload["team"] = teamMembers.map((u) => {
    const memberActive = activeTasks.filter((t) => t.owner_user_id === u.id)
    const memberDone = doneTasks.filter((t) => t.owner_user_id === u.id && (t.updated_at ?? t.created_at ?? "") >= weekAgo)

    const tenantCounts = new Map<string, { count: number; hasBlocker: boolean }>()
    for (const task of memberActive) {
      const ex = tenantCounts.get(task.tenant_id) ?? { count: 0, hasBlocker: false }
      tenantCounts.set(task.tenant_id, { count: ex.count + 1, hasBlocker: ex.hasBlocker || (task.blocker_flag ?? false) })
    }
    const tenant_breakdown = Array.from(tenantCounts.entries())
      .map(([tid, { count, hasBlocker }]) => {
        const t = tenantMap.get(tid)
        return { tenant_id: tid, tenant_name: t?.name ?? tid, tenant_color: t?.color ?? "#D7261E", task_count: count, has_blocker: hasBlocker }
      })
      .sort((a, b) => b.task_count - a.task_count)

    return {
      user_id: u.id,
      name: u.name,
      role: u.role,
      total_active: memberActive.length,
      done_this_week: memberDone.length,
      has_blocker: memberActive.some((t) => t.blocker_flag),
      has_critical: memberActive.some((t) => t.priority === "critical"),
      tenant_breakdown,
    }
  }).filter((u) => u.total_active > 0 || u.done_this_week > 0)
    .sort((a, b) => b.total_active - a.total_active)

  const stageOrder = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST"]
  const pipelineMap = new Map<string, { count: number; revenue: number }>()
  for (const lead of leads) {
    const stage = lead.stage ?? "NEW"
    const ex = pipelineMap.get(stage) ?? { count: 0, revenue: 0 }
    pipelineMap.set(stage, { count: ex.count + 1, revenue: ex.revenue + (lead.revenue_potential ?? 0) })
  }
  const pipeline: KPIPayload["pipeline"] = stageOrder
    .filter((s) => pipelineMap.has(s))
    .map((s) => ({ stage: s, count: pipelineMap.get(s)!.count, revenue_potential: pipelineMap.get(s)!.revenue }))

  const overdue_detail: KPIPayload["overdue_detail"] = overdueTasks
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 20)
    .map((t) => {
      const tenant = tenantMap.get(t.tenant_id)
      const daysOver = Math.floor((Date.now() - new Date(t.due_date! + "T00:00:00").getTime()) / 86400000)
      return {
        id: t.id,
        title: t.title,
        tenant_id: t.tenant_id,
        tenant_name: tenant?.name ?? t.tenant_id,
        tenant_color: tenant?.color ?? "#D7261E",
        priority: t.priority,
        due_date: t.due_date!,
        days_overdue: daysOver,
        owner_user_id: t.owner_user_id,
      }
    })

  // 14-day velocity
  const velocityMap = new Map<string, number>()
  const dayLabels = new Map<string, string>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split("T")[0]
    velocityMap.set(key, 0)
    dayLabels.set(key, d.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
  }
  for (const t of doneTasks) {
    const completedDate = (t.updated_at ?? t.created_at ?? "").split("T")[0]
    if (velocityMap.has(completedDate)) {
      velocityMap.set(completedDate, (velocityMap.get(completedDate) ?? 0) + 1)
    }
  }
  const velocity: KPIPayload["velocity"] = Array.from(velocityMap.entries()).map(([date, completed]) => ({
    date,
    label: dayLabels.get(date) ?? date,
    completed,
  }))

  const priority_mix = {
    critical: activeTasks.filter((t) => t.priority === "critical").length,
    high: activeTasks.filter((t) => t.priority === "high").length,
    medium: activeTasks.filter((t) => t.priority === "medium").length,
    low: activeTasks.filter((t) => t.priority === "low").length,
  }

  const payload: KPIPayload = { as_of: new Date().toISOString(), ops, priority_mix, by_tenant: byTenant, team, pipeline, overdue_detail, velocity }
  return NextResponse.json(payload)
}
