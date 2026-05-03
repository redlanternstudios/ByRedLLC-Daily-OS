import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/os/calendar?tenant_id=&from=&to=
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tenant_id = searchParams.get("tenant_id")
  const from = searchParams.get("from")
  const to   = searchParams.get("to")

  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 })

  // Fetch calendar events in range (match actual DB columns: start_at, end_at)
  let eventsQuery = supabase
    .from("os_calendar_events")
    .select(`
      id, title, description, event_type, status,
      start_at, end_at, all_day,
      calendar_color, calendar_label,
      task_id, tenant_id, owner_user_id,
      os_calendar_event_attendees ( user_id, rsvp )
    `)
    .eq("tenant_id", tenant_id)
    .neq("status", "cancelled")
    .order("start_at", { ascending: true })

  if (from) eventsQuery = eventsQuery.gte("start_at", from)
  if (to)   eventsQuery = eventsQuery.lte("start_at", to)

  const { data: events, error: eventsError } = await eventsQuery
  if (eventsError) {
    console.error("[calendar/route] events error:", eventsError.message)
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  // Fetch tasks with due_dates as virtual calendar items
  let tasksQuery = supabase
    .from("byred_tasks")
    .select("id, title, status, priority, due_date, blocker_flag, tenant_id, owner_user_id")
    .eq("tenant_id", tenant_id)
    .not("due_date", "is", null)
    .not("status", "in", "(done,cancelled)")
    .order("due_date", { ascending: true })

  if (from) tasksQuery = tasksQuery.gte("due_date", from.split("T")[0])
  if (to)   tasksQuery = tasksQuery.lte("due_date", to.split("T")[0])

  const { data: tasks } = await tasksQuery

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

  const { data: profile } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

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

  const { data: event, error } = await supabase
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
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (attendee_ids?.length && event) {
    await supabase.from("os_calendar_event_attendees").insert(
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

  const { error } = await supabase.from("os_calendar_events").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (Array.isArray(body.attendee_ids)) {
    await supabase.from("os_calendar_event_attendees").delete().eq("event_id", id)
    if (body.attendee_ids.length > 0) {
      await supabase.from("os_calendar_event_attendees").insert(
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

  const { error } = await supabase
    .from("os_calendar_events")
    .update({ status: "cancelled" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
