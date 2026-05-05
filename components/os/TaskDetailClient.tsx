'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { MentionTextarea } from '@/components/byred/mention-textarea'
import { useTeamMembers } from '@/lib/hooks/use-team-members'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'blocked', 'overdue', 'done', 'cancelled']
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low']

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
}

const STATUS_COLOR: Record<string, string> = {
  not_started: '#71717A',
  in_progress: '#38BDF8',
  done: '#22C55E',
  overdue: '#D7261E',
  blocked: '#F59E0B',
  cancelled: '#52525B',
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMinutes(min: number | null) {
  if (!min) return '—'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

type DirectoryUser = { id: string; name: string; avatar_url: string | null }

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string | null
  priority: string | null
  due_date: string | null
  estimated_minutes: number | null
  revenue_impact_score: number | null
  urgency_score: number | null
  ai_mode: string | null
  blocker_flag: boolean | null
  is_low_hanging_fruit: boolean | null
  is_ready_for_ai: boolean | null
  needs_decision: boolean | null
  definition_of_done: string | null
  acceptance_criteria: string | null
  owner_user_id: string | null
  support_user_ids?: string[] | null
  created_at: string | null
  updated_at: string | null
}

type Patch = Partial<Pick<TaskRow, 'status' | 'priority' | 'due_date' | 'title' | 'description' | 'owner_user_id' | 'support_user_ids'>>

export function TaskDetailClient({ task: initial, directory = [] }: { task: TaskRow; directory?: DirectoryUser[] }) {
  const [task, setTask] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState(initial.description ?? '')
  const teamMembers = useTeamMembers()

  async function patch(update: Patch) {
    setSaving(true)
    const optimistic = { ...task, ...update }
    setTask(optimistic)
    try {
      const res = await fetch(`/api/os/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) {
        setTask(task) // rollback
        toast.error('Failed to save')
      }
    } catch {
      setTask(task)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const statusColor = STATUS_COLOR[task.status ?? ''] ?? '#71717A'
  const priorityColor = PRIORITY_COLOR[task.priority ?? ''] ?? '#71717A'

  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: 800 }}>
      {/* Back nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Link href="/os/tasks" style={{ fontSize: 11, color: '#52525B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← Tasks
        </Link>
        {saving && <span style={{ fontSize: 10, color: '#52525B' }}>Saving…</span>}
      </div>

      {/* Title row */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          {/* Editable title */}
          <h1
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const v = e.currentTarget.textContent?.trim() ?? ''
              if (v && v !== task.title) void patch({ title: v })
            }}
            style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', flex: 1, outline: 'none', cursor: 'text', borderBottom: '1px solid transparent' }}
            onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderBottomColor = 'rgba(255,255,255,0.2)')}
          >
            {task.title}
          </h1>
          {/* Status picker */}
          <select
            value={task.status ?? 'not_started'}
            onChange={(e) => void patch({ status: e.target.value })}
            style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
              background: `${statusColor}18`, color: statusColor,
              border: `1px solid ${statusColor}44`, cursor: 'pointer', outline: 'none',
              flexShrink: 0,
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} style={{ background: '#18181B', color: '#FAFAFA' }}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        {/* Editable description */}
        <MentionTextarea
          value={description}
          onChange={setDescription}
          users={teamMembers}
          onBlur={() => {
            const v = description.trim()
            if (v !== (task.description ?? '')) void patch({ description: v || null })
          }}
          placeholder="Add description… (@name to mention)"
          autoResize
          maxHeight={300}
          className="text-zinc-500 text-[13px] leading-relaxed"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties}
        />
      </div>

      {/* Meta grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 20, background: '#18181B', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8, padding: 20, marginBottom: 20,
      }}>
        {/* Priority picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>Priority</span>
          <select
            value={task.priority ?? ''}
            onChange={(e) => void patch({ priority: e.target.value || null })}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: priorityColor, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            <option value="" style={{ background: '#18181B', color: '#FAFAFA' }}>—</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p} style={{ background: '#18181B', color: '#FAFAFA' }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Due date picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>Due date</span>
          <input
            type="date"
            defaultValue={task.due_date ?? ''}
            onBlur={(e) => {
              const v = e.target.value || null
              if (v !== task.due_date) void patch({ due_date: v })
            }}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#D4D4D8', fontSize: 13, cursor: 'pointer' }}
          />
        </div>

        {/* Owner picker */}
        {directory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>Owner</span>
            <select
              value={task.owner_user_id ?? ''}
              onChange={(e) => void patch({ owner_user_id: e.target.value || null })}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#D4D4D8', fontWeight: 500, fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#18181B', color: '#FAFAFA' }}>Unassigned</option>
              {directory.map((u) => (
                <option key={u.id} value={u.id} style={{ background: '#18181B', color: '#FAFAFA' }}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Support users — multi-select */}
        {directory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>Support</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {directory
                .filter((u) => u.id !== task.owner_user_id)
                .map((u) => {
                  const supporters = task.support_user_ids ?? []
                  const checked = supporters.includes(u.id)
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? supporters.filter((id) => id !== u.id)
                            : [...supporters, u.id]
                          void patch({ support_user_ids: next })
                        }}
                        style={{ accentColor: '#D7261E', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12, color: checked ? '#D4D4D8' : '#52525B' }}>{u.name}</span>
                    </label>
                  )
                })}
            </div>
          </div>
        )}

        <MetaField label="Est. time" value={formatMinutes(task.estimated_minutes)} />
        <MetaField label="Revenue score" value={task.revenue_impact_score?.toString() ?? '—'} />
        <MetaField label="Urgency score" value={task.urgency_score?.toString() ?? '—'} />
        <MetaField label="AI mode" value={task.ai_mode ?? '—'} />
      </div>

      {/* Flags */}
      {(task.blocker_flag || task.is_low_hanging_fruit || task.is_ready_for_ai || task.needs_decision) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {task.blocker_flag && <Flag label="BLOCKER" color="#D7261E" />}
          {task.is_low_hanging_fruit && <Flag label="LOW HANGING FRUIT" color="#22C55E" />}
          {task.is_ready_for_ai && <Flag label="AI READY" color="#38BDF8" />}
          {task.needs_decision && <Flag label="NEEDS DECISION" color="#F59E0B" />}
        </div>
      )}

      {task.definition_of_done && (
        <TextBlock label="Definition of Done" value={task.definition_of_done} />
      )}
      {task.acceptance_criteria && (
        <TextBlock label="Acceptance Criteria" value={task.acceptance_criteria} />
      )}

      <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10, color: '#3F3F46' }}>Created {formatDate(task.created_at)}</span>
        {task.updated_at && (
          <span style={{ fontSize: 10, color: '#3F3F46' }}>Updated {formatDate(task.updated_at)}</span>
        )}
      </div>
    </div>
  )
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#D4D4D8' }}>{value ?? '—'}</span>
    </div>
  )
}

function Flag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}12`, padding: '3px 10px', borderRadius: 4 }}>
      {label}
    </span>
  )
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 20, marginBottom: 12 }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#D4D4D8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  )
}
