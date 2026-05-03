'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

export type PhaseRow = {
  id: string
  board_id: string
  name: string
  order_index: number
  color: string | null
  status_mapping: string | null
}

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: '',           label: '— None (manual only)',  color: '#3F3F46' },
  { value: 'not_started', label: 'Not Started',          color: '#71717A' },
  { value: 'in_progress', label: 'In Progress',          color: '#38BDF8' },
  { value: 'blocked',    label: 'Blocked',               color: '#F59E0B' },
  { value: 'overdue',    label: 'Overdue',               color: '#D7261E' },
  { value: 'done',       label: 'Done',                  color: '#22C55E' },
  { value: 'cancelled',  label: 'Cancelled',             color: '#52525B' },
]

const PHASE_COLORS = [
  '#3F3F46', '#71717A', '#38BDF8', '#818CF8', '#F59E0B',
  '#22C55E', '#D7261E', '#EC4899', '#F97316',
]

function statusLabel(mapping: string | null) {
  const opt = STATUS_OPTIONS.find((o) => o.value === (mapping ?? ''))
  return opt ?? STATUS_OPTIONS[0]
}

export default function PhaseManager({ boardId }: { boardId: string }) {
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PHASE_COLORS[0])
  const [newStatusMapping, setNewStatusMapping] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/os/boards/${boardId}/phases`)
      .then((r) => r.json() as Promise<{ phases: PhaseRow[] }>)
      .then(({ phases: p }) => { setPhases(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [boardId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) return
    const res = await fetch(`/api/os/boards/${boardId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        color: newColor,
        status_mapping: newStatusMapping || null,
      }),
    })
    if (res.ok) {
      const { phase } = (await res.json()) as { phase: PhaseRow }
      setPhases((prev) => [...prev, phase])
      setNewName('')
      setNewColor(PHASE_COLORS[0])
      setNewStatusMapping('')
      setAdding(false)
    } else {
      const { error } = (await res.json()) as { error: string }
      toast.error(error ?? 'Failed to create phase')
    }
  }

  async function handlePatchPhase(phaseId: string, update: Partial<PhaseRow>) {
    setSavingId(phaseId)
    const res = await fetch(`/api/os/boards/${boardId}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (res.ok) {
      const { phase } = (await res.json()) as { phase: PhaseRow }
      setPhases((prev) => prev.map((p) => (p.id === phaseId ? phase : p)))
    } else {
      const { error } = (await res.json()) as { error: string }
      toast.error(error ?? 'Failed to update phase')
    }
    setSavingId(null)
  }

  async function handleDelete(phaseId: string) {
    setDeletingId(phaseId)
    const res = await fetch(`/api/os/boards/${boardId}/phases/${phaseId}`, { method: 'DELETE' })
    if (res.ok) {
      setPhases((prev) => prev.filter((p) => p.id !== phaseId))
    } else {
      toast.error('Failed to delete phase')
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const ROW = {
    display: 'grid',
    gridTemplateColumns: '20px 1fr 100px 140px auto',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  } satisfies React.CSSProperties

  if (loading) {
    return <div style={{ fontSize: 11, color: '#52525B', padding: '8px 12px' }}>Loading phases…</div>
  }

  return (
    <div
      style={{
        background: '#18181B',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#52525B', textTransform: 'uppercase' }}>
          Phases · {phases.length}
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, color: '#D7261E',
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <Plus size={11} strokeWidth={2.5} /> Add phase
        </button>
      </div>

      {/* Column headers */}
      {phases.length > 0 && (
        <div
          style={{
            ...ROW,
            padding: '4px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: '#3F3F46', textTransform: 'uppercase' }}>Name</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: '#3F3F46', textTransform: 'uppercase' }}>Color</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: '#3F3F46', textTransform: 'uppercase' }}>Status sync</span>
          <span />
        </div>
      )}

      {/* Phase rows */}
      {phases.map((phase) => {
        const statusOpt = statusLabel(phase.status_mapping)
        return (
          <div key={phase.id} style={ROW}>
            {/* Drag handle (visual only — reorder is future work) */}
            <GripVertical size={12} style={{ color: '#3F3F46', flexShrink: 0 }} />

            {/* Name */}
            <input
              defaultValue={phase.name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== phase.name) void handlePatchPhase(phase.id, { name: v })
              }}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: '#D4D4D8', width: '100%',
              }}
            />

            {/* Color picker */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PHASE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => void handlePatchPhase(phase.id, { color: c })}
                  style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: c, border: (phase.color ?? '#3F3F46') === c ? '2px solid #FAFAFA' : '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0, padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Status mapping */}
            <select
              value={phase.status_mapping ?? ''}
              onChange={(e) =>
                void handlePatchPhase(phase.id, { status_mapping: e.target.value || null })
              }
              disabled={savingId === phase.id}
              style={{
                background: '#0F0F10',
                border: `1px solid ${statusOpt.color}44`,
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                color: statusOpt.color,
                padding: '2px 6px',
                outline: 'none',
                cursor: 'pointer',
                opacity: savingId === phase.id ? 0.5 : 1,
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#18181B', color: '#FAFAFA' }}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Delete */}
            {confirmDeleteId === phase.id ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => void handleDelete(phase.id)}
                  disabled={deletingId === phase.id}
                  style={{ fontSize: 9, fontWeight: 700, color: '#D7261E', background: 'rgba(215,38,30,0.12)', border: '1px solid rgba(215,38,30,0.3)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer' }}
                >
                  {deletingId === phase.id ? '…' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  style={{ fontSize: 9, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                title="Delete phase"
                onClick={() => setConfirmDeleteId(phase.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3F3F46', padding: 2, flexShrink: 0, display: 'flex' }}
              >
                <Trash2 size={11} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )
      })}

      {phases.length === 0 && !adding && (
        <div style={{ padding: '20px 14px', textAlign: 'center', color: '#3F3F46', fontSize: 11 }}>
          No phases yet. Add a phase to start building your board.
        </div>
      )}

      {/* Add phase form */}
      {adding && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 140px auto',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(215,38,30,0.04)',
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Phase name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
            style={{
              height: 28, padding: '0 8px', background: '#0F0F10',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
              color: '#FAFAFA', fontSize: 12, outline: 'none', width: '100%',
            }}
          />

          {/* Color */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PHASE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: c, border: newColor === c ? '2px solid #FAFAFA' : '2px solid transparent',
                  cursor: 'pointer', flexShrink: 0, padding: 0,
                }}
              />
            ))}
          </div>

          {/* Status mapping */}
          <select
            value={newStatusMapping}
            onChange={(e) => setNewStatusMapping(e.target.value)}
            style={{
              height: 28, padding: '0 6px', background: '#0F0F10',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
              color: '#D4D4D8', fontSize: 11, outline: 'none',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: '#18181B' }}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => void handleAdd()}
              style={{
                fontSize: 10, fontWeight: 700, color: '#FAFAFA',
                background: '#D7261E', border: 'none', borderRadius: 3,
                padding: '4px 10px', cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName('') }}
              style={{ fontSize: 10, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
