'use client'

import { useEffect, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/lib/context/user-context'

type CalendarItem = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean
  color: string
  source: 'event' | 'task'
  priority?: string | null
  status?: string | null
  blocker?: boolean
  tenant_id: string
  owner_user_id?: string | null
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type CreateForm = {
  title: string
  date: string
  end_date: string
  all_day: boolean
  event_type: string
}

const DEFAULT_FORM: CreateForm = {
  title: '',
  date: '',
  end_date: '',
  all_day: true,
  event_type: 'internal',
}

const EVENT_TYPES = ['internal', 'deadline', 'renewal', 'meeting', 'follow_up']

export default function CalendarPage() {
  const { activeTenantId } = useUser()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(DEFAULT_FORM)
  const [creating, setCreating] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!activeTenantId) return

    const start = startOfMonth(month).toISOString()
    const end = endOfMonth(month).toISOString()

    if (!initialized.current) {
      setLoading(true)
    } else {
      setRefetching(true)
    }

    const controller = new AbortController()

    fetch(
      `/api/os/calendar?tenant_id=${activeTenantId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then(({ items: fetched }: { items: CalendarItem[] }) => {
        setItems(fetched ?? [])
        setLoading(false)
        setRefetching(false)
        initialized.current = true
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Calendar fetch error', err)
        setLoading(false)
        setRefetching(false)
      })

    return () => controller.abort()
  }, [activeTenantId, month])

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  function itemsForDay(day: Date): CalendarItem[] {
    return items.filter((item) => isSameDay(parseISO(item.start_at), day))
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.date || !activeTenantId) return
    setCreating(true)
    try {
      const start_at = createForm.all_day
        ? `${createForm.date}T00:00:00.000Z`
        : createForm.date
      const end_at = createForm.end_date
        ? (createForm.all_day ? `${createForm.end_date}T23:59:59.000Z` : createForm.end_date)
        : null

      const res = await fetch('/api/os/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: activeTenantId,
          title: createForm.title.trim(),
          start_at,
          end_at,
          all_day: createForm.all_day,
          event_type: createForm.event_type,
        }),
      })
      if (res.ok) {
        const { event } = (await res.json()) as { event: { id: string; title: string; start_at: string; end_at: string | null; all_day: boolean; tenant_id: string } }
        const color = createForm.event_type === 'deadline' || createForm.event_type === 'renewal' ? '#D7261E' : '#2563eb'
        setItems((prev) => [...prev, { ...event, color, source: 'event' as const }])
        setShowCreate(false)
        setCreateForm(DEFAULT_FORM)
        toast.success('Event created')
      } else {
        toast.error('Failed to create event')
      }
    } catch {
      toast.error('Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <CalendarSkeleton />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5" style={{ color: '#D7261E' }} strokeWidth={1.75} />
          <h1 className="text-2xl font-condensed font-bold tracking-tight">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
            style={{ background: '#D7261E', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
            New Event
          </button>
        <div className="flex items-center gap-1">
          {refetching && (
            <Loader2 className="w-4 h-4 animate-spin mr-1" style={{ color: '#D7261E' }} />
          )}
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded transition"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium w-36 text-center tabular-nums select-none">
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded transition"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="ml-2 px-3 py-1 text-xs font-semibold rounded transition"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#A1A1AA',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)')
            }
          >
            Today
          </button>
        </div>
        </div>
      </div>

      {/* Create event modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}
        >
          <form
            onSubmit={(e) => void handleCreateEvent(e)}
            style={{
              background: '#18181B', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FAFAFA', textTransform: 'uppercase', letterSpacing: 0.8 }}>New Event</p>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              autoFocus
              type="text"
              placeholder="Event title"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              required
              style={{ height: 36, padding: '0 10px', background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#FAFAFA', fontSize: 12, outline: 'none' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 }}>Start</p>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  style={{ height: 36, padding: '0 10px', background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#FAFAFA', fontSize: 12, outline: 'none', width: '100%' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 }}>End (optional)</p>
                <input
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, end_date: e.target.value }))}
                  style={{ height: 36, padding: '0 10px', background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#FAFAFA', fontSize: 12, outline: 'none', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 }}>Type</p>
                <select
                  value={createForm.event_type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, event_type: e.target.value }))}
                  style={{ height: 36, padding: '0 8px', background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#FAFAFA', fontSize: 12, outline: 'none', width: '100%' }}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                <input
                  type="checkbox"
                  id="all_day"
                  checked={createForm.all_day}
                  onChange={(e) => setCreateForm((f) => ({ ...f, all_day: e.target.checked }))}
                />
                <label htmlFor="all_day" style={{ fontSize: 11, color: '#A1A1AA', cursor: 'pointer' }}>All day</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ fontSize: 11, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button
                type="submit"
                disabled={creating || !createForm.title.trim() || !createForm.date}
                style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', background: creating ? '#52525B' : '#D7261E', border: 'none', borderRadius: 3, padding: '7px 16px', cursor: 'pointer' }}
              >
                {creating ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold tracking-widest uppercase py-2"
            style={{ color: '#52525B' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 border-t border-l"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        {calDays.map((day) => {
          const dayItems = itemsForDay(day)
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className="min-h-[104px] p-2 border-b border-r flex flex-col"
              style={{
                borderColor: 'rgba(255,255,255,0.07)',
                background: today
                  ? 'rgba(215,38,30,0.06)'
                  : inMonth
                    ? '#18181B'
                    : '#0F0F10',
              }}
            >
              <span
                className="text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0"
                style={{
                  color: today ? '#fff' : inMonth ? '#A1A1AA' : '#3f3f46',
                  background: today ? '#D7261E' : 'transparent',
                  fontWeight: today ? 700 : 400,
                }}
              >
                {format(day, 'd')}
              </span>

              <div className="flex flex-col gap-0.5 min-w-0">
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    title={`${item.source === 'task' ? '📋 ' : '📅 '}${item.title}`}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium leading-tight cursor-default"
                    style={{
                      background: `${item.color}22`,
                      color: item.color,
                      border: `1px solid ${item.color}44`,
                    }}
                  >
                    {item.title}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[9px] px-1 leading-tight" style={{ color: '#52525B' }}>
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {[
          { color: '#D7261E', label: 'Blocker / Deadline' },
          { color: '#ea7400', label: 'High / Critical' },
          { color: '#2563eb', label: 'Task / Event' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <span className="text-[10px]" style={{ color: '#71717A' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 rounded" style={{ background: '#27272A' }} />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded" style={{ background: '#27272A' }} />
          <div className="h-5 w-36 rounded" style={{ background: '#27272A' }} />
          <div className="h-8 w-8 rounded" style={{ background: '#27272A' }} />
          <div className="h-7 w-16 rounded ml-2" style={{ background: '#27272A' }} />
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-5 rounded" style={{ background: '#27272A' }} />
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gap: '1px', background: 'rgba(255,255,255,0.07)' }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 p-2" style={{ background: '#18181B' }}>
            <div className="h-4 w-4 rounded-full" style={{ background: '#27272A' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
