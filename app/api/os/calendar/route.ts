import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/os/calendar?tenant_id=&from=&to=
// Returns os_calendar_events + byred_tasks with due_dates in range
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tenant_id = searchParams.get("tenant_id")
  const from = searchParams.get("from") // ISO date string
  const to = searchParams.get("to")     // ISO date string

  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 })

  // Fetch calendar events in range
  let eventsQuery = supabase
    .from("os_calendar_events")
    .select(`
      id, title, description, event_type, status,
      starts_at, ends_at, all_day, location, meeting_url,
      color, project_id, task_id, monday_item_id,
      recurrence_rule, recurrence_end,
      created_by_user_id, tenant_id,
      os_calendar_event_attendees ( user_id, rsvp, byred_users ( name, email, avatar_url ) )
    `)
    .eq("tenant_id", tenant_id)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })

  if (from) eventsQuery = eventsQuery.gte("starts_at", from)
  if (to)   eventsQuery = eventsQuery.lte("starts_at", to)

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) {
    console.error("[calendar/route] events error:", eventsError.message)
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  // Fetch tasks with due_dates as virtual calendar items
  let tasksQuery = supabase
    .from("byred_tasks")
    .select("id, title, status, priority, due_date, blocker_flag, tenant_id, owner_user_id, byred_users!owner_user_id ( name, avatar_url )")
    .eq("tenant_id", tenant_id)
    .not("due_date", "is", null)
    .not("status", "in", "(done,cancelled)")
    .order("due_date", { ascending: true })

  if (from) tasksQuery = tasksQuery.gte("due_date", from.split("T")[0])
  if (to)   tasksQuery = tasksQuery.lte("due_date", to.split("T")[0])

  const { data: tasks, error: tasksError } = await tasksQuery

  if (tasksError) {
    console.error("[calendar/route] tasks error:", tasksError.message)
    // Non-fatal — return events only
  }

  // Normalise tasks into calendar-event shape for the UI
  const taskEvents = (tasks ?? []).map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    description: null,
    event_type: "task" as const,
    status: "confirmed" as const,
    starts_at: `${t.due_date}T23:59:00.000Z`,
    ends_at: `${t.due_date}T23:59:00.000Z`,
    all_day: true,
    location: null,
    meeting_url: null,
    // colour: blockers red, high/critical orange, rest blue
    color: t.blocker_flag
      ? "#D7261E"
      : t.priority === "critical" || t.priority === "high"
      ? "#f97316"
      : "#3b82f6",
    project_id: null,
    task_id: t.id,
    monday_item_id: null,
    created_by_user_id: t.owner_user_id,
    tenant_id: t.tenant_id,
    _source: "task" as const,
    _task: {
      status: t.status,
      priority: t.priority,
      blocker_flag: t.blocker_flag,
      owner: t.byred_users,
    },
    os_calendar_event_attendees: [],
  }))

  return NextResponse.json({
    events: events ?? [],
    taskEvents,
  })
}

// POST /api/os/calendar — create a new event
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Look up byred_users.id for created_by
  const { data: profile } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  const body = await req.json()
  const {
    tenant_id, title, description, event_type, starts_at, ends_at,
    all_day, location, meeting_url, color, project_id, task_id,
    recurrence_rule, recurrence_end,
    attendee_ids,
  } = body

  if (!tenant_id || !title || !starts_at || !ends_at) {
    return NextResponse.json({ error: "tenant_id, title, starts_at, ends_at are required" }, { status: 400 })
  }

  // ends_at must be after starts_at
  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json({ error: "ends_at must be after starts_at" }, { status: 422 })
  }

  const VALID_RECURRENCE = ["daily", "weekly", "biweekly", "monthly"]
  if (recurrence_rule && !VALID_RECURRENCE.includes(recurrence_rule)) {
    return NextResponse.json({ error: `Invalid recurrence_rule. Must be one of: ${VALID_RECURRENCE.join(", ")}` }, { status: 422 })
  }

  const { data: event, error } = await supabase
    .from("os_calendar_events")
    .insert({
      tenant_id,
      title,
      description: description ?? null,
      event_type: event_type ?? "meeting",
      starts_at,
      ends_at,
      all_day: all_day ?? false,
      location: location ?? null,
      meeting_url: meeting_url ?? null,
      color: color ?? null,
      project_id: project_id ?? null,
      task_id: task_id ?? null,
      recurrence_rule: recurrence_rule ?? null,
      recurrence_end: recurrence_end ?? null,
      created_by_user_id: profile?.id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add attendees if provided
  if (attendee_ids?.length && event) {
    const attendees = attendee_ids.map((uid: string) => ({
      event_id: event.id,
      user_id: uid,
      rsvp: "pending",
    }))
    await supabase.from("os_calendar_event_attendees").insert(attendees)
  }

  return NextResponse.json({ event }, { status: 201 })
}

// PATCH /api/os/calendar?id= — update event status/details
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await req.json()

  // Whitelist updatable fields — never let caller overwrite id/tenant_id/created_by
  const ALLOWED = [
    "title","description","event_type","status","starts_at","ends_at",
    "all_day","location","meeting_url","color","project_id","task_id",
    "recurrence_rule","recurrence_end",
  ]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ALLOWED) {
    if (k in body) update[k] = body[k]
  }

  // Validate recurrence if provided
  const VALID_RECURRENCE = ["daily","weekly","biweekly","monthly"]
  if (update.recurrence_rule && !VALID_RECURRENCE.includes(update.recurrence_rule as string)) {
    return NextResponse.json({ error: "Invalid recurrence_rule" }, { status: 422 })
  }

  // Validate time ordering if both times provided
  if (update.starts_at && update.ends_at && new Date(update.ends_at as string) <= new Date(update.starts_at as string)) {
    return NextResponse.json({ error: "ends_at must be after starts_at" }, { status: 422 })
  }

  const { error } = await supabase
    .from("os_calendar_events")
    .update(update)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync attendees if provided
  if (Array.isArray(body.attendee_ids)) {
    // Delete existing then re-insert
    await supabase.from("os_calendar_event_attendees").delete().eq("event_id", id)
    if (body.attendee_ids.length > 0) {
      await supabase.from("os_calendar_event_attendees").insert(
        body.attendee_ids.map((uid: string) => ({ event_id: id, user_id: uid, rsvp: "pending" }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/os/calendar?id= — cancel/delete event
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
