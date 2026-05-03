'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/lib/context/user-context'
import { Plus, Trash2, ToggleLeft, ToggleRight, Bell, FlaskConical } from 'lucide-react'

type Trigger = {
  id: string
  tenant_id: string
  name: string
  watch_entity: string
  watch_condition: Record<string, unknown>
  alert_user_ids: string[] | null
  alert_channels: string[] | null
  is_active: boolean
  created_at: string
}

const WATCH_OPTIONS = [
  'A task becomes Blocked',
  'A task becomes Overdue',
  'A task is assigned to me',
  'A project status changes',
  'A task priority is set to Critical',
  'A board has no activity for 3 days',
]

const ALERT_WHO_OPTIONS = [
  'Me',
  'Task owner',
  'Entire team',
  'Specific person',
]

const ALERT_HOW_OPTIONS = ['In-app notification', 'Email']

type TriggerStep = {
  watch: string
  alertWho: string
  alertChannels: string[]
  name: string
}

const DEFAULT_STEP: TriggerStep = {
  watch: '',
  alertWho: '',
  alertChannels: [],
  name: '',
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string
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

export default function OsTriggersPage() {
  const { activeTenantId } = useUser()
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<TriggerStep>(DEFAULT_STEP)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeTenantId) return
    setLoading(true)
    fetch(`/api/os/triggers?tenant_id=${activeTenantId}`)
      .then((r) => r.json())
      .then(({ triggers: data }: { triggers: Trigger[] }) => {
        setTriggers(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeTenantId])

  async function handleSave() {
    if (!step.watch || !step.alertWho || !step.name || !activeTenantId) return
    setSaving(true)
    const res = await fetch('/api/os/triggers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: activeTenantId,
        name: step.name,
        watch_entity: 'task',
        watch_condition: { label: step.watch },
        alert_user_ids: [],
        alert_channels: step.alertChannels.map((c) =>
          c === 'In-app notification' ? 'in_app' : 'email'
        ),
        is_active: true,
      }),
    })
    if (res.ok) {
      const { trigger } = (await res.json()) as { trigger: Trigger }
      setTriggers((prev) => [trigger, ...prev])
    }
    setSaving(false)
    setCreating(false)
    setStep(DEFAULT_STEP)
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await fetch(`/api/os/triggers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t)))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trigger?')) return
    const res = await fetch(`/api/os/triggers/${id}`, { method: 'DELETE' })
    if (res.ok) setTriggers((prev) => prev.filter((t) => t.id !== id))
  }

  function toggleChannel(ch: string) {
    setStep((s) => ({
      ...s,
      alertChannels: s.alertChannels.includes(ch)
        ? s.alertChannels.filter((c) => c !== ch)
        : [...s.alertChannels, ch],
    }))
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
            Triggers
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            Get alerted when conditions are met in your workspace
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5, verticalAlign: 'middle' }}>
              <FlaskConical size={9} />
              Rules saved · Alert delivery coming soon
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
          New Trigger
        </button>
      </div>

      {creating && (
        <div
          style={{
            background: '#18181B', border: '1px solid rgba(215,38,30,0.3)',
            borderRadius: 8, padding: '20px', marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            New Trigger
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 1 — Watch what?
              </p>
              <Select value={step.watch} onChange={(v) => setStep((s) => ({ ...s, watch: v }))} options={WATCH_OPTIONS} placeholder="Select a condition to watch..." />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 2 — Who should be alerted?
              </p>
              <Select value={step.alertWho} onChange={(v) => setStep((s) => ({ ...s, alertWho: v }))} options={ALERT_WHO_OPTIONS} placeholder="Select who to alert..." />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 3 — How?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {ALERT_HOW_OPTIONS.map((ch) => {
                  const active = step.alertChannels.includes(ch)
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '6px 12px',
                        border: `1px solid ${active ? '#D7261E' : 'rgba(255,255,255,0.1)'}`,
                        background: active ? 'rgba(215,38,30,0.12)' : 'transparent',
                        color: active ? '#D7261E' : '#71717A',
                        borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      {ch}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Step 4 — Name this trigger
              </p>
              <input
                type="text"
                placeholder="e.g. Alert team when tasks are blocked"
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
                disabled={saving || !step.watch || !step.alertWho || !step.name}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#FAFAFA',
                  background: saving || !step.watch || !step.alertWho || !step.name ? '#52525B' : '#D7261E',
                  border: 'none', borderRadius: 3, padding: '7px 16px', cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Trigger'}
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

      {loading ? (
        <div style={{ color: '#52525B', fontSize: 13 }}>Loading triggers...</div>
      ) : triggers.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
          No triggers yet. Create one to start getting alerts.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {triggers.map((t) => (
            <div
              key={t.id}
              style={{
                background: '#18181B', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: t.is_active ? 1 : 0.5,
              }}
            >
              <Bell size={14} strokeWidth={1.75} style={{ color: t.is_active ? '#F59E0B' : '#52525B', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', marginBottom: 3 }}>{t.name}</p>
                <p style={{ fontSize: 10, color: '#52525B' }}>
                  {(t.watch_condition as { label?: string }).label ?? t.watch_entity}
                  {t.alert_channels?.length ? ` · via ${t.alert_channels.join(', ')}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggle(t.id, t.is_active)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.is_active ? '#22C55E' : '#52525B', padding: 0 }}
              >
                {t.is_active ? <ToggleRight size={20} strokeWidth={1.75} /> : <ToggleLeft size={20} strokeWidth={1.75} />}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(t.id)}
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
