import { createAdminClient } from "@/lib/supabase/admin"

/** Parse @Name tokens from a body string and return matched names */
function parseMentions(body: string): string[] {
  const matches = body.match(/@([\w][^\s@#,!?.]*)(?=\s|$)/g) ?? []
  return [...new Set(matches.map(m => m.slice(1).trim()))]
}

type NotifyMentionsArgs = {
  body: string
  actorId: string        // byred_users.id of the sender
  contextUrl?: string    // link back to the message/comment location
}

/**
 * Parse @mentions from body, look up matching byred_users by name,
 * and insert os_notifications rows for each mentioned user (skipping the actor).
 */
export async function notifyMentions({ body, actorId, contextUrl }: NotifyMentionsArgs) {
  const names = parseMentions(body)
  if (names.length === 0) return

  const supabase = await createAdminClient()
  const sa = supabase as any

  // Fetch actor name for the notification body
  const { data: actor } = await sa
    .from("byred_users")
    .select("name")
    .eq("id", actorId)
    .maybeSingle() as { data: { name: string } | null }

  const actorName = actor?.name ?? "Someone"

  // Look up all mentioned users by name (case-insensitive)
  const { data: users } = await sa
    .from("byred_users")
    .select("id, name")
    .in("name", names) as { data: Array<{ id: string; name: string }> | null }

  const targets = (users ?? []).filter(u => u.id !== actorId)
  if (targets.length === 0) return

  const rows = targets.map(u => ({
    user_id: u.id,
    actor_id: actorId,
    type: "mention",
    body: `${actorName} mentioned you: "${body.slice(0, 120)}${body.length > 120 ? "…" : ""}"`,
    context_url: contextUrl ?? null,
    read: false,
  }))

  await sa.from("os_notifications").insert(rows)
}
