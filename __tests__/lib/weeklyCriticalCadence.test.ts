import { describe, expect, it } from "vitest"
import { scoreCriticalCadenceTask, weekStartFor } from "@/lib/weekly-critical-cadence"

describe("weekly critical cadence helpers", () => {
  it("uses Monday as the weekly idempotency boundary", () => {
    expect(weekStartFor("2026-06-29")).toBe("2026-06-29")
    expect(weekStartFor("2026-07-05")).toBe("2026-06-29")
    expect(weekStartFor("2026-07-06")).toBe("2026-07-06")
  })

  it("prioritizes critical, blocked, overdue, revenue, and urgency signals", () => {
    const today = "2026-06-29"
    const score = scoreCriticalCadenceTask({
      priority: "critical",
      status: "blocked",
      blocker_flag: true,
      due_date: "2026-06-20",
      revenue_impact_score: 8,
      urgency_score: 6,
    }, today)

    expect(score).toBe(194)
  })

  it("does not treat done overdue work as active pressure", () => {
    const today = "2026-06-29"
    const score = scoreCriticalCadenceTask({
      priority: "low",
      status: "done",
      blocker_flag: false,
      due_date: "2026-06-20",
      revenue_impact_score: 0,
      urgency_score: 0,
    }, today)

    expect(score).toBe(0)
  })
})
