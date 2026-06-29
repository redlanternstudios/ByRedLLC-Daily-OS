import type { ByredTask } from "@/types/database"

export function dateOnly(value: string | null) {
  if (!value) return null
  return value.includes("T") ? value.split("T")[0] : value
}

export function weekStartFor(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`)
  const day = date.getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - daysSinceMonday)
  return date.toISOString().split("T")[0]
}

export function isOpen(task: Pick<ByredTask, "status">) {
  return task.status !== "done" && task.status !== "cancelled"
}

export function isOverdue(task: Pick<ByredTask, "status" | "due_date">, today: string) {
  const due = dateOnly(task.due_date)
  return isOpen(task) && !!due && due < today
}

export function scoreCriticalCadenceTask(
  task: Pick<ByredTask, "priority" | "status" | "blocker_flag" | "due_date" | "revenue_impact_score" | "urgency_score">,
  today: string
) {
  let score = 0
  if (task.priority === "critical") score += 100
  if (task.status === "blocked" || task.blocker_flag) score += 45
  if (isOverdue(task, today)) score += 35
  score += task.revenue_impact_score ?? 0
  score += task.urgency_score ?? 0
  return score
}
