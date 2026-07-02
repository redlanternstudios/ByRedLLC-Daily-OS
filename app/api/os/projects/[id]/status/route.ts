import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

interface RouteParams { params: Promise<{ id: string }> }

/**
 * POST /api/os/projects/[id]/status — AI-generated stakeholder status update.
 * Summarizes progress/blockers/next steps from the live tasks and saves it as a
 * project doc (os_docs, type 'note') so it's shareable and versioned.
 */
export async function POST(_req: Request, { params }: RouteParams) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: prof } = await supabase.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return NextResponse.json({ error: "No profile" }, { status: 403 })
  const { data: mem } = await supabase.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)

  const { id } = await params
  const { data: project } = await supabase.from("os_projects").select("name, tenant_id, overview").eq("id", id).maybeSingle() as {
    data: { name: string; tenant_id: string; overview: string | null } | null }
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(project.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: tasks } = await supabase.from("byred_tasks")
    .select("title, status, priority, epic, blocker_flag, blocker_reason, story_points, due_date")
    .eq("project_id", id).neq("status", "cancelled")
  const rows = (tasks ?? []) as Array<Record<string, unknown>>
  const done = rows.filter((t) => t.status === "done").length
  const blockers = rows.filter((t) => t.blocker_flag)

  const context = [
    `Project: ${project.name}`,
    project.overview ? `Overview: ${project.overview.slice(0, 800)}` : "",
    `Progress: ${done}/${rows.length} tasks done.`,
    blockers.length ? `Blockers: ${blockers.map((b) => `"${b.title}" (${b.blocker_reason ?? "no reason"})`).join("; ")}` : "No blockers.",
    `Tasks: ${rows.slice(0, 40).map((t) => `- [${t.status}] ${t.title}${t.epic ? ` (${t.epic})` : ""}`).join("\n")}`,
  ].filter(Boolean).join("\n")

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: `You write concise, executive stakeholder status updates for By Red LLC projects. Lead with the headline. Use short markdown sections: ## Status (on track / at risk / blocked), ## Progress, ## Blockers & risks, ## Next. Be truthful — only use the provided data, never invent. Keep it under ~250 words.`,
    prompt: `Write the status update from this project data:\n\n${context}`,
    maxOutputTokens: 900,
  })

  const admin = createAdminClient() as any
  const title = `Status update — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  const { data: doc, error } = await admin.from("os_docs").insert({
    tenant_id: project.tenant_id, project_id: id, title, content: text, doc_type: "note", status: "published", created_by: profileId,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, doc_id: doc.id, preview: text.slice(0, 200) })
}
