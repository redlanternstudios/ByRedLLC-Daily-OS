import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildProject, autobuildProject, generatePlan, type BuildStory } from "@/lib/ai/build-project"

const MODEL = "claude-sonnet-4-6"

// Allow longer structured generation (default cut would clip the plan).
export const maxDuration = 60

// ── Schemas ──────────────────────────────────────────────────────────────
const draftSchema = z.object({
  restated_goal: z.string(),
  clarifying_questions: z.array(z.string()),
  assumptions: z.array(z.string()),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  proposed_epics: z.array(
    z.object({ name: z.string(), summary: z.string(), est_stories: z.number() })
  ),
})

// The plan/story schema + generator now live in lib/ai/build-project.ts so the
// Planner and the Lantern handoff generate identical structures.

// What the user actually ordered: a flat list of chosen plates with an execution intent.
const AI_MODES = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"] as const
const commitSchema = z.object({
  tenantId: z.string(),
  project_name: z.string(),
  project_summary: z.string().optional(),
  items: z.array(z.object({
    epic_name: z.string(),
    title: z.string(),
    user_story: z.string(),
    description: z.string(),
    acceptance_criteria: z.array(z.string()),
    definition_of_done: z.array(z.string()),
    priority: z.enum(["critical", "high", "medium", "low"]),
    estimate_minutes: z.number(),
    ai_mode: z.enum(AI_MODES),
    assignee_name: z.string().optional(),
  })).min(1),
})

// ── Auth helper ──────────────────────────────────────────────────────────
async function resolve() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 as const }
  const { data: prof } = await supabase
    .from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return { error: "No profile", status: 403 as const }
  const { data: mem } = await supabase
    .from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)
  return { supabase, profileId, tenantIds }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolve()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    const body = await req.json()
    const mode = body.mode as "draft" | "generate" | "commit" | "autobuild"
    const tenantId = body.tenantId as string
    if (!tenantId || !ctx.tenantIds.includes(tenantId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 })
    }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = admin as any
    const { data: tenant } = await sa
      .from("byred_tenants").select("name").eq("id", tenantId).maybeSingle()
    const tenantName = (tenant as { name: string } | null)?.name ?? tenantId

    // Team roster — used to suggest + resolve owners.
    const { data: roster } = await sa
      .from("byred_users").select("id, name, role").eq("active", true).order("name") as {
        data: Array<{ id: string; name: string; role: string }> | null
      }
    const teamMembers = (roster ?? []).map((u) => ({ id: u.id, name: u.name }))
    const rosterText = (roster ?? []).map((u) => `- ${u.name} (${u.role})`).join("\n") || "- (no team members listed)"

    // ── DRAFT: golden path review, no tasks written ──
    if (mode === "draft") {
      const goal = String(body.goal ?? "").slice(0, 4000)
      const answers = String(body.answers ?? "").slice(0, 4000)
      const { object } = await generateObject({
        model: anthropic(MODEL),
        schema: draftSchema,
        prompt: `You are a senior agile delivery lead helping a non technical team member plan a project for "${tenantName}".
Before writing any plan, produce a tight GOLDEN PATH review so the person can confirm direction.
Restate the goal in one or two plain sentences. List the most useful clarifying questions. State the assumptions you will proceed on. List key risks each with a one line mitigation. Propose 3 to 7 epics, each with a one line summary and a rough story count.
Use simple, concrete language. Avoid jargon.

GOAL:
${goal}

${answers ? `ANSWERS / EXTRA CONTEXT FROM USER:\n${answers}` : ""}`,
      })
      return NextResponse.json({ draft: object })
    }

    // ── GENERATE: full plan with honest capability + suggested owner per story ──
    if (mode === "generate") {
      const goal = String(body.goal ?? "").slice(0, 4000)
      const golden = JSON.stringify(body.golden ?? {}).slice(0, 8000)
      const answers = String(body.answers ?? "").slice(0, 4000)
      const refine = String(body.refine ?? "").slice(0, 3000)
      const object = await generatePlan({ tenantName, goal, golden, answers, refine, rosterText })
      return NextResponse.json({ plan: object })
    }

    // ── COMMIT: build a REAL project from the selected plates ──
    if (mode === "commit") {
      const parsed = commitSchema.parse(body)
      const items: BuildStory[] = parsed.items.map((s) => ({
        epic_name: s.epic_name,
        title: s.title,
        user_story: s.user_story,
        description: s.description,
        acceptance_criteria: s.acceptance_criteria,
        definition_of_done: s.definition_of_done,
        priority: s.priority,
        estimate_minutes: s.estimate_minutes,
        ai_mode: s.ai_mode,
        assignee_name: s.assignee_name ?? null,
      }))
      const result = await buildProject({
        admin: sa,
        tenantId: parsed.tenantId,
        projectName: parsed.project_name,
        projectSummary: parsed.project_summary ?? null,
        createdByUserId: ctx.profileId,
        teamMembers,
        items,
      })
      return NextResponse.json(result)
    }

    // ── AUTOBUILD: one-pass generate→build (the Lantern handoff path) ──
    if (mode === "autobuild") {
      const goal = String(body.goal ?? "").slice(0, 4000)
      const context = String(body.context ?? "").slice(0, 4000)
      if (!goal.trim()) return NextResponse.json({ error: "goal required" }, { status: 400 })
      const result = await autobuildProject({
        admin: sa, tenantId, tenantName, goal, context,
        createdByUserId: ctx.profileId, teamMembers, rosterText,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 })
  } catch (err) {
    console.error("[planner] error", err)
    return NextResponse.json({ error: "Planner failed. Try again." }, { status: 500 })
  }
}
