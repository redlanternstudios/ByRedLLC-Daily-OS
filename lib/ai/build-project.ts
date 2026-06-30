import "server-only"

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

// Shared engine that (a) generates a project plan and (b) turns it into a REAL
// project: one os_projects row + byred_tasks linked to it (epic group, owner,
// ai_mode). Used by the Planner (interactive) and the Lantern "push_to_planner"
// handoff (autonomous) so both paths build identical structures. byred_tasks
// stays the single source of truth; os_projects is the organizing container.

const MODEL = "claude-sonnet-4-6"

export const storySchema = z.object({
  title: z.string(),
  user_story: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  definition_of_done: z.array(z.string()),
  priority: z.enum(["critical", "high", "medium", "low"]),
  estimate_minutes: z.number(),
  capability: z.enum(["ai_can_complete", "ai_can_draft", "human_only"]),
  capability_reason: z.string(),
  assignee_name: z.string(),
  // Jira-style issue fields.
  issue_type: z.enum(["epic", "story", "task", "subtask", "bug"]),
  story_points: z.number(),
  start_date: z.string().optional(),
  labels: z.array(z.string()),
})
export const planSchema = z.object({
  project_name: z.string(),
  project_summary: z.string(),
  // Confluence-style living brief (markdown): goal, scope, milestones, risks, success metrics.
  project_overview: z.string(),
  epics: z.array(z.object({ name: z.string(), goal: z.string(), stories: z.array(storySchema) })),
})
export type Plan = z.infer<typeof planSchema>

export type BuildStory = {
  epic_name: string
  title: string
  user_story: string
  description: string
  acceptance_criteria: string[]
  definition_of_done: string[]
  priority: "critical" | "high" | "medium" | "low"
  estimate_minutes: number
  ai_mode: "HUMAN_ONLY" | "AI_ASSIST" | "AI_DRAFT" | "AI_EXECUTE"
  assignee_name?: string | null
  issue_type?: "epic" | "story" | "task" | "subtask" | "bug"
  story_points?: number | null
  start_date?: string | null
  labels?: string[]
}

// Assignment guidance shared by every generation path.
export function assignGuide(rosterText: string): string {
  return `ASSIGNMENT — give every story an "assignee_name" chosen from the TEAM ROSTER below (use the exact name).
TEAM ROSTER:
${rosterText || "- (no team members listed)"}
Rules: match the work to the person's role. Keymon Penn (PM/RTE) owns planning, coordination, and sprint/process work. Anything for "Beauty By Red" goes to Homira Gitesatani only. Engineering/build work goes to a developer. If nothing fits, assign to Rory Semeah. Never invent a name that isn't on the roster.`
}

export async function generatePlan(opts: {
  tenantName: string
  goal: string
  golden?: string
  answers?: string
  refine?: string
  rosterText: string
}): Promise<Plan> {
  const { tenantName, goal, golden = "", answers = "", refine = "", rosterText } = opts
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: planSchema,
    prompt: `You are a senior agile project manager. Build a complete, ready to execute plan for "${tenantName}" based on the goal${golden ? " and the confirmed golden path" : ""}.
Give the project a short "project_name", a one sentence "project_summary", and a "project_overview" — a concise markdown brief (## Goal, ## Scope, ## Milestones, ## Risks, ## Success metrics) a stakeholder could read to understand the whole project.
Keep the plan SMALL and fast to produce. Hard limits: at most 4 epics, at most 3 stories per epic, and 10 to 12 stories total maximum. Pick only the most essential path to launch and do not pad. Keep every text field concise. Every story MUST include: a clear title, a one line user story "As a X, I want Y, so that Z", a one sentence description, exactly 2 to 3 short testable acceptance criteria, a definition of done checklist of 2 to 3 short items, a priority, a realistic estimate in minutes, an honest capability rating with a one line reason, an assignee_name, an issue_type (epic|story|task|subtask|bug — most are "story" or "task"), story_points (Fibonacci: 1,2,3,5,8,13 — relative effort), a start_date (YYYY-MM-DD, sequence stories sensibly starting from today so dependencies come first), and 1-3 short labels.

CAPABILITY RATING (be strict and truthful):
- "ai_can_complete": an AI assistant could fully finish this from inside a project tool with no human action needed (writing copy, drafting a template, producing a spec, structuring a schema, generating checklists).
- "ai_can_draft": an AI can produce a strong first draft but a human must review, decide, or finish it.
- "human_only": needs a human — an account, a payment, a legal/business decision, a real-world action, or an external login.
Never rate something "ai_can_complete" if it truly needs a human. Add a one line capability_reason in plain language.

${assignGuide(rosterText)}

Keep stories small. Plain language so a non technical owner understands every line.

GOAL:
${goal}

${golden ? `CONFIRMED GOLDEN PATH:\n${golden}\n` : ""}${answers ? `EXTRA CONTEXT:\n${answers}\n` : ""}${refine ? `REVISION REQUEST FROM USER (adjust the plan accordingly):\n${refine}` : ""}`,
  })
  return object
}

