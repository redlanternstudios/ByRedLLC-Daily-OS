import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/os/calendar?tenant_id=&from=&to=
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get("from")
  const to   = searchParams.get("to")

  const sa = supabase as any

  // Resolve byred user
  const { data: byredUserRaw } = await sa.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle() as { data: { id: string } | null }
  const byredUserId = byredUserRaw?.id
  if (!byredUserId) return NextResponse.json({ events: [], taskEvents: [] })

  // Get tenant IDs the user belongs to
  const { data: memberRows } = await sa.from("byred_user_tenants").select("tenant_id").eq("user_id", byredUserId) as { data: Array<{ tenant_id: string }> | null }
  const allTenantIds = (memberRows ?? []).map((r) => r.tenant_id)

  // If tenant_id param provided AND user has access, scope to that one; else use all
  const tenantIdParam = searchParams.get("tenant_id")
  const tenantIds = tenantIdParam && allTenantIds.includes(tenantIdParam) ? [tenantIdParam] : allTenantIds
  if (tenantIds.length === 0) return NextResponse.json({ events: [], taskEvents: [] })

  type CalEventRow = {
    id: string; title: string; description: string | null; event_type: string; status: string
    start_at: string; end_at: string | null; all_day: boolean
    calendar_color: string | null; calendar_label: string | null
    task_id: string | null; tenant_id: string; owner_user_id: string | null
    os_calendar_event_attendees: Array<{ user_id: string; rsvp: string }>
  }
  type TaskDueRow = {
    id: string; title: string; status: string; priority: string
    due_date: string | null; blocker_flag: boolean | null
    tenant_id: string; owner_user_id: string | null
  }

  // Fetch calendar events in range (match actual DB columns: start_at, end_at)
  let eventsQuery = sa
    .from("os_calendar_events")
    .select(`
      id, title, description, event_type, status,
      start_at, end_at, all_day,
      calendar_color, calendar_label,
      task_id, tenant_id, owner_user_id,
      os_calendar_event_attendees ( user_id, rsvp )
    `)
    .in("tenant_id", tenantIds)
    .neq("status", "cancelled")
    .order("start_at", { ascending: true })

  if (from) eventsQuery = eventsQuery.gte("start_at", from)
  if (to)   eventsQuery = eventsQuery.lte("start_at", to)

  const { data: events, error: eventsError } = await eventsQuery as { data: CalEventRow[] | null; error: { message: string } | null }
  if (eventsError) {
    console.error("[calendar/route] events error:", eventsError.message)
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  // Fetch tasks with due_dates as virtual calendar items
  let tasksQuery = sa
    .from("byred_tasks")
    .select("id, title, status, priority, due_date, blocker_flag, tenant_id, owner_user_id")
    .in("tenant_id", tenantIds)
    .not("due_date", "is", null)
    .not("status", "in", "(done,cancelled)")
    .order("due_date", { ascending: true })

  if (from) tasksQuery = tasksQuery.gte("due_date", from.split("T")[0])
  if (to)   tasksQuery = tasksQuery.lte("due_date", to.split("T")[0])

  const { data: tasks } = await tasksQuery as { data: TaskDueRow[] | null }

  // Normalise tasks into calendar-event shape for the UI
  const taskEvents = (tasks ?? []).map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    description: null,
    event_type: "task_due" as const,
    status: "upcoming" as const,
    start_at: `${t.due_date}T23:59:00.000Z`,
    end_at:   `${t.due_date}T23:59:00.000Z`,
    all_day: true,
    calendar_color: t.blocker_flag
      ? "#D7261E"
      : t.priority === "critical" || t.priority === "high"
      ? "#f97316"
      : "#3b82f6",
    calendar_label: null,
    task_id: t.id,
    tenant_id: t.tenant_id,
    owner_user_id: t.owner_user_id,
    os_calendar_event_attendees: [],
    _source: "task" as const,
    _task: {
      status: t.status,
      priority: t.priority,
      blocker_flag: t.blocker_flag,
    },
  }))

  return NextResponse.json({ events: events ?? [], taskEvents })
}

// POST /api/os/calendar — create a new event
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa2 = supabase as any
  const { data: profile } = await sa2
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single() as { data: { id: string } | null }

  const body = await req.json()
  const {
    tenant_id, title, description, event_type,
    start_at, end_at, all_day,
    calendar_color, calendar_label,
    task_id, attendee_ids,
  } = body

  if (!tenant_id || !title || !start_at) {
    return NextResponse.json({ error: "tenant_id, title, start_at are required" }, { status: 400 })
  }

  const { data: event, error } = await sa2
    .from("os_calendar_events")
    .insert({
      tenant_id,
      title,
      description:     description ?? null,
      event_type:      event_type ?? "meeting",
      start_at,
      end_at:          end_at ?? null,
      all_day:         all_day ?? false,
      calendar_color:  calendar_color ?? null,
      calendar_label:  calendar_label ?? null,
      task_id:         task_id ?? null,
      owner_user_id:   profile?.id ?? null,
    })
    .select()
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (attendee_ids?.length && event) {
    await sa2.from("os_calendar_event_attendees").insert(
      attendee_ids.map((uid: string) => ({ event_id: event.id, user_id: uid, rsvp: "pending" }))
    )
  }

  return NextResponse.json({ event }, { status: 201 })
}

// PATCH /api/os/calendar?id= — update event
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await req.json()
  const ALLOWED = [
    "title", "description", "event_type", "status",
    "start_at", "end_at", "all_day",
    "calendar_color", "calendar_label", "task_id",
  ]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ALLOWED) {
    if (k in body) update[k] = body[k]
  }

  const sa3 = supabase as any
  const { error } = await sa3.from("os_calendar_events").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })

  if (Array.isArray(body.attendee_ids)) {
    await sa3.from("os_calendar_event_attendees").delete().eq("event_id", id)
    if (body.attendee_ids.length > 0) {
      await sa3.from("os_calendar_event_attendees").insert(
        body.attendee_ids.map((uid: string) => ({ event_id: id, user_id: uid, rsvp: "pending" }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/os/calendar?id= — cancel event
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const sa4 = supabase as any
  const { error } = await sa4
    .from("os_calendar_events")
    .update({ status: "cancelled" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
