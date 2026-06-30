import "server-only"

// Thin wrapper over Slack's Web API (chat.postMessage).
// Inert until SLACK_BOT_TOKEN is set in the environment — the tool that calls
// this reports a clear "not configured" message until then.
//
// Setup (done by a human, not by Lantern):
//   1. Create a Slack app at api.slack.com/apps for the By Red workspace.
//   2. Add the bot scope `chat:write` (and `chat:write.public` to post to
//      channels the bot hasn't joined), install the app, copy the Bot User
//      OAuth Token (starts with `xoxb-`).
//   3. Put it in Vercel env as SLACK_BOT_TOKEN and redeploy.
//   4. Map each teammate's Slack member ID into byred_users.slack_user_id.

export function slackConfigured() {
  return !!process.env.SLACK_BOT_TOKEN
}

/**
 * Post a message to a Slack channel or a user DM.
 * `channel` accepts a channel id (C…), a channel name (#general / general),
 * or a user id (U…) for a direct message.
 */
export async function sendSlackMessage({
  channel,
  text,
}: {
  channel: string
  text: string
}): Promise<{ ok: true; ts?: string } | { ok: false; reason: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return { ok: false, reason: "SLACK_BOT_TOKEN not set in environment — add it in Vercel and redeploy to enable Slack." }
  }
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    })
    const data = (await res.json()) as { ok: boolean; ts?: string; error?: string }
    if (!data.ok) return { ok: false, reason: `Slack API error: ${data.error ?? "unknown"}` }
    return { ok: true, ts: data.ts }
  } catch (err) {
    console.error("[sendSlackMessage]", err)
    return { ok: false, reason: String(err) }
  }
}
