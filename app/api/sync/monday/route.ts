/**
 * POST /api/sync/monday
 *
 * Pulls all board items assigned to our 3 users from Monday.com
 * and upserts them into byred_tasks using monday_item_id as the key.
 *
 * Called manually or via cron. Requires MONDAY_API_TOKEN env var.
 * Protected by CRON_SECRET or admin session.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mondayQuery, mapMondayStatus, mapMondayPriority } from "@/lib/monday/client"

// Monday user IDs → byred email mapping
const MONDAY_USER_MAP: Record<string, string> = {
  "102146404": "roryleesemeah@icloud.com",
  "102146493": "g.homira@gmail.com",
  "102146081": "clashon64@gmail.com",
}

type MondayItem = {
  id: string
  name: string
  board: { id: string; name: string }
  column_values: Array<{
    id: string
    type: string
    text: string
    value: string | null
  }>
  subscribers: Array<{ id: string }>
  created_at: string
  updated_at: string
}

type MondayBoardsResponse = {
  boards: Array<{
    id: string
    name: string
    items_page: {
      items: MondayItem[]
      cursor: string | null
    }
  }>
}

const ITEMS_QUERY = `
  query GetBoardItems($boardIds: [ID!]!, $userIds: [ID!]!, $cursor: String) {
    boards(ids: $boardIds) {
      id
      name
      items_page(
        limit: 100
        cursor: $cursor
        query_params: {
          rules: [{ column_id: "person", compare_value: $userIds }]
        }
      ) {
        cursor
        items {
          id
          name
          created_at
          updated_at
          board { id name }
          subscribers { id }
          column_values {
            id
            type
            text
            value
          }
        }
      }
    }
  }
`

const BOARDS_QUERY = `
  query {
    boards(limit: 50, state: active) {
      id
      name
    }
  }
`

export async function POST(req: NextRequest) {
  // Auth: accept cron secret header OR require an authenticated session
  const secret = req.headers.get("x-cron-secret")
  const hasCronSecret = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET

  if (!hasCronSecret) {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = await createAdminClient()

    // Create a batch record to track this sync run
    const { data: batch } = await supabase
      .from("byred_import_batches")
      .insert({ source: "monday", status: "processing", total_rows: 0, imported_rows: 0, failed_rows: 0 })
      .select("id")
      .single()
    const batchId = batch?.id ?? null

    // 1. Get all active board IDs from Monday
    const boardsData = await mondayQuery<{ boards: Array<{ id: string; name: string }> }>(
      BOARDS_QUERY
    )
    const boardIds = boardsData.boards.map((b) => b.id)

    if (boardIds.length === 0) {
      return NextResponse.json({ message: "No active boards found", synced: 0 })
    }

    const sa = supabase as any

    // 2. Get byred_users profiles for the 3 users
    const { data: byredUsers } = await sa
      .from("byred_users")
      .select("id, email")
      .in("email", Object.values(MONDAY_USER_MAP))
      .eq("active", true) as { data: Array<{ id: string; email: string }> | null }

    const emailToByredId: Record<string, string> = {}
    for (const u of byredUsers ?? []) {
      emailToByredId[u.email] = u.id
    }

    // 3. Get first tenant as default (tasks must have a tenant_id)
    const { data: defaultTenant } = await sa
      .from("byred_tenants")
      .select("id, name")
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .single() as { data: { id: string; name: string } | null }

    const mondayUserIds = Object.keys(MONDAY_USER_MAP)
    let totalSynced = 0
    const errors: string[] = []

    // 4. Fetch items assigned to our users across all boards
    for (const boardId of boardIds) {
      try {
        let cursor: string | null = null
        let hasMore = true

        while (hasMore) {
          const data: MondayBoardsResponse = await mondayQuery<MondayBoardsResponse>(ITEMS_QUERY, {
            boardIds: [boardId],
            userIds: mondayUserIds,
            cursor: cursor ?? undefined,
          })

          const board: MondayBoardsResponse["boards"][0] | undefined = data.boards[0]
          if (!board) break

          const items = board.items_page.items
          cursor = board.items_page.cursor
          hasMore = !!cursor && items.length > 0

          for (const item of items) {
            try {
              // Parse column values
              let status = "not_started"
              let priority = "medium"
              let dueDate: string | null = null
              let estimatedMinutes: number | null = null
              let ownerEmail: string | null = null

              for (const col of item.column_values) {
                if (col.type === "color" || col.id === "status") {
                  status = mapMondayStatus(col.text ?? "")
                }
                if (col.id === "priority" || col.id === "priority4") {
                  priority = mapMondayPriority(col.text ?? "")
                }
                if (col.type === "date" && col.text) {
                  dueDate = col.text
                }
                if (col.type === "numbers" && col.id.includes("time")) {
                  estimatedMinutes = parseFloat(col.text ?? "0") * 60 || null
                }
                if (col.type === "multiple-person" || col.type === "person") {
                  try {
                    const parsed = col.value ? JSON.parse(col.value) : null
                    const personsIds: string[] = parsed?.personsAndTeams?.map(
                      (p: { id: number }) => String(p.id)
                    ) ?? []
                    for (const pid of personsIds) {
                      if (MONDAY_USER_MAP[pid]) {
                        ownerEmail = MONDAY_USER_MAP[pid]
                        break
                      }
                    }
                  } catch {}
                }
              }

              // Fallback owner: first subscriber matching our users
              if (!ownerEmail) {
                for (const sub of item.subscribers) {
                  if (MONDAY_USER_MAP[sub.id]) {
                    ownerEmail = MONDAY_USER_MAP[sub.id]
                    break
                  }
                }
              }

              const ownerByredId = ownerEmail ? emailToByredId[ownerEmail] : null

              // Determine tenant from board name (match against tenant names)
              const { data: tenantMatch } = await supabase
                .from("byred_tenants")
                .select("id")
                .ilike("name", `%${board.name.split(" ")[0]}%`)
                .limit(1)
                .maybeSingle()

              const tenantId = tenantMatch?.id ?? defaultTenant?.id
              if (!tenantId) continue

              // Upsert into byred_tasks
              const { error: upsertError } = await supabase
                .from("byred_tasks")
                .upsert(
                  {
                    monday_item_id: item.id,
                    title: item.name,
                    status,
                    priority,
                    due_date: dueDate,
                    estimated_minutes: estimatedMinutes,
                    owner_user_id: ownerByredId ?? undefined,
                    tenant_id: tenantId,
                    ai_mode: "HUMAN_ONLY",
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "monday_item_id", ignoreDuplicates: false }
                )

              if (upsertError) {
                errors.push(`Item ${item.id}: ${upsertError.message}`)
              } else {
                totalSynced++
              }
            } catch (itemErr) {
              errors.push(`Item ${item.id}: ${String(itemErr)}`)
            }
          }
        }
      } catch (boardErr) {
        errors.push(`Board ${boardId}: ${String(boardErr)}`)
      }
    }

    // Update batch record with final counts
    if (batchId) {
      await supabase.from("byred_import_batches").update({
        status: errors.length === 0 ? "completed" : "failed",
        total_rows: totalSynced + errors.length,
        imported_rows: totalSynced,
        failed_rows: errors.length,
        error_message: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
        completed_at: new Date().toISOString(),
      }).eq("id", batchId)
    }

    return NextResponse.json({
      message: "Monday sync complete",
      synced: totalSynced,
      boards: boardIds.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser/cron trigger
export async function GET(req: NextRequest) {
  return POST(req)
}
