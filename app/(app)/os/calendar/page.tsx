"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import {
  ChevronLeft, ChevronRight, Calendar, List, Table2,
  Clock, X, Plus, Loader2, AlertCircle,
  Trash2, Edit3, Save, Filter, Tag,
  CheckSquare, ChevronDown,
} from "lucide-react"
import { useRequiredUser } from "@/lib/context/user-context"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Attendee = {
  user_id: string
  rsvp: "accepted" | "declined" | "pending"
}

type CalendarEventRow = {
  id: string
  title: string
  description: string | null
  event_type: "meeting" | "deadline" | "milestone" | "task_due" | "reminder" | "block"
  status: "upcoming" | "in_progress" | "done" | "cancelled"
  start_at: string
  end_at: string | null
  all_day: boolean
  calendar_color: string | null
  calendar_label: string | null
  task_id: string | null
  tenant_id: string
  owner_user_id: string | null
  os_calendar_event_attendees: Attendee[]
  // task-derived
  _source?: "task"
  _task?: {
    status: string
    priority: string
    blocker_flag: boolean
  }
}

type CalendarResponse = {
  events: CalendarEventRow[]
  taskEvents: CalendarEventRow[]
}

type FilterState = {
  eventTypes: string[]
  userIds: string[]
  hasProject: boolean | null
  search: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const EVENT_TYPES = [
  { value: "meeting",   label: "Meeting" },
  { value: "deadline",  label: "Deadline" },
  { value: "milestone", label: "Milestone" },
  { value: "task",      label: "Task Due" },
  { value: "reminder",  label: "Reminder" },
  { value: "block",     label: "Focus Block" },
]

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting:   "#6366f1",
  deadline:  "#D7261E",
  milestone: "#f59e0b",
  task:      "#3b82f6",
  reminder:  "#8b5cf6",
  block:     "#374151",
}

const COLOR_PRESETS = [
  "#D7261E", "#f97316", "#f59e0b", "#22c55e",
  "#6366f1", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#374151",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventColor(evt: CalendarEventRow): string {
  if (evt.calendar_color) return evt.calendar_color
  if (evt._source === "task" && evt._task) {
    if (evt._task.blocker_flag) return "#D7261E"
    if (evt._task.priority === "critical" || evt._task.priority === "high") return "#f97316"
  }
  return EVENT_TYPE_COLORS[evt.event_type] ?? "#3b82f6"
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: number | null; iso: string | null }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, iso: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ date: d, iso })
  }
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push({ date: null, iso: null })
  return cells
}

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString()
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { from, to }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function toLocalInputDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toLocalInputDate(iso: string): string {
  return iso.split("T")[0]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Expand a recurring event into all occurrences within [rangeFrom, rangeTo]
function expandRecurring(evt: CalendarEventRow, _rangeFrom: Date, _rangeTo: Date): CalendarEventRow[] {
  // No recurrence support in current schema — pass through as-is
  return [evt]
}

// ─── EventPill ────────────────────────────────────────────────────────────────

function EventPill({ evt, onClick }: { evt: CalendarEventRow; onClick: () => void }) {
  const color = getEventColor(evt)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white truncate hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
    >
      {evt.title}
    </button>
  )
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-all",
            value === c ? "border-white scale-110" : "border-transparent hover:border-zinc-500"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-full cursor-pointer border border-zinc-700 bg-transparent"
        title="Custom color"
      />
    </div>
  )
}

// ─── EventFormModal ───────────────────────────────────────────────────────────

type EventFormData = {
  title: string
  description: string
  event_type: string
  start_at: string
  end_at: string
  all_day: boolean
  calendar_color: string
  task_id: string
  attendee_ids: string[]
}

