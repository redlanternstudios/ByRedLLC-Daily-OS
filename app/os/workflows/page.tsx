'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/lib/context/user-context'
import { Plus, Trash2, ToggleLeft, ToggleRight, FlaskConical } from 'lucide-react'

type Workflow = {
  id: string
  tenant_id: string
  name: string
  trigger_event: string
  condition: Record<string, unknown> | null
  action: Record<string, unknown>
  is_active: boolean
  created_at: string
}

const TRIGGER_OPTIONS = [
  'When a task status changes',
  'When a task becomes overdue',
  'When a task is marked blocked',
  'When a task is assigned',
  'When a project status changes',
  'Every day at 9am',
]

const CONDITION_OPTIONS = [
  'No condition (always run)',
  'Only if priority is Critical',
  'Only if priority is High',
  'Only if task is assigned to me',
  'Only if project is Active',
]

const ACTION_OPTIONS = [
  'Send a notification to task owner',
  'Send a notification to team',
  'Update task status to Blocked',
  'Update task priority to Critical',
  'Create a follow-up task',
  'Send an email alert',
]

type Step = {
  trigger: string
  condition: string
  action: string
  name: string
}

const DEFAULT_STEP: Step = {
  trigger: '',
  condition: CONDITION_OPTIONS[0],
  action: '',
  name: '',
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', height: 36, padding: '0 10px',
        background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 4, color: value ? '#FAFAFA' : '#52525B', fontSize: 12, outline: 'none',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function OsWorkflowsPage() {
  const { activeTenantId } = useUser()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<Step>(DEFAULT_STEP)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeTenantId) return
    setLoading(true)
    fetch(`/api/os/workflows?tenant_id=${activeTenantId}`)
      .then((r) => r.json())
      .then(({ workflows: data }: { workflows: Workflow[] }) => {
        setWorkflows(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeTenantId])

  async function handleSave() {
    if (!step.trigger || !step.action || !step.name || !activeTenantId) return
    setSaving(true)
    const res = await fetch('/api/os/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: activeTenantId,
        name: step.name,
        trigger_event: step.trigger,
        condition: step.condition !== CONDITION_OPTIONS[0] ? { label: step.condition } : null,
        action: { label: step.action },
        is_active: true,
      }),
    })
    if (res.ok) {
      const { workflow } = (await res.json()) as { workflow: Workflow }
      setWorkflows((prev) => [workflow, ...prev])
      setCreating(false)
      setStep(DEFAULT_STEP)
    } else {
      toast.error('Failed to save workflow')
    }
    setSaving(false)
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await fetch(`/api/os/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, is_active: !current } : w)))
    } else {
      toast.error('Failed to update workflow')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/os/workflows/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
    } else {
      toast.error('Failed to delete workflow')
    }
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
            Workflows & Automations
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            Automate actions based on events in your workspace
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5, verticalAlign: 'middle' }}>
            <FlaskConical size={9} />
            Rules saved · Execution engine coming soon
          </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            color: '#FAFAFA', background: '#D7261E', padding: '0 16px', height: 32,
            borderRadius: 4, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          New Workflow
        </button>
      </div>

      {/* Workflow builder */}
      {creating && (
        <div
          style={{
            background: '#18181B', border: '1px solid rgba(215,38,30,0.3)',
            borderRadius: 8, padding: '20px', marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            New Workflow
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 1 — When does this trigger?
              </p>
              <Select value={step.trigger} onChange={(v) => setStep((s) => ({ ...s, trigger: v }))} options={TRIGGER_OPTIONS} placeholder="Select a trigger..." />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 2 — What condition applies? (optional)
              </p>
              <Select value={step.condition} onChange={(v) => setStep((s) => ({ ...s, condition: v }))} options={CONDITION_OPTIONS} placeholder="" />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 3 — What should happen?
              </p>
              <Select value={step.action} onChange={(v) => setStep((s) => ({ ...s, action: v }))} options={ACTION_OPTIONS} placeholder="Select an action..." />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 4 — Give it a name
              </p>
              <input
                type="text"
                placeholder="e.g. Notify owner on critical status change"
                value={step.name}
                onChange={(e) => setStep((s) => ({ ...s, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
                style={{
                  width: '100%', height: 36, padding: '0 10px',
                  background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4, color: '#FAFAFA', fontSize: 12, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !step.trigger || !step.action || !step.name}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#FAFAFA',
                  background: saving || !step.trigger || !step.action || !step.name ? '#52525B' : '#D7261E',
                  border: 'none', borderRadius: 3, padding: '7px 16px', cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Workflow'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setStep(DEFAULT_STEP) }}
                style={{ fontSize: 11, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflows list */}
      {loading ? (
        <div style={{ color: '#52525B', fontSize: 13 }}>Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
          No workflows yet. Create one to start automating.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workflows.map((w) => (
            <div
              key={w.id}
              style={{
                background: '#18181B', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: w.is_active ? 1 : 0.5,
              }}
            >
              <button
                type="button"
                onClick={() => void handleToggle(w.id, w.is_active)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: w.is_active ? '#22C55E' : '#52525B', padding: 0 }}
              >
                {w.is_active ? <ToggleRight size={20} strokeWidth={1.75} /> : <ToggleLeft size={20} strokeWidth={1.75} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', marginBottom: 3 }}>{w.name}</p>
                <p style={{ fontSize: 10, color: '#52525B' }}>
                  {w.trigger_event}
                  {w.condition ? ` · ${(w.condition as { label?: string }).label ?? ''}` : ''}
                  {' → '}
                  {(w.action as { label?: string }).label ?? ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(w.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3F3F46', padding: 2 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#D7261E')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3F3F46')}
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
