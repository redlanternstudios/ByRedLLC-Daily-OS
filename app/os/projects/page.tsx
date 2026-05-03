'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/lib/context/user-context'
import { EditableField } from '@/components/os/EditableField'
import Link from 'next/link'
import { Plus } from 'lucide-react'

type Project = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: string | null
  priority: string | null
  due_date: string | null
  order_index: number | null
}

const STATUS_TABS = ['All', 'Active', 'Paused', 'Completed', 'Archived'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

const STATUS_COLOR: Record<string, string> = {
  active: '#22C55E',
  paused: '#F59E0B',
  completed: '#52525B',
  archived: '#3F3F46',
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'active'
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: STATUS_COLOR[s] ?? '#71717A',
        background: `${STATUS_COLOR[s] ?? '#71717A'}18`,
        padding: '2px 6px',
        borderRadius: 3,
      }}
    >
      {s}
    </span>
  )
}

export default function OsProjectsPage() {
  const { activeTenantId } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!activeTenantId) return
    setLoading(true)
    fetch(`/api/os/projects?tenant_id=${activeTenantId}`)
      .then((r) => r.json())
      .then(({ projects: data }: { projects: Project[] }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeTenantId])

  async function handlePatch(id: string, patch: Partial<Project>) {
    const res = await fetch(`/api/os/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const { project } = (await res.json()) as { project: Project }
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...project } : p)))
    } else {
      toast.error('Failed to save changes')
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !activeTenantId) return
    const res = await fetch('/api/os/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: activeTenantId, name: newName.trim() }),
    })
    if (res.ok) {
      const { project } = (await res.json()) as { project: Project }
      setProjects((prev) => [project, ...prev])
      setNewName('')
      setCreating(false)
    } else {
      toast.error('Failed to create project')
    }
  }

  const displayed = projects
    .filter((p) => {
      if (activeTab !== 'All' && (p.status ?? 'active').toLowerCase() !== activeTab.toLowerCase()) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
            Projects
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>{displayed.length} project{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: '#FAFAFA',
            background: '#D7261E',
            padding: '0 16px',
            height: 32,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            height: 30,
            padding: '0 10px',
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            color: '#FAFAFA',
            fontSize: 11,
            outline: 'none',
            width: 200,
          }}
        />
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 11,
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#FAFAFA' : '#71717A',
                padding: '6px 12px',
                borderBottom: activeTab === tab ? '2px solid #D7261E' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* New project input */}
      {creating && (
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(215,38,30,0.4)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 12,
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Project name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FAFAFA',
              fontSize: 13,
              fontWeight: 600,
            }}
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', background: '#D7261E', border: 'none', borderRadius: 3, padding: '0 12px', cursor: 'pointer' }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            style={{ fontSize: 11, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Project grid */}
      {loading ? (
        <ProjectSkeleton />
      ) : displayed.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
          No projects found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {displayed.map((project, idx) => (
            <div
              key={project.id}
              style={{
                background: '#18181B',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#52525B', fontFamily: 'monospace' }}>
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {project.priority && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_COLOR[project.priority] ?? '#71717A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {project.priority}
                    </span>
                  )}
                  <StatusBadge status={project.status} />
                </div>
              </div>

              {/* Name */}
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
                <EditableField
                  value={project.name}
                  onSave={(v) => handlePatch(project.id, { name: v })}
                  style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}
                />
              </h3>

              {/* Description */}
              <EditableField
                value={project.description ?? ''}
                onSave={(v) => handlePatch(project.id, { description: v })}
                multiline
                placeholder="Add description..."
                style={{ fontSize: 11, color: '#71717A' }}
              />

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {project.due_date && (
                  <span style={{ fontSize: 10, color: '#52525B' }}>
                    Due {project.due_date}
                  </span>
                )}
                <Link
                  href={`/os/boards?project_id=${project.id}`}
                  style={{ fontSize: 10, fontWeight: 700, color: '#D7261E', textDecoration: 'none', marginLeft: 'auto' }}
                >
                  View boards →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: 16,
            height: 140,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}