function EventFormModal({
  tenantId,
  apiKey,
  editEvent,
  defaultDate,
  directoryUsers,
  onClose,
  onSaved,
}: {
  tenantId: string
  apiKey: string
  editEvent: CalendarEventRow | null
  defaultDate: string | null
  directoryUsers: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const now = new Date()
  const defaultStart = defaultDate
    ? `${defaultDate}T09:00`
    : toLocalInputDatetime(now.toISOString())
  const defaultEnd = defaultDate
    ? `${defaultDate}T10:00`
    : toLocalInputDatetime(new Date(now.getTime() + 3600_000).toISOString())

  const [form, setForm] = useState<EventFormData>({
    title: editEvent?.title ?? "",
    description: editEvent?.description ?? "",
    event_type: editEvent?.event_type ?? "meeting",
    start_at: editEvent ? (editEvent.all_day ? `${toLocalInputDate(editEvent.start_at)}T09:00` : toLocalInputDatetime(editEvent.start_at)) : defaultStart,
    end_at: editEvent ? (editEvent.all_day ? `${toLocalInputDate(editEvent.start_at)}T10:00` : toLocalInputDatetime(editEvent.end_at ?? editEvent.start_at)) : defaultEnd,
    all_day: editEvent?.all_day ?? false,
    calendar_color: editEvent?.calendar_color ?? EVENT_TYPE_COLORS["meeting"],
    task_id: editEvent?.task_id ?? "",
    attendee_ids: editEvent?.os_calendar_event_attendees?.map((a) => a.user_id) ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof EventFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Auto-set color when type changes (if user hasn't customized)
  useEffect(() => {
    if (!editEvent) {
      set("calendar_color", EVENT_TYPE_COLORS[form.event_type] ?? "#3b82f6")
    }
  }, [form.event_type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError("Title is required"); return }

    const startAt = form.all_day
      ? new Date(form.start_at.split("T")[0] + "T00:00:00Z").toISOString()
      : new Date(form.start_at).toISOString()
    const endAt = form.all_day
      ? new Date(form.start_at.split("T")[0] + "T23:59:59Z").toISOString()
      : new Date(form.end_at).toISOString()

    if (endAt <= startAt && !form.all_day) {
      setError("End time must be after start time")
      return
    }

    setSaving(true)
    try {
      const payload = {
        tenant_id: tenantId,
        title: form.title.trim(),
        description: form.description || null,
        event_type: form.event_type,
        start_at: startAt,
        end_at: endAt,
        all_day: form.all_day,
        calendar_color: form.calendar_color || null,
        task_id: form.task_id || null,
        attendee_ids: form.attendee_ids,
      }

      const url = editEvent
        ? `/api/os/calendar?id=${editEvent.id}`
        : "/api/os/calendar"
      const method = editEvent ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to save event"); return }
      onSaved()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const toggleAttendee = (id: string) =>
    set("attendee_ids", form.attendee_ids.includes(id)
      ? form.attendee_ids.filter((x) => x !== id)
      : [...form.attendee_ids, id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {editEvent ? "Edit Event" : "New Event"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
            <X className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">Title *</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Event title..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Type + Color row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">Type</label>
                <select
                  value={form.event_type}
                  onChange={(e) => set("event_type", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">Color</label>
                <ColorPicker value={form.calendar_color} onChange={(c) => set("calendar_color", c)} />
              </div>
            </div>

            {/* All day toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("all_day", !form.all_day)}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors",
                  form.all_day ? "bg-[#D7261E]" : "bg-zinc-700"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow",
                  form.all_day ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
              <span className="text-xs text-zinc-400">All day event</span>
            </div>

            {/* Date / time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">
                  {form.all_day ? "Date" : "Start"}
                </label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.all_day ? form.start_at.split("T")[0] : form.start_at}
                  onChange={(e) => set("start_at", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
              {!form.all_day && (
                <div>
                  <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">End</label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => set("end_at", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}
            </div>



            {/* Description */}
            <div>
              <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">Notes</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Additional context..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
              />
            </div>

            {/* Attendees */}
            {directoryUsers.length > 0 && (
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium uppercase tracking-widest mb-1.5">Attendees</label>
                <div className="space-y-1">
                  {directoryUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAttendee(u.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors border",
                        form.attendee_ids.includes(u.id)
                          ? "bg-zinc-800 border-zinc-600 text-white"
                          : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] text-zinc-300 shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                      {form.attendee_ids.includes(u.id) && (
                        <span className="ml-auto text-[10px] text-green-400">Added</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-zinc-950">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D7261E] hover:bg-[#b91c1c] text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {editEvent ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Event Detail Panel ───────────────────────────────────────────────────────

function EventDetailPanel({
  event,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: {
  event: CalendarEventRow
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const color = getEventColor(event)
  const startDate = new Date(event.start_at)
  const [deleting, setDeleting] = useState(false)

  const dateLabel = event.all_day
    ? startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : `${startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${fmtTime(event.start_at)}${event.end_at ? ` – ${fmtTime(event.end_at)}` : ""}`

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const isTaskEvent = event._source === "task"

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-semibold text-white">Event Detail</span>
        <div className="flex items-center gap-1.5">
          {canEdit && !isTaskEvent && (
            <>
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
                title="Edit event"
              >
                <Edit3 className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-red-700 hover:text-red-400 transition-colors"
                title="Delete event"
              >
                {deleting
                  ? <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                  : <Trash2 className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                }
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        <div className="h-0.5 rounded-full" style={{ backgroundColor: color }} />

        <div>
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
            {EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type}
            {isTaskEvent && " · Task Due"}
          </span>
          <h2 className="text-base font-semibold text-white mt-1 leading-snug">{event.title}</h2>
        </div>

        {event.description && (
          <p className="text-sm text-zinc-400 leading-relaxed">{event.description}</p>
        )}

        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
            <span className="text-zinc-400">{dateLabel}</span>
          </div>
          {event.calendar_label && (
            <div className="flex items-start gap-2 text-xs">
              <Tag className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
              <span className="text-zinc-400">{event.calendar_label}</span>
            </div>
          )}
          {event.task_id && (
            <div className="flex items-start gap-2 text-xs">
              <CheckSquare className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
              <span className="text-zinc-500">Linked to task</span>
            </div>
          )}
        </div>

        {isTaskEvent && event._task && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Task</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                event._task.priority === "critical" ? "bg-red-950 text-red-300 border-red-800" :
                event._task.priority === "high"     ? "bg-orange-950 text-orange-300 border-orange-800" :
                event._task.priority === "medium"   ? "bg-amber-950 text-amber-300 border-amber-800" :
                                                      "bg-zinc-800 text-zinc-400 border-zinc-700"
              )}>
                {event._task.priority}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                event._task.status === "in_progress" ? "bg-sky-950 text-sky-300 border-sky-800" :
                event._task.status === "blocked"      ? "bg-red-950 text-red-300 border-red-800" :
                event._task.status === "done"         ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                                                        "bg-zinc-800 text-zinc-400 border-zinc-700"
              )}>
                {event._task.status.replace(/_/g, " ")}
              </span>
              {event._task.blocker_flag && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Blocker
                </span>
              )}
            </div>
          </div>
        )}

          {event.os_calendar_event_attendees?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              Attendees ({event.os_calendar_event_attendees.length})
            </p>
            {event.os_calendar_event_attendees.map((a) => (
              <div key={a.user_id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-400 font-semibold shrink-0">
                  ?
                </div>
                <span className="text-xs text-zinc-400 flex-1 font-mono text-[10px]">{a.user_id.slice(0, 8)}…</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  a.rsvp === "accepted" ? "bg-emerald-950/60 text-emerald-400" :
                  a.rsvp === "declined" ? "bg-red-950/60 text-red-400" :
                                          "bg-zinc-800 text-zinc-500"
                )}>
                  {a.rsvp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
  directoryUsers,
}: {
  filters: FilterState
  onChange: (f: FilterState) => void
  directoryUsers: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = filters.eventTypes.length + filters.userIds.length + (filters.search ? 1 : 0)

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOut)
    return () => document.removeEventListener("mousedown", onClickOut)
  }, [])

  const toggleType = (t: string) =>
    onChange({
      ...filters,
      eventTypes: filters.eventTypes.includes(t)
        ? filters.eventTypes.filter((x) => x !== t)
        : [...filters.eventTypes, t],
    })

  const toggleUser = (id: string) =>
    onChange({
      ...filters,
      userIds: filters.userIds.includes(id)
        ? filters.userIds.filter((x) => x !== id)
        : [...filters.userIds, id],
    })

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
          activeCount > 0
            ? "bg-zinc-800 border-zinc-600 text-white"
            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
        Filter
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-[#D7261E] text-white text-[10px] font-bold">{activeCount}</span>
        )}
        <ChevronDown className="w-3 h-3 ml-0.5" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <input
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Search events..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Type filters */}
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Event Type</p>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors",
                    filters.eventTypes.includes(t.value)
                      ? "bg-zinc-700 border-zinc-500 text-white"
                      : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: EVENT_TYPE_COLORS[t.value] }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* User filters */}
          {directoryUsers.length > 0 && (
            <div className="p-3 border-b border-zinc-800">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">People</p>
              <div className="space-y-1">
                {directoryUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors",
                      filters.userIds.includes(u.id)
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          {activeCount > 0 && (
            <div className="p-2">
              <button
                onClick={() => onChange({ eventTypes: [], userIds: [], hasProject: null, search: "" })}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  events,
  onSelect,
}: {
  events: CalendarEventRow[]
  onSelect: (e: CalendarEventRow) => void
}) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Event</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Type</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Time</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Attendees</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-600">
                  No events match the current filters.
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const color = getEventColor(evt)
                return (
                  <tr
                    key={evt.id}
                    onClick={() => onSelect(evt)}
                    className="border-b border-zinc-800/50 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-zinc-200 font-medium truncate max-w-[180px]">{evt.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-zinc-500">
                        {EVENT_TYPES.find((t) => t.value === evt.event_type)?.label ?? evt.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {fmtDate(evt.start_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {evt.all_day ? "All day" : fmtTime(evt.start_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {evt.os_calendar_event_attendees.slice(0, 3).map((a) => (
                          <div
                            key={a.user_id}
                            className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-300"
                          >
                            ?
                          </div>
                        ))}
                        {evt.os_calendar_event_attendees.length > 3 && (
                          <span className="text-[10px] text-zinc-500 ml-2">+{evt.os_calendar_event_attendees.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                        evt.status === "upcoming"     ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                        evt.status === "in_progress"  ? "bg-sky-950 text-sky-300 border-sky-800" :
                                                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                      )}>
                        {evt.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OSCalendarPage() {
  const currentUser = useRequiredUser()
  const { activeTenantId, profile, directory } = currentUser

  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView]           = useState<"month" | "agenda" | "table">("month")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRow | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | null>(null)
  const [dayPopover, setDayPopover] = useState<{ iso: string; events: CalendarEventRow[] } | null>(null)
  const [filters, setFilters]     = useState<FilterState>({
    eventTypes: [], userIds: [], hasProject: null, search: "",
  })

  const { from, to } = useMemo(() => getMonthRange(viewYear, viewMonth), [viewYear, viewMonth])

  const apiUrl = activeTenantId
    ? `/api/os/calendar?tenant_id=${activeTenantId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : null

  const { data, isLoading, error, mutate } = useSWR<CalendarResponse>(apiUrl, fetcher, {
    keepPreviousData: true,
  })

  const allItems = useMemo(() => {
    if (!data) return []
    const rangeFrom = new Date(from)
    const rangeTo = new Date(to)
    // Expand recurring events; non-recurring pass through as-is
    const expanded = (data.events ?? []).flatMap((e) =>
      e.recurrence_rule ? expandRecurring(e, rangeFrom, rangeTo) : [e]
    )
    return [...expanded, ...(data.taskEvents ?? [])].sort(
      (a, b) => a.start_at.localeCompare(b.start_at)
    )
  }, [data, from, to])

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = allItems
    if (filters.eventTypes.length > 0)
      items = items.filter((e) => filters.eventTypes.includes(e.event_type))
    if (filters.userIds.length > 0)
      items = items.filter((e) =>
        (e.owner_user_id && filters.userIds.includes(e.owner_user_id)) ||
        e.os_calendar_event_attendees?.some((a) => filters.userIds.includes(a.user_id))
      )
    if (filters.search)
      items = items.filter((e) =>
        e.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.description?.toLowerCase().includes(filters.search.toLowerCase())
      )
    return items
  }, [allItems, filters])

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const today = now.toISOString().split("T")[0]
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  function eventsForDay(iso: string) {
    return filteredItems.filter((e) => {
      const eventDate = e.start_at.split("T")[0]
      return eventDate === iso
    })
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const upcomingItems = useMemo(
    () => filteredItems.filter((e) => e.start_at >= now.toISOString()).slice(0, 30),
    [filteredItems]
  )

  async function handleDelete() {
    if (!selectedEvent || selectedEvent._source === "task") return
    await fetch(`/api/os/calendar?id=${selectedEvent.id}`, { method: "DELETE" })
    setSelectedEvent(null)
    mutate()
  }

  function handleEdit() {
    setEditingEvent(selectedEvent)
    setSelectedEvent(null)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditingEvent(null)
    setDefaultDate(null)
    mutate()
  }

  function openNewEventOnDate(iso: string) {
    setDefaultDate(iso)
    setEditingEvent(null)
    setShowForm(true)
  }

  // Directory users for attendee picker + filter
  const directoryUsers = useMemo(() => {
    const self = profile ? [{ id: profile.id, name: profile.name }] : []
    const others = (directory ?? []).map((d) => ({ id: d.id, name: d.name }))
    return [...self, ...others]
  }, [profile, directory])

  // All authenticated users can create/edit their own events; admins can edit any
  const canEdit = true

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Tasks, milestones and meetings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {([
              { id: "month",  label: "Month",  icon: Calendar },
              { id: "agenda", label: "Agenda", icon: List },
              { id: "table",  label: "Table",  icon: Table2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  view === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            directoryUsers={directoryUsers}
          />

          <button
            onClick={() => { setEditingEvent(null); setDefaultDate(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D7261E] hover:bg-[#b91c1c] text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New Event
          </button>
        </div>
      </div>

      {/* Filter chips (active filters summary) */}
      {(filters.eventTypes.length > 0 || filters.userIds.length > 0 || filters.search) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-zinc-600">Filtered:</span>
          {filters.eventTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilters((f) => ({ ...f, eventTypes: f.eventTypes.filter((x) => x !== t) }))}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 hover:border-red-700 hover:text-red-400 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[t] }} />
              {EVENT_TYPES.find((x) => x.value === t)?.label}
              <X className="w-2.5 h-2.5" />
            </button>
          ))}
          {filters.userIds.map((id) => {
            const u = directoryUsers.find((x) => x.id === id)
            return u ? (
              <button
                key={id}
                onClick={() => setFilters((f) => ({ ...f, userIds: f.userIds.filter((x) => x !== id) }))}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 hover:border-red-700 hover:text-red-400 transition-colors"
              >
                {u.name}
                <X className="w-2.5 h-2.5" />
              </button>
            ) : null
          })}
          {filters.search && (
            <button
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 hover:border-red-700 hover:text-red-400 transition-colors"
            >
              &quot;{filters.search}&quot;
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load calendar events. Check your connection and try again.
        </div>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      )}

      {(!isLoading || data) && (
        <>
          {/* Month view */}
          {view === "month" && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <button
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }}
                    className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Today
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{monthLabel}</span>
                    {isLoading && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />}
                  </div>
                </div>
                <button
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-zinc-800">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((cell, i) => {
                  const dayEvents = cell.iso ? eventsForDay(cell.iso) : []
                  const isToday = cell.iso === today
                  return (
                    <div
                      key={i}
                      onClick={() => cell.iso && openNewEventOnDate(cell.iso)}
                      className={cn(
                        "min-h-[84px] border-b border-r border-zinc-800/50 p-1.5 cursor-pointer group",
                        !cell.date && "bg-zinc-950/40 cursor-default",
                        isToday && "bg-[#D7261E]/5",
                        cell.date && "hover:bg-white/[0.02]"
                      )}
                    >
                      {cell.date && (
                        <>
                          <span className={cn(
                            "inline-flex w-5 h-5 items-center justify-center rounded-full text-[11px] font-medium mb-1",
                            isToday ? "bg-[#D7261E] text-white" : "text-zinc-500 group-hover:text-zinc-300"
                          )}>
                            {cell.date}
                          </span>
                          <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                            {dayEvents.slice(0, 2).map((evt) => (
                              <EventPill
                                key={evt.id}
                                evt={evt}
                                onClick={() => setSelectedEvent(evt)}
                              />
                            ))}
                            {dayEvents.length > 2 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDayPopover({ iso: cell.iso!, events: dayEvents }) }}
                                className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1 transition-colors"
                              >
                                +{dayEvents.length - 2} more
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Agenda view */}
          {view === "agenda" && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Upcoming</span>
                  {isLoading && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />}
                </div>
                <span className="text-xs text-zinc-600">{upcomingItems.length} events</span>
              </div>
              {upcomingItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-600">
                  No upcoming events or task deadlines.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {upcomingItems.map((evt) => {
                    const color = getEventColor(evt)
                    return (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 font-medium truncate">{evt.title}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {EVENT_TYPES.find((t) => t.value === evt.event_type)?.label ?? evt.event_type}
                            {evt._source === "task" && evt._task && <> · {evt._task.priority} priority</>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-zinc-400">{fmtDate(evt.start_at)}</p>
                          {!evt.all_day && (
                            <p className="text-[10px] text-zinc-600">{fmtTime(evt.start_at)}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Table view */}
          {view === "table" && (
            <TableView events={filteredItems} onSelect={setSelectedEvent} />
          )}
        </>
      )}

      {/* Event detail side panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
        />
      )}

      {/* Create / Edit modal */}
      {showForm && activeTenantId && (
        <EventFormModal
          tenantId={activeTenantId}
          apiKey={apiUrl ?? ""}
          editEvent={editingEvent}
          defaultDate={defaultDate}
          directoryUsers={directoryUsers}
          onClose={() => { setShowForm(false); setEditingEvent(null); setDefaultDate(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Day overflow popover */}
      {dayPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDayPopover(null)} />
          <div className="relative z-10 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-xs font-semibold text-white">
                {new Date(dayPopover.iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
              <button
                onClick={() => setDayPopover(null)}
                className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
              >
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              {dayPopover.events.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => { setSelectedEvent(evt); setDayPopover(null) }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt) }} />
                  <span className="text-xs text-zinc-300 truncate">{evt.title}</span>
                  {!evt.all_day && (
                    <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{fmtTime(evt.starts_at)}</span>
                  )}
                  {evt.all_day && (
                    <span className="ml-auto text-[10px] text-zinc-600 shrink-0">All day</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => { openNewEventOnDate(dayPopover.iso); setDayPopover(null) }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors border border-dashed border-zinc-800 mt-1"
              >
                <Plus className="w-3 h-3" />
                Add event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
