import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import type { ByredTask } from "@/types/database"

type UserRow = {
  id: string
  name: string
  email: string
  role: string
}

type TenantRow = {
  id: string
  name: string
}

type TaskWithSignal = ByredTask & {
  signal: number
  tenant_name: string
  owner_name: string
}

function dateOnly(value: string | null) {
  if (!value) return null
  return value.includes("T") ? value.split("T")[0] : value
}

function formatDue(value: string | null) {
  const due = dateOnly(value)
  if (!due) return "No due date"
  return new Date(`${due}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOpen(task: ByredTask) {
  return task.status !== "done" && task.status !== "cancelled"
}

function isOverdue(task: ByredTask, today: string) {
  const due = dateOnly(task.due_date)
  return isOpen(task) && !!due && due < today
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;")
}

function scoreTask(task: ByredTask, today: string) {
  let score = 0
  if (task.priority === "critical") score += 100
  if (task.status === "blocked" || task.blocker_flag) score += 45
  if (isOverdue(task, today)) score += 35
  score += task.revenue_impact_score ?? 0
  score += task.urgency_score ?? 0
  return score
}

function buildCadence({
  tasks,
  kpTasks,
  today,
}: {
  tasks: TaskWithSignal[]
  kpTasks: TaskWithSignal[]
  today: string
}) {
  const blockers = tasks.filter((task) => task.status === "blocked" || task.blocker_flag)
  const overdue = tasks.filter((task) => isOverdue(task, today))
  const topTasks = tasks.slice(0, 12)
  const kpTopTasks = kpTasks.slice(0, 8)

  const subject = `Weekly Critical Cadence: ${topTasks.length} critical OS tasks`

  const textLines = [
    "Weekly Critical Cadence",
    "",
    `Critical open tasks: ${tasks.length}`,
    `KP-owned critical tasks: ${kpTasks.length}`,
    `Blocked critical tasks: ${blockers.length}`,
    `Overdue critical tasks: ${overdue.length}`,
    "",
    "KP Do First:",
    ...(kpTopTasks.length > 0
      ? kpTopTasks.map((task, index) => `${index + 1}. ${task.title} - ${task.tenant_name} - ${task.owner_name} - due ${formatDue(task.due_date)} - ${task.status}`)
      : ["No KP-owned critical tasks found."]),
    "",
    "Team Critical Watchlist:",
    ...topTasks.map((task, index) => `${index + 1}. ${task.title} - ${task.tenant_name} - ${task.owner_name} - due ${formatDue(task.due_date)} - ${task.status}`),
    "",
    "Operating rule: clear tasks only with proof. Cancel stale unverified work instead of marking it done.",
    "Open dashboard: https://www.byredlanternos.com/os/my-dashboard",
  ]

  const listHtml = (items: TaskWithSignal[]) =>
    items.length > 0
      ? `<ol style="margin:0;padding-left:20px">${items
          .map(
            (task) => `
              <li style="margin:0 0 10px">
                <strong>${escapeHtml(task.title)}</strong><br />
                <span style="color:#555">${escapeHtml(task.tenant_name)} - ${escapeHtml(task.owner_name)} - due ${escapeHtml(formatDue(task.due_date))} - ${escapeHtml(task.status)}</span>
              </li>
            `
          )
          .join("")}</ol>`
      : `<p style="margin:0;color:#555">No KP-owned critical tasks found.</p>`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111">
      <h1 style="margin:0 0 8px;font-size:22px">Weekly Critical Cadence</h1>
      <p style="margin:0 0 20px;color:#555">Critical execution tasks for the week of ${escapeHtml(formatDue(today))}.</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 22px">
        <div style="padding:12px;background:#f6f6f6;border-radius:8px"><strong>${tasks.length}</strong><br /><span style="font-size:12px;color:#666">Critical</span></div>
        <div style="padding:12px;background:#f6f6f6;border-radius:8px"><strong>${kpTasks.length}</strong><br /><span style="font-size:12px;color:#666">KP-owned</span></div>
        <div style="padding:12px;background:#f6f6f6;border-radius:8px"><strong>${blockers.length}</strong><br /><span style="font-size:12px;color:#666">Blocked</span></div>
        <div style="padding:12px;background:#f6f6f6;border-radius:8px"><strong>${overdue.length}</strong><br /><span style="font-size:12px;color:#666">Overdue</span></div>
      </div>
      <h2 style="font-size:16px;margin:0 0 10px">KP Do First</h2>
      ${listHtml(kpTopTasks)}
      <h2 style="font-size:16px;margin:22px 0 10px">Team Critical Watchlist</h2>
      ${listHtml(topTasks)}
      <p style="margin:22px 0 0;padding:12px;background:#fff5f5;border-left:4px solid #D7261E;color:#333">
        Operating rule: clear tasks only with proof. Cancel stale unverified work instead of marking it done.
      </p>
      <p style="margin:20px 0 0">
        <a href="https://www.byredlanternos.com/os/my-dashboard" style="display:inline-block;background:#D7261E;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-weight:700">
          Open My Dashboard
        </a>
      </p>
    </div>
  `

  return { subject, text: textLines.join("\n"), html }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split("T")[0]

  try {
    const [usersRes, tenantsRes, tasksRes] = await Promise.all([
      ((supabase as any)
        .from("byred_users")
        .select("id, name, email, role")
        .eq("active", true)
        .order("name")) as Promise<{ data: UserRow[] | null; error: { message: string } | null }>,
      ((supabase as any)
        .from("byred_tenants")
        .select("id, name")
        .eq("active", true)
        .order("name")) as Promise<{ data: TenantRow[] | null; error: { message: string } | null }>,
      ((supabase as any)
        .from("byred_tasks")
        .select("*")
        .not("status", "in", "(done,cancelled)")) as Promise<{ data: ByredTask[] | null; error: { message: string } | null }>,
    ])

    if (usersRes.error) throw new Error(usersRes.error.message)
    if (tenantsRes.error) throw new Error(tenantsRes.error.message)
    if (tasksRes.error) throw new Error(tasksRes.error.message)

    const users = usersRes.data ?? []
    const tenants = tenantsRes.data ?? []
    const tasks = tasksRes.data ?? []
    const kp = users.find((user) => user.email === "clashon64@gmail.com")
      ?? users.find((user) => /keymon|kp/i.test(user.name))

    if (!kp) {
      return NextResponse.json({ error: "KP user profile not found" }, { status: 500 })
    }

    const userMap = new Map(users.map((user) => [user.id, user]))
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]))

    const criticalTasks = tasks
      .filter((task) => task.priority === "critical" || task.status === "blocked" || !!task.blocker_flag)
      .map((task) => ({
        ...task,
        signal: scoreTask(task, today),
        tenant_name: tenantMap.get(task.tenant_id)?.name ?? "Workspace",
        owner_name: task.owner_user_id ? userMap.get(task.owner_user_id)?.name ?? "Unassigned" : "Unassigned",
      }))
      .sort((a, b) => {
        const score = b.signal - a.signal
        if (score !== 0) return score
        return (dateOnly(a.due_date) ?? "9999-12-31").localeCompare(dateOnly(b.due_date) ?? "9999-12-31")
      })

    const kpTasks = criticalTasks.filter((task) => task.owner_user_id === kp.id)
    const cadence = buildCadence({ tasks: criticalTasks, kpTasks, today })
    const to = process.env.WEEKLY_CRITICAL_CADENCE_TO ?? kp.email
    const emailResult = await sendEmail({
      to,
      subject: cadence.subject,
      html: cadence.html,
      text: cadence.text,
    })

    const tenantId = criticalTasks[0]?.tenant_id ?? tenants[0]?.id
    if (tenantId) {
      await (supabase as any).from("os_agent_receipts").insert({
        created_by_user_id: kp.id,
        tenant_id: tenantId,
        receipt_type: "verification",
        source_surface: "Weekly Critical Cadence Agent",
        related_task_id: criticalTasks[0]?.id ?? null,
        related_project_id: null,
        summary: `Weekly critical cadence generated for ${criticalTasks.length} active critical/high-risk tasks and sent to ${to}.`,
        lesson: "Weekly cadence agents should read live OS task state, prioritize critical/blocking work, and keep proof status separate from task completion.",
        proof_url_or_path: "https://www.byredlanternos.com/os/my-dashboard",
        verification_status: "verified",
        agent_family: "web_app",
        framework_scope: "mindset_universal",
      })
    }

    return NextResponse.json({
      ok: true,
      sent: emailResult.ok,
      email: emailResult,
      recipient: to,
      stats: {
        critical: criticalTasks.length,
        kp_owned: kpTasks.length,
        blocked: criticalTasks.filter((task) => task.status === "blocked" || task.blocker_flag).length,
        overdue: criticalTasks.filter((task) => isOverdue(task, today)).length,
      },
    })
  } catch (error) {
    console.error("[weekly-critical-cadence]", error)
    return NextResponse.json({ error: "Failed to generate weekly critical cadence" }, { status: 500 })
  }
}
