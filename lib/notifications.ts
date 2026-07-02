import { createAdminClient } from "@/lib/supabase/admin"
import { sendMentionEmail } from "@/lib/email"

/** Parse @Name tokens from a body string and return matched names */
function parseMentions(body: string): string[] {
  const matches = body.match(/@([\w][^\s@#,!?.]*)(?=\s|$)/g) ?? []
  return [...new Set(matches.map(m => m.slice(1).trim()))]
}

type NotifyMentionsArgs = {
  body: string
  actorId: string
  contextUrl?: string
}

export async function notifyMentions({ body, actorId, contextUrl }: NotifyMentionsArgs) {
  const names = parseMentions(body)
  if (names.length === 0) return

  const supabase = await createAdminClient()
  const sa = supabase as any

  const { data: actor } = await sa
    .from("byred_users")
    .select("name, email")
    .eq("id", actorId)
    .maybeSingle() as { data: { name: string; email: string } | null }

  const actorName = actor?.name ?? "Someone"

  const { data: users } = await sa
    .from("byred_users")
    .select("id, name, email")
    .in("name", names) as { data: Array<{ id: string; name: string; email: string }> | null }

  const targets = (users ?? []).filter(u => u.id !== actorId)
  if (targets.length === 0) return

  const snippet = `${body.slice(0, 160)}${body.length > 160 ? "…" : ""}`

  const rows = targets.map(u => ({
    user_id: u.id,
    actor_id: actorId,
    type: "mention",
    body: `${actorName} mentioned you: "${snippet}"`,
    context_url: contextUrl ?? null,
    read: false,
  }))

  await sa.from("os_notifications").insert(rows)

  // Fire emails — each independently so one failure doesn't block others
  await Promise.allSettled(
    targets.map(u =>
      sendMentionEmail({
        toEmail: u.email,
        toName: u.name,
        actorName,
        snippet,
        contextUrl,
      })
    )
  )
}

/**
 * Create a single in-app notification for a user. Best-effort — never throws.
 * Used for assignment/blocker/approval events. Does not email (in-app only).
 */
export async function notifyUser(args: {
  userId: string | null
  actorId: string | null
  type: string
  body: string
  contextUrl?: string | null
}) {
  if (!args.userId || args.userId === args.actorId) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = (await createAdminClient()) as any
    await sa.from("os_notifications").insert({
      user_id: args.userId,
      actor_id: args.actorId,
      type: args.type,
      body: args.body,
      context_url: args.contextUrl ?? null,
      read: false,
    })
  } catch {
    /* non-blocking */
  }
}
