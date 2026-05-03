'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useUser } from '@/lib/context/user-context'
import { EditableField } from '@/components/os/EditableField'
import { Plus, Trash2 } from 'lucide-react'

type Board = {
  id: string
  project_id: string
  name: string
  description: string | null
  status: string | null
  board_type: string | null
  kpi_config: string[] | null
  tenant_id: string | null
}

type Project = {
  id: string
  name: string
}

const KPI_OPTIONS = [
  'Velocity',
  'Completion Rate',
  'Blocked %',
  'Avg Cycle Time',
  'Tasks by Owner',
]

const STATUS_COLOR: Record<string, string> = {
  active: '#22C55E',
  paused: '#F59E0B',
  archived: '#52525B',
}

export default function OsBoardsPage() {
  const { activeTenantId } = useUser()
  const [boards, setBoards] = useState<Board[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardProject, setNewBoardProject] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeTenantId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/os/boards?tenant_id=${activeTenantId}`).then((r) => r.json()),
      fetch(`/api/os/projects?tenant_id=${activeTenantId}`).then((r) => r.json()),
    ])
      .then(([boardsData, projectsData]) => {
        setBoards((boardsData as { boards: Board[] }).boards ?? [])
        setProjects((projectsData as { projects: Project[] }).projects ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeTenantId])

  async function handleCreateBoard() {
    if (!newBoardName.trim() || !newBoardProject || !activeTenantId) return
    const res = await fetch('/api/os/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: newBoardProject,
        name: newBoardName.trim(),
        tenant_id: activeTenantId,
      }),
    })
    if (res.ok) {
      const { board } = (await res.json()) as { board: Board }
      setBoards((prev) => [board, ...prev])
      setNewBoardName('')
      setCreating(false)
    } else {
      toast.error('Failed to create board')
    }
  }

  async function handlePatch(id: string, patch: Partial<Board>) {
    const res = await fetch(`/api/os/boards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const { board } = (await res.json()) as { board: Board }
      setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...board } : b)))
    } else {
      toast.error('Failed to save changes')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/os/boards/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBoards((prev) => prev.filter((b) => b.id !== id))
    } else {
      toast.error('Failed to delete board')
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  function toggleKpi(boardId: string, kpi: string) {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return
    const current = board.kpi_config ?? []
    const next = current.includes(kpi)
      ? current.filter((k) => k !== kpi)
      : [...current, kpi]
    void handlePatch(boardId, { kpi_config: next })
  }

  // Group by project
  const boardsByProject = boards.reduce<Record<string, Board[]>>((acc, b) => {
    acc[b.project_id] = acc[b.project_id] ?? []
    acc[b.project_id].push(b)
    return acc
  }, {})

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
            Boards
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>{boards.length} board{boards.length !== 1 ? 's' : ''}</p>
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
          New Board
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div
          style={{
            background: '#18181B', border: '1px solid rgba(215,38,30,0.4)',
            borderRadius: 8, padding: '16px', marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', textTransform: 'uppercase', letterSpacing: 1 }}>
            New Board
          </p>
          <select
            value={newBoardProject}
            onChange={(e) => setNewBoardProject(e.target.value)}
            style={{
              height: 32, padding: '0 8px', background: '#0F0F10',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
              color: newBoardProject ? '#FAFAFA' : '#52525B', fontSize: 12, outline: 'none',
            }}
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            autoFocus
            type="text"
            placeholder="Board name..."
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreateBoard()
              if (e.key === 'Escape') setCreating(false)
            }}
            style={{
              height: 32, padding: '0 10px', background: '#0F0F10',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
              color: '#FAFAFA', fontSize: 12, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleCreateBoard()}
              style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', background: '#D7261E', border: 'none', borderRadius: 3, padding: '6px 14px', cursor: 'pointer' }}
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
        </div>
      )}

      {loading ? (
        <div style={{ color: '#52525B', fontSize: 13 }}>Loading boards...</div>
      ) : boards.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
          No boards yet. Create a project first, then add boards.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {projects
            .filter((p) => boardsByProject[p.id]?.length)
            .map((project) => (
              <div key={project.id}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#52525B', textTransform: 'uppercase', marginBottom: 8 }}>
                  {project.name}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {boardsByProject[project.id].map((board) => (
                    <div
                      key={board.id}
                      style={{
                        background: '#18181B',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {/* Board header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#71717A', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3 }}>
                            {board.board_type ?? 'Kanban'}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: STATUS_COLOR[board.status ?? 'active'] ?? '#22C55E', padding: '2px 6px', borderRadius: 3, background: `${STATUS_COLOR[board.status ?? 'active'] ?? '#22C55E'}18` }}>
                            {board.status ?? 'Active'}
                          </span>
                        </div>
                        {confirmDeleteId === board.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => void handleDelete(board.id)}
                              disabled={deletingId === board.id}
                              style={{ fontSize: 9, fontWeight: 700, color: '#D7261E', background: 'rgba(215,38,30,0.12)', border: '1px solid rgba(215,38,30,0.3)', borderRadius: 3, padding: '2px 7px', cursor: 'pointer' }}
                            >
                              {deletingId === board.id ? '...' : 'Delete'}
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
                            onClick={() => setConfirmDeleteId(board.id)}
                            title="Delete board"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3F3F46', padding: 2 }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#D7261E')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3F3F46')}
                          >
                            <Trash2 size={12} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>

                      {/* Name */}
                      <EditableField
                        value={board.name}
                        onSave={(v) => handlePatch(board.id, { name: v })}
                        style={{ fontSize: 13, fontWeight: 700, color: '#FAFAFA' }}
                      />

                      {/* Description */}
                      <EditableField
                        value={board.description ?? ''}
                        onSave={(v) => handlePatch(board.id, { description: v })}
                        multiline
                        placeholder="Add description..."
                        style={{ fontSize: 11, color: '#71717A' }}
                      />

                      {/* Open Board link */}
                      <Link
                        href={`/os/boards/${board.id}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#D7261E',
                          textDecoration: 'none',
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                          alignSelf: 'flex-start',
                        }}
                      >
                        Open Board →
                      </Link>

                      {/* KPI picker */}
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase', marginBottom: 6 }}>
                          KPI Widgets
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {KPI_OPTIONS.map((kpi) => {
                            const active = (board.kpi_config ?? []).includes(kpi)
                            return (
                              <button
                                key={kpi}
                                type="button"
                                onClick={() => toggleKpi(board.id, kpi)}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: 3,
                                  border: `1px solid ${active ? '#D7261E' : 'rgba(255,255,255,0.1)'}`,
                                  background: active ? 'rgba(215,38,30,0.12)' : 'transparent',
                                  color: active ? '#D7261E' : '#52525B',
                                  cursor: 'pointer',
                                }}
                              >
                                {kpi}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
