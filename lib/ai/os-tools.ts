import "server-only"

import { z } from "zod"

// ─── Lantern AI write tools ───────────────────────────────────────────────────
//
// These give the AI chat partner full parity with what a human can do in the OS:
// create / edit / reassign / complete / cancel tasks, set blockers, add comments,
// and create projects. Every tool is bound to the caller's auth + tenant context
// and enforces tenant scoping in code (RLS is a backup, not the primary defense).
//
// Convention: tools accept human names (owner_name, project_name) and a task_query
// (title text), not UUIDs — the model works from the operational snapshot. Writes
// to tasks/comments use the request-scoped `supabase` client so RLS stays active;
// project bootstrap uses `admin` because creating a tenant + membership row would
// otherwise be blocked by RLS.

type TeamMember = { id: string; name: string; role: string; email: string }
type TenantRef = { id: string; name: string }

export type OsToolsCtx = {
  // Supabase clients are cast to `any` internally; accept them loosely to avoid
  // generic-arity friction between the server and admin client types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  profileId: string
  teamMembers: TeamMember[]
  tenantRows: TenantRef[]
}

const PRIORITY = ["critical", "high", "medium", "low"] as const
const STATUS = ["not_started", "in_progress", "blocked", "done", "cancelled"] as const
const AI_MODES = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"] as const

