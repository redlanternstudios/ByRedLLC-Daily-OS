import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import BoardHeader from '@/components/kanban/BoardHeader'

type Ctx = { params: Promise<{ id: string }> }

export default async function OsBoardDetailPage({ params }: Ctx) {
  const { id } = await params
  const { tenantIds } = await requireTenantScope()

  const supabase = await createClient()

  // Resolve board → project → tenant for scope check
  const { data: board } = await supabase
    .from('os_boards')
    .select('id,name,description,status,board_type,tenant_id,project_id,os_projects(name)')
    .eq('id', id)
    .maybeSingle()

  if (!board || !tenantIds.includes(board.tenant_id ?? '')) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectName = (board as any).os_projects?.name ?? null

  return (
    <div>
      {/* Board header + phase manager (client component handles the toggle) */}
      <BoardHeader
        boardId={id}
        boardName={board.name}
        boardStatus={board.status ?? 'active'}
        projectName={projectName}
      />

      {/* Kanban board (client component with DnD + real-time) */}
      <div style={{ paddingTop: 16 }}>
        <KanbanBoard boardId={id} />
      </div>
    </div>
  )
}
