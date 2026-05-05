/**
 * Monday.com GraphQL client
 * Uses MONDAY_API_TOKEN env var
 */

const MONDAY_API_URL = "https://api.monday.com/v2"

export async function mondayQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) throw new Error("MONDAY_API_TOKEN is not set")

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Monday API error: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }

  if (json.errors?.length) {
    throw new Error(`Monday GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`)
  }

  return json.data as T
}

// Map Monday status label → byred task status
export function mapMondayStatus(label: string): string {
  const l = label.toLowerCase()
  if (l.includes("done") || l.includes("complete")) return "done"
  if (l.includes("progress") || l.includes("working")) return "in_progress"
  if (l.includes("block") || l.includes("stuck")) return "blocked"
  if (l.includes("cancel")) return "cancelled"
  return "not_started"
}

// Map Monday priority label → byred priority
export function mapMondayPriority(label: string): string {
  const l = label.toLowerCase()
  if (l.includes("critical") || l.includes("urgent")) return "critical"
  if (l.includes("high")) return "high"
  if (l.includes("low")) return "low"
  return "medium"
}
