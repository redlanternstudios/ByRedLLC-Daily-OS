import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { notifyMentions } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const body = (await req.json()) as {
      channel_id: string
      tenant_id: string
      body: string
      reply_to_id?: string | null
    }

    if (!body.channel_id || !body.body?.trim()) {
      return NextResponse.json({ error: "channel_id and body required" }, { status: 400 })
    }

    // Resolve actor byred_users.id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: byredUser } = await sa
      .from("byred_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle() as { data: { id: string } | null }

    if (!byredUser) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    // Verify the channel belongs to a tenant the user can access
    const { data: channel } = await sa
      .from("os_channels")
      .select("id, tenant_id, name")
      .eq("id", body.channel_id)
      .maybeSingle() as { data: { id: string; tenant_id: string; name: string } | null }

    if (!channel || !scope.tenantIds.includes(channel.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data: message, error } = await sa
      .from("os_messages")
      .insert({
        channel_id: body.channel_id,
        tenant_id: channel.tenant_id,
        user_id: byredUser.id,
        body: body.body.trim(),
        reply_to_id: body.reply_to_id ?? null,
      })
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget mention notifications
    void notifyMentions({
      body: body.body.trim(),
      actorId: byredUser.id,
      contextUrl: `/os/comms`,
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