export function createOsTools(ctx: OsToolsCtx) {
  const { profileId, teamMembers, tenantRows } = ctx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = ctx.supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = ctx.admin as any
  const tenantIds = tenantRows.map((t) => t.id)
  const tenantName = (id: string) => tenantRows.find((t) => t.id === id)?.name ?? id

  // Resolve a person's name to a team member. Exact (case-insensitive) first, then prefix/substring.
  function resolveOwner(name?: string | null):
    | { ok: true; id: string | null; name: string }
    | { ok: false; msg: string } {
    if (!name || !name.trim()) return { ok: true, id: null, name: "unassigned" }
    const q = name.trim().toLowerCase()
    let hits = teamMembers.filter((m) => m.name.toLowerCase() === q)
    if (hits.length === 0) hits = teamMembers.filter((m) => m.name.toLowerCase().includes(q))
    if (hits.length === 1) return { ok: true, id: hits[0].id, name: hits[0].name }
    const roster = teamMembers.map((m) => m.name).join(", ")
    if (hits.length === 0) return { ok: false, msg: `No team member matches "${name}". Team: ${roster}.` }
    return { ok: false, msg: `"${name}" is ambiguous (${hits.map((h) => h.name).join(", ")}). Be specific.` }
  }

  // Resolve a project name to a tenant the caller belongs to.
  function resolveProject(name: string):
    | { ok: true; id: string; name: string }
    | { ok: false; msg: string } {
    const q = name.trim().toLowerCase()
    let hits = tenantRows.filter((t) => t.name.toLowerCase() === q)
    if (hits.length === 0) hits = tenantRows.filter((t) => t.name.toLowerCase().includes(q))
    if (hits.length === 1) return { ok: true, id: hits[0].id, name: hits[0].name }
    const list = tenantRows.map((t) => t.name).join(", ")
    if (hits.length === 0) return { ok: false, msg: `No project matches "${name}". Projects: ${list}.` }
    return { ok: false, msg: `"${name}" is ambiguous (${hits.map((h) => h.name).join(", ")}). Be specific.` }
  }

  type TaskRow = { id: string; title: string; tenant_id: string; status: string; owner_user_id: string | null }

  // Find a single task by title text within the caller's tenants.
  async function findTask(query: string):
    | Promise<{ ok: true; task: TaskRow } | { ok: false; msg: string }> {
    if (tenantIds.length === 0) return { ok: false, msg: "You have no projects." }
    const { data } = (await supabase
      .from("byred_tasks")
      .select("id, title, tenant_id, status, owner_user_id")
      .in("tenant_id", tenantIds)
      .ilike("title", `%${query.trim()}%`)
      .neq("status", "cancelled")
      .limit(10)) as { data: TaskRow[] | null }
    const rows = data ?? []
    if (rows.length === 1) return { ok: true, task: rows[0] }
    if (rows.length === 0) return { ok: false, msg: `No active task matches "${query}".` }
    const opts = rows.map((r) => `"${r.title}" (${tenantName(r.tenant_id)})`).join("; ")
    return { ok: false, msg: `Multiple tasks match "${query}": ${opts}. Which one?` }
  }

  // Best-effort write to the OS activity feed. Never throws / never blocks the action.
  function logActivity(fields: {
    object_type: string
    object_id: string
    tenant_id: string
    type: string
    summary: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  }) {
    void (async () => {
      try {
        await admin.from("byred_activities").insert({ user_id: profileId, ...fields })
      } catch {
        /* non-blocking */
      }
    })()
  }

  return {
    create_task: {
      description:
        "Create a new task in a project. Use the project's name; resolve the owner from the team list. Executes immediately.",
      inputSchema: z.object({
        project_name: z.string().describe("Name of the project/tenant the task belongs to"),
        title: z.string().describe("Short task title"),
        description: z.string().optional().describe("Optional details / context"),
        owner_name: z.string().optional().describe("Team member to assign (defaults to unassigned)"),
        due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        priority: z.enum(PRIORITY).optional().describe("Defaults to medium"),
        ai_mode: z.enum(AI_MODES).optional().describe("Execution intent; defaults to HUMAN_ONLY"),
        estimated_minutes: z.number().optional().describe("Rough effort estimate"),
      }),
      execute: async (a: {
        project_name: string
        title: string
        description?: string
        owner_name?: string
        due_date?: string
        priority?: (typeof PRIORITY)[number]
        ai_mode?: (typeof AI_MODES)[number]
        estimated_minutes?: number
      }) => {
        const proj = resolveProject(a.project_name)
        if (!proj.ok) return proj.msg
        const owner = resolveOwner(a.owner_name)
        if (!owner.ok) return owner.msg

        const insertRow = {
          tenant_id: proj.id,
          title: a.title.trim(),
          description: a.description ?? null,
          status: "not_started",
          priority: a.priority ?? "medium",
          ai_mode: a.ai_mode ?? "HUMAN_ONLY",
          due_date: a.due_date ?? null,
          estimated_minutes: a.estimated_minutes ?? 30,
          owner_user_id: owner.id,
          created_by_user_id: profileId,
        }
        const { data, error } = await supabase
          .from("byred_tasks")
          .insert(insertRow)
          .select("id")
          .single()
        if (error) return `Create failed: ${error.message}`

        logActivity({
          object_type: "task",
          object_id: data.id,
          tenant_id: proj.id,
          type: "task_created",
          summary: `Lantern AI created task "${a.title.trim()}"`,
        })
        const due = a.due_date ? `, due ${a.due_date}` : ""
        return `Created "${a.title.trim()}" on ${proj.name} [owner: ${owner.name}, ${insertRow.priority}${due}].`
      },
    },

    update_task: {
      description:
        "Edit an existing task found by title text: change status, priority, due date, owner (reassign), title, description, or estimate. Setting status to done stamps completion. Executes immediately.",
      inputSchema: z.object({
        task_query: z.string().describe("Text from the task's title to find it"),
        status: z.enum(STATUS).optional(),
        priority: z.enum(PRIORITY).optional(),
        due_date: z.string().nullable().optional().describe("YYYY-MM-DD, or null to clear"),
        owner_name: z.string().optional().describe("Reassign to this team member"),
        title: z.string().optional(),
        description: z.string().optional(),
        estimated_minutes: z.number().optional(),
      }),
      execute: async (a: {
        task_query: string
        status?: (typeof STATUS)[number]
        priority?: (typeof PRIORITY)[number]
        due_date?: string | null
        owner_name?: string
        title?: string
        description?: string
        estimated_minutes?: number
      }) => {
        const found = await findTask(a.task_query)
        if (!found.ok) return found.msg
        const task = found.task

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const update: Record<string, any> = { updated_at: new Date().toISOString() }
        if (a.status) {
          update.status = a.status
          if (a.status === "done") update.completed_at = new Date().toISOString()
        }
        if (a.priority) update.priority = a.priority
        if (a.due_date !== undefined) update.due_date = a.due_date
        if (a.title) update.title = a.title.trim()
        if (a.description !== undefined) update.description = a.description
        if (a.estimated_minutes !== undefined) update.estimated_minutes = a.estimated_minutes
        if (a.owner_name) {
          const owner = resolveOwner(a.owner_name)
          if (!owner.ok) return owner.msg
          update.owner_user_id = owner.id
        }
        if (Object.keys(update).length === 1) return "Nothing to change — specify a field to update."

        const { error } = await supabase
          .from("byred_tasks")
          .update(update)
          .eq("id", task.id)
          .in("tenant_id", tenantIds)
        if (error) return `Update failed: ${error.message}`

        logActivity({
          object_type: "task",
          object_id: task.id,
          tenant_id: task.tenant_id,
          type: "task_updated",
          summary: `Lantern AI updated task "${task.title}"`,
          metadata: { changes: Object.keys(update).filter((k) => k !== "updated_at") },
        })
        const changed = Object.keys(update)
          .filter((k) => k !== "updated_at" && k !== "completed_at")
          .join(", ")
        return `Updated "${task.title}" (${tenantName(task.tenant_id)}): ${changed}.`
      },
    },

    cancel_task: {
      description:
        "Cancel a task (soft delete — sets status to cancelled, never hard-deletes). Find it by title text.",
      inputSchema: z.object({
        task_query: z.string().describe("Text from the task's title to find it"),
      }),
      execute: async (a: { task_query: string }) => {
        const found = await findTask(a.task_query)
        if (!found.ok) return found.msg
        const task = found.task
        const { error } = await supabase
          .from("byred_tasks")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", task.id)
          .in("tenant_id", tenantIds)
        if (error) return `Cancel failed: ${error.message}`
        logActivity({
          object_type: "task",
          object_id: task.id,
          tenant_id: task.tenant_id,
          type: "task_cancelled",
          summary: `Lantern AI cancelled task "${task.title}"`,
        })
        return `Cancelled "${task.title}" (${tenantName(task.tenant_id)}).`
      },
    },

    set_blocker: {
      description: "Flag a task as blocked with a reason. Find it by title text.",
      inputSchema: z.object({
        task_query: z.string().describe("Text from the task's title to find it"),
        reason: z.string().describe("Why it's blocked"),
      }),
      execute: async (a: { task_query: string; reason: string }) => {
        const found = await findTask(a.task_query)
        if (!found.ok) return found.msg
        const task = found.task
        const { error } = await supabase
          .from("byred_tasks")
          .update({
            blocker_flag: true,
            blocker_reason: a.reason,
            status: "blocked",
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)
          .in("tenant_id", tenantIds)
        if (error) return `Failed: ${error.message}`
        logActivity({
          object_type: "task",
          object_id: task.id,
          tenant_id: task.tenant_id,
          type: "task_blocked",
          summary: `Lantern AI blocked task "${task.title}": ${a.reason}`,
        })
        return `Blocked "${task.title}" — ${a.reason}.`
      },
    },

    clear_blocker: {
      description: "Clear the blocker on a task and return it to in-progress. Find it by title text.",
      inputSchema: z.object({
        task_query: z.string().describe("Text from the task's title to find it"),
      }),
      execute: async (a: { task_query: string }) => {
        const found = await findTask(a.task_query)
        if (!found.ok) return found.msg
        const task = found.task
        const { error } = await supabase
          .from("byred_tasks")
          .update({
            blocker_flag: false,
            blocker_reason: null,
            status: task.status === "blocked" ? "in_progress" : task.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)
          .in("tenant_id", tenantIds)
        if (error) return `Failed: ${error.message}`
        logActivity({
          object_type: "task",
          object_id: task.id,
          tenant_id: task.tenant_id,
          type: "task_unblocked",
          summary: `Lantern AI cleared blocker on "${task.title}"`,
        })
        return `Cleared blocker on "${task.title}".`
      },
    },

    add_task_comment: {
      description: "Add a comment/note to a task. Find it by title text.",
      inputSchema: z.object({
        task_query: z.string().describe("Text from the task's title to find it"),
        comment: z.string().describe("Comment body"),
      }),
      execute: async (a: { task_query: string; comment: string }) => {
        const found = await findTask(a.task_query)
        if (!found.ok) return found.msg
        const task = found.task
        const { error } = await supabase
          .from("byred_task_comments")
          .insert({ task_id: task.id, user_id: profileId, comment: a.comment.trim() })
        if (error) return `Comment failed: ${error.message}`
        logActivity({
          object_type: "task",
          object_id: task.id,
          tenant_id: task.tenant_id,
          type: "comment_added",
          summary: `Lantern AI commented on "${task.title}"`,
        })
        return `Added comment to "${task.title}".`
      },
    },

    create_project: {
      description:
        "Create a new project (tenant) and add you as a member. Use only when the user clearly wants a brand-new project, not a task.",
      inputSchema: z.object({
        name: z.string().describe("Project name"),
        type: z.enum(["product", "service", "parent"]).optional().describe("Defaults to product"),
        color: z.string().optional().describe("Hex color, defaults to By Red red"),
      }),
      execute: async (a: { name: string; type?: string; color?: string }) => {
        if (tenantRows.some((t) => t.name.toLowerCase() === a.name.trim().toLowerCase())) {
          return `A project named "${a.name}" already exists.`
        }
        const id = crypto.randomUUID()
        const { error: tErr } = await admin.from("byred_tenants").insert({
          id,
          name: a.name.trim(),
          type: a.type ?? "product",
          color: a.color ?? "#D7261E",
          active: true,
        })
        if (tErr) return `Create failed: ${tErr.message}`

        const { error: mErr } = await admin
          .from("byred_user_tenants")
          .insert({ user_id: profileId, tenant_id: id, role: "owner" })
        if (mErr) return `Project created but membership failed: ${mErr.message}`

        logActivity({
          object_type: "tenant",
          object_id: id,
          tenant_id: id,
          type: "project_created",
          summary: `Lantern AI created project "${a.name.trim()}"`,
        })
        return `Created project "${a.name.trim()}" and added you as owner. You can now create tasks in it.`
      },
    },
  }
}
