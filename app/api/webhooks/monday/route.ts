/**
 * POST /api/webhooks/monday
 *
 * Receives real-time events from Monday.com when items change.
 * Monday sends a challenge on first registration — we respond to verify.
 * On real events: update the matching byred_tasks row.
 *
 * Register this URL in Monday: Apps > Webhooks
 * Events to subscribe: change_column_value, create_item, item_deleted
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapMondayStatus, mapMondayPriority } from "@/lib/monday/client"

type MondayWebhookPayload = {
  challenge?: string
  event?: {
    type: string
    pulseId?: number            // item id
    boardId?: number
    itemId?: number
    pulseName?: string
    columnId?: string
    columnType?: string
    value?: {
      label?: { text: string }
      date?: string
      changed_at?: string
    }
    previousValue?: unknown
    userId?: number
  }
}

// Monday user IDs → byred email
const MONDAY_USER_MAP: Record<string, string> = {
  "102146404": "roryleesemeah@icloud.com",
  "102146493": "g.homira@gmail.com",
  "102146081": "clashon64@gmail.com",
}

export async function POST(req: NextRequest) {
  let body: MondayWebhookPayload

  try {
    body = (await req.json()) as MondayWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Monday webhook challenge handshake
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge })
  }

  const event = body.event
  if (!event) {
    return NextResponse.json({ ok: true })
  }

  const itemId = String(event.pulseId ?? event.itemId ?? "")
  if (!itemId) {
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = await createAdminClient()
    const sa = supabase as any

    // Handle item deletion
    if (event.type === "delete_pulse") {
      await sa
        .from("byred_tasks")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("monday_item_id", itemId)

      return NextResponse.json({ ok: true, action: "cancelled" })
    }

    // Handle column value changes
    if (event.type === "change_column_value" || event.type === "change_status_column_value") {
      const colId = event.columnId ?? ""
      const colType = event.columnType ?? ""
      const labelText = event.value?.label?.text ?? ""
      const dateVal = event.value?.date ?? null

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (colId === "status" || colType === "color") {
        updates.status = mapMondayStatus(labelText)
      } else if (colId.includes("priority")) {
        updates.priority = mapMondayPriority(labelText)
      } else if (colType === "date" && dateVal) {
        updates.due_date = dateVal
      }

      if (Object.keys(updates).length > 1) {
        await sa
          .from("byred_tasks")
          .update(updates)
          .eq("monday_item_id", itemId)
      }

      return NextResponse.json({ ok: true, action: "updated", itemId })
    }

    // Handle new item creation — trigger a targeted sync for this item
    if (event.type === "create_pulse") {
      const title = event.pulseName ?? "Untitled task"
      const ownerEmail = event.userId ? MONDAY_USER_MAP[String(event.userId)] : null

      // Get owner byred_users.id
      const { data: ownerUser } = ownerEmail
        ? await (sa
            .from("byred_users")
            .select("id")
            .eq("email", ownerEmail)
            .single() as Promise<{ data: { id: string } | null }>)
        : { data: null }

      // Default to first active tenant
      const { data: defaultTenant } = await (sa
        .from("byred_tenants")
        .select("id")
        .eq("active", true)
        .order("created_at")
        .limit(1)
        .single() as Promise<{ data: { id: string } | null }>)

      if (defaultTenant) {
        await sa.from("byred_tasks").upsert(
          {
            monday_item_id: itemId,
            title,
            status: "not_started",
            priority: "medium",
            tenant_id: defaultTenant.id,
            owner_user_id: ownerUser?.id ?? null,
            ai_mode: "HUMAN_ONLY",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "monday_item_id", ignoreDuplicates: false }
        )
      }

      return NextResponse.json({ ok: true, action: "created", itemId })
    }

    return NextResponse.json({ ok: true, action: "noop" })
  } catch (err) {
    console.error("[monday-webhook]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
