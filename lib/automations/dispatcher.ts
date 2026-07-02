import { notifyUser } from "@/lib/notifications"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SA = any

export type TaskEvent = {
  type: "task.status_changed" | "task.blocker_set" | "task.assigned" | "task.created"
  taskId: string
  tenantId: string
  actorId: string
  payload: Record<string, unknown>
}

type WorkflowRow = {
  id: string
  action: Record<string, unknown> | null
  condition: Record<string, unknown> | null
}

export async function dispatchTaskEvent(sa: SA, event: TaskEvent): Promise<void> {
  const { data: workflows } = await sa
    .from("os_workflows")
    .select("id, action, condition")
    .eq("tenant_id", event.tenantId)
    .eq("trigger_event", event.type)
    .eq("is_active", true) as { data: WorkflowRow[] | null }

  if (!workflows?.length) return

  for (const wf of workflows) {
    if (wf.condition && !evalCondition(wf.condition, event.payload)) continue
    await execAction(sa, wf.action, event)
  }
}

function evalCondition(cond: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  const { field, equals } = cond as { field?: string; equals?: unknown }
  if (field && equals !== undefined) return payload[field] === equals
  return true
}

async function execAction(sa: SA, action: Record<string, unknown> | null, event: TaskEvent): Promise<void> {
  if (!action) return
  switch (action.type as string | undefined) {
    case "notify_team": {
      const { data: memberships } = await sa
        .from("byred_user_tenants")
        .select("user_id")
        .eq("tenant_id", event.tenantId) as { data: Array<{ user_id: string }> | null }
      const msg = (action.message as string | undefined) ?? `Automation: ${event.type}`
      for (const m of memberships ?? []) {
        void notifyUser({
          userId: m.user_id,
          actorId: event.actorId,
          type: "assignment",
          body: msg,
          contextUrl: `/os/tasks/${event.taskId}`,
        })
      }
      break
    }
    case "update_task_status": {
      const status = action.status as string | undefined
      if (!status) return
      await sa
        .from("byred_tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", event.taskId)
      break
    }
    case "create_task": {
      const title = action.title as string | undefined
      if (!title) return
      await sa.from("byred_tasks").insert({
        tenant_id: event.tenantId,
        title,
        priority: (action.priority as string | undefined) ?? "medium",
        status: "not_started",
        ai_mode: "HUMAN_ONLY",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      break
    }
  }
}