function storyBody(s: BuildStory): string {
  return [
    `**Epic:** ${s.epic_name}`,
    "",
    s.user_story,
    "",
    s.description,
    "",
    "**Acceptance Criteria**",
    ...s.acceptance_criteria.map((a) => `- ${a}`),
    "",
    "**Definition of Done**",
    ...s.definition_of_done.map((d) => `- ${d}`),
  ].join("\n")
}

export type BuildProjectInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  tenantId: string
  projectName: string
  projectSummary?: string | null
  overview?: string | null
  createdByUserId: string | null
  teamMembers: { id: string; name: string }[]
  items: BuildStory[]
}

export async function buildProject(
  input: BuildProjectInput
): Promise<{ projectId: string; created: number; aiQueued: number }> {
  const { admin, tenantId, projectName, projectSummary, overview, createdByUserId, teamMembers, items } = input

  const resolveOwner = (name?: string | null): string | null => {
    if (!name || !name.trim()) return null
    const q = name.trim().toLowerCase()
    let hit = teamMembers.find((m) => m.name.toLowerCase() === q)
    if (!hit) hit = teamMembers.find((m) => m.name.toLowerCase().includes(q))
    return hit?.id ?? null
  }

  const { data: project, error: pErr } = await admin
    .from("os_projects")
    .insert({
      tenant_id: tenantId,
      name: projectName.trim().slice(0, 200) || "New project",
      description: projectSummary ?? null,
      overview: overview ?? null,
      status: "active",
      owner_user_id: createdByUserId,
      created_by_user_id: createdByUserId,
    })
    .select("id")
    .single()
  if (pErr) throw new Error(`Project create failed: ${pErr.message}`)
  const projectId = project.id as string

  const rows = items.map((s, i) => ({
    tenant_id: tenantId,
    project_id: projectId,
    epic: s.epic_name,
    title: s.title,
    description: storyBody(s),
    status: "not_started",
    priority: s.priority,
    ai_mode: s.ai_mode,
    estimated_minutes: Math.max(5, Math.round(s.estimate_minutes || 30)),
    owner_user_id: resolveOwner(s.assignee_name),
    created_by_user_id: createdByUserId,
    order_index: i,
    issue_type: s.issue_type ?? "task",
    story_points: s.story_points ?? null,
    start_date: s.start_date ?? null,
    labels: s.labels ?? [],
  }))

  const { error: tErr } = await admin.from("byred_tasks").insert(rows)
  if (tErr) throw new Error(`Task create failed: ${tErr.message}`)

  const aiQueued = rows.filter((r) => r.ai_mode === "AI_EXECUTE" || r.ai_mode === "AI_DRAFT").length

  void (async () => {
    try {
      await admin.from("byred_activities").insert({
        object_type: "project",
        object_id: projectId,
        tenant_id: tenantId,
        user_id: createdByUserId,
        type: "project_built",
        summary: `Built project "${projectName}" with ${rows.length} tasks`,
      })
    } catch {
      /* non-blocking */
    }
  })()

  return { projectId, created: rows.length, aiQueued }
}

// Map a story's honest capability to a default execution mode.
function modeFromCapability(c: Plan["epics"][number]["stories"][number]["capability"]): BuildStory["ai_mode"] {
  return c === "ai_can_complete" ? "AI_EXECUTE" : c === "ai_can_draft" ? "AI_DRAFT" : "HUMAN_ONLY"
}

// One-pass autonomous build: generate a plan and build the project from it.
// This is the Lantern "push_to_planner" path and the route's autobuild mode.
export async function autobuildProject(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  tenantId: string
  tenantName: string
  goal: string
  context?: string
  createdByUserId: string | null
  teamMembers: { id: string; name: string }[]
  rosterText: string
}): Promise<{ projectId: string; projectName: string; created: number; aiQueued: number }> {
  const plan = await generatePlan({
    tenantName: opts.tenantName,
    goal: opts.goal,
    answers: opts.context ?? "",
    rosterText: opts.rosterText,
  })
  const items: BuildStory[] = plan.epics.flatMap((e) =>
    e.stories.map((s) => ({
      epic_name: e.name,
      title: s.title,
      user_story: s.user_story,
      description: s.description,
      acceptance_criteria: s.acceptance_criteria,
      definition_of_done: s.definition_of_done,
      priority: s.priority,
      estimate_minutes: s.estimate_minutes,
      ai_mode: modeFromCapability(s.capability),
      assignee_name: s.assignee_name,
      issue_type: s.issue_type,
      story_points: s.story_points,
      start_date: s.start_date,
      labels: s.labels,
    }))
  )
  if (items.length === 0) throw new Error("Plan produced no tasks")
  const result = await buildProject({
    admin: opts.admin,
    tenantId: opts.tenantId,
    projectName: plan.project_name,
    projectSummary: plan.project_summary,
    overview: plan.project_overview,
    createdByUserId: opts.createdByUserId,
    teamMembers: opts.teamMembers,
    items,
  })
  return { ...result, projectName: plan.project_name }
}
