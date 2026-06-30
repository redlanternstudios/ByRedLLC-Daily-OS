import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

// ─── AI Execution Loop ────────────────────────────────────────────────────────
//
// Picks up tasks a human marked for AI handling (ai_mode AI_EXECUTE / AI_DRAFT)
// and produces the actual deliverable as a task comment.
//   AI_EXECUTE → does the work, moves task to in_progress, leaves it for a human
//                to verify and close (human stays in the driver's seat).
//   AI_DRAFT   → posts a draft, leaves status not_started for a human to finish.
//
// Content-generation ONLY. Never takes external/real-world actions (no email,
// no purchases, no outbound calls) — those stay human/interactive.
//
// Secured by CRON_SECRET. Runs on a Vercel cron AND can be triggered on demand:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/ai-executor

export const maxDuration = 60

const MODEL = "claude-sonnet-4-6"
const BATCH = 3

type TaskRow = {
  id: string
  title: string
  description: string | null
  ai_mode: string
  tenant_id: string
  owner_user_id: string | null
  created_by_user_id: string | null
}

const SYSTEM = `You are Lantern AI's execution worker for By Red OS. You are handed ONE task a human marked for AI handling. Produce the actual deliverable — the finished, usable work product the task is asking for.

Rules:
- Output ONLY the deliverable (the copy, spec, checklist, outline, draft, schema, plan, etc.). No preamble, no "here is", no meta commentary about being an AI.
- Be concrete and ready to use. Satisfy the acceptance criteria and definition of done if the task lists them.
- You do NOT take real-world actions — no sending email, no external calls, no purchases, no logins. You only produce content. If the task genuinely requires a human or external action, produce all the prep you can, then add a short "## NEEDS HUMAN" section naming the exact action required.
- Plain, professional language. Use markdown structure where it helps.`

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: candidates, error: qErr } = await admin
    .from("byred_tasks")
    .select("id, title, description, ai_mode, tenant_id, owner_user_id, created_by_user_id")
    .in("ai_mode", ["AI_EXECUTE", "AI_DRAFT"])
    .eq("status", "not_started")
    .is("ai_processed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH) as { data: TaskRow[] | null; error: { message: string } | null }

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  const tasks = candidates ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = []

  for (const task of tasks) {
    // Claim atomically so an overlapping run can't double-process the same task.
    const { data: claimed } = await admin
      .from("byred_tasks")
      .update({ ai_processed_at: new Date().toISOString() })
      .eq("id", task.id)
      .is("ai_processed_at", null)
      .select("id")
      .maybeSingle()
    if (!claimed) {
      results.push({ id: task.id, skipped: "already claimed" })
      continue
    }

    try {
      const { text } = await generateText({
        model: anthropic(MODEL),
        system: SYSTEM,
        prompt: `TASK: ${task.title}\n\n${task.description ?? "(no description provided)"}\n\nProduce the deliverable now.`,
        maxOutputTokens: 1500,
      })

      const isExecute = task.ai_mode === "AI_EXECUTE"
      const header = isExecute
        ? "🤖 **Lantern AI completed this — review & close.**"
        : "🤖 **Lantern AI draft — review and finish.**"
      const body = `${header}\n\n${text}`

      // Output goes to a task comment when we can attribute it; otherwise append to the description.
      const attributeTo = task.created_by_user_id ?? task.owner_user_id
      if (attributeTo) {
        await admin.from("byred_task_comments").insert({ task_id: task.id, user_id: attributeTo, comment: body })
      } else {
        await admin
          .from("byred_tasks")
          .update({ description: `${task.description ?? ""}\n\n---\n${body}` })
          .eq("id", task.id)
      }

      // AI_EXECUTE → in_progress for a human to verify & close. AI_DRAFT → leave not_started.
      if (isExecute) {
        await admin
          .from("byred_tasks")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", task.id)
      }

      await admin.from("byred_activities").insert({
        object_type: "task",
        object_id: task.id,
        tenant_id: task.tenant_id,
        user_id: attributeTo,
        type: isExecute ? "ai_executed" : "ai_drafted",
        summary: `Lantern AI ${isExecute ? "completed" : "drafted"} "${task.title}"`,
      })

      results.push({ id: task.id, title: task.title, mode: task.ai_mode })
    } catch (err) {
      console.error("[ai-executor]", task.id, err)
      // Release the claim so a transient failure is retried on the next run.
      await admin.from("byred_tasks").update({ ai_processed_at: null }).eq("id", task.id)
      results.push({ id: task.id, error: String(err) })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
