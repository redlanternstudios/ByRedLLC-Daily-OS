import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MODEL = "claude-sonnet-4-6"

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

const storySchema = z.object({
  title: z.string(),
  user_story: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  definition_of_done: z.array(z.string()),
  priority: z.enum(["critical", "high", "medium", "low"]),
  estimate_minutes: z.number(),
})
const planSchema = z.object({
  epics: z.array(z.object({ name: z.string(), goal: z.string(), stories: z.array(storySchema) })),
})

type Plan = z.infer<typeof planSchema>

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
    const mode = body.mode as "draft" | "generate" | "commit"
    const tenantId = body.tenantId as string
    if (!tenantId || !ctx.tenantIds.includes(tenantId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: tenant } = await admin
      .from("byred_tenants").select("name").eq("id", tenantId).maybeSingle()
    const tenantName = (tenant as { name: string } | null)?.name ?? tenantId

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

    // ── GENERATE: full plan, still not written ──
    if (mode === "generate") {
      const goal = String(body.goal ?? "").slice(0, 4000)
      const golden = JSON.stringify(body.golden ?? {}).slice(0, 8000)
      const answers = String(body.answers ?? "").slice(0, 4000)
      const { object } = await generateObject({
        model: anthropic(MODEL),
        schema: planSchema,
        prompt: `You are a senior agile project manager. Build a complete, ready to execute plan for "${tenantName}" based on the goal and the confirmed golden path.
Break the work into epics. Each epic has small, shippable stories. Every story MUST include: a clear title, a user story line in the form "As a X, I want Y, so that Z", a short description, 3 to 6 testable acceptance criteria, a definition of done checklist (3 to 6 items), a priority (critical, high, medium, low), and a realistic estimate in minutes. Keep stories small. Plain language so a non technical owner understands every line.

GOAL:
${goal}

CONFIRMED GOLDEN PATH:
${golden}

${answers ? `EXTRA CONTEXT:\n${answers}` : ""}`,
      })
      return NextResponse.json({ plan: object })
    }

    // ── COMMIT: write stories into byred_tasks ──
    if (mode === "commit") {
      const plan = planSchema.parse(body.plan) as Plan
      const rows: Record<string, unknown>[] = []
      for (const epic of plan.epics) {
        for (const s of epic.stories) {
          const description = [
            `**Epic:** ${epic.name}`,
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
          rows.push({
            tenant_id: tenantId,
            title: s.title,
            description,
            status: "not_started",
            priority: s.priority,
            ai_mode: "HUMAN_ONLY",
            estimated_minutes: Math.max(5, Math.round(s.estimate_minutes || 30)),
            created_by_user_id: ctx.profileId,
          })
        }
      }
      if (rows.length === 0) return NextResponse.json({ error: "Empty plan" }, { status: 400 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any).from("byred_tasks").insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ created: rows.length })
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 })
  } catch (err) {
    console.error("[planner] error", err)
    return NextResponse.json({ error: "Planner failed. Try again." }, { status: 500 })
  }
}
