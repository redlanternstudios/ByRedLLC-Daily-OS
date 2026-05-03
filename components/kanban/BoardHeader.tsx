'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import PhaseManager from './PhaseManager'

type Props = {
  boardId: string
  boardName: string
  boardStatus: string
  projectName: string | null
}

export default function BoardHeader({ boardId, boardName, boardStatus, projectName }: Props) {
  const [showPhases, setShowPhases] = useState(false)

  return (
    <>
      {/* Breadcrumb + controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/os/boards" style={{ fontSize: 11, color: '#52525B', textDecoration: 'none' }}>
          Boards
        </Link>
        <span style={{ color: '#3F3F46', fontSize: 11 }}>/</span>
        {projectName && (
          <>
            <span style={{ fontSize: 11, color: '#52525B' }}>{projectName}</span>
            <span style={{ color: '#3F3F46', fontSize: 11 }}>/</span>
          </>
        )}
        <span style={{ fontSize: 11, color: '#FAFAFA', fontWeight: 600 }}>{boardName}</span>

        <span
          style={{
            marginLeft: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: boardStatus === 'active' ? '#22C55E' : '#52525B',
            background: boardStatus === 'active' ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          {boardStatus}
        </span>

        {/* Manage Phases toggle */}
        <button
          type="button"
          onClick={() => setShowPhases((v) => !v)}
          title="Manage phases"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: showPhases ? '#D7261E' : '#52525B',
            background: showPhases ? 'rgba(215,38,30,0.08)' : 'transparent',
            border: `1px solid ${showPhases ? 'rgba(215,38,30,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          <Settings size={11} strokeWidth={1.75} />
          Phases
        </button>
      </div>

      {/* Collapsible phase manager */}
      {showPhases && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <PhaseManager boardId={boardId} />
        </div>
      )}
    </>
  )
}
