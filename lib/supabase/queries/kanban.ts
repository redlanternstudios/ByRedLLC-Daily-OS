import { createClient } from '@/lib/supabase/server'
import type { BoardWithData, OsBoard, OsPhase, TaskWithMeta } from '@/types/kanban'

export async function getBoardWithData(boardId: string, userId: string): Promise<BoardWithData> {
  const supabase = await createClient()

  // Verify the board exists and get its tenant
  const { data: boardRow } = await supabase
    .from('os_boards')
    .select('tenant_id')
    .eq('id', boardId)
    .maybeSingle()
  if (!boardRow) throw new Error('404')

  // Verify user belongs to that tenant
  const { data: membership } = await supabase
    .from('byred_user_tenants')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', boardRow.tenant_id)
    .maybeSingle()
  if (!membership) throw new Error('403')

  const [boardResult, phasesResult, tasksResult] = await Promise.all([
    supabase.from('os_boards').select('*').eq('id', boardId).single(),
    supabase
      .from('os_phases')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true }),
    supabase
      .from('byred_tasks')
      .select('*, owner:byred_users!owner_user_id(id, name, avatar_url)')
      .eq('board_id', boardId)
      .is('archived_at', null)
      .order('order_index', { ascending: true }),
  ])

  if (boardResult.error || !boardResult.data) throw new Error('404')
  if (phasesResult.error) throw new Error('500')

  const today = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksWithMeta: TaskWithMeta[] = ((tasksResult.data ?? []) as any[]).map((t) => ({
    ...t,
    owner: t.owner ?? null,
    isOverdue:
      t.due_date && t.due_date < today && !['done', 'cancelled'].includes(t.status),
  }))

  const phases = (phasesResult.data ?? []) as unknown as OsPhase[]
  const tasksByPhase: Record<string, TaskWithMeta[]> = {}
  for (const phase of phases) tasksByPhase[phase.id] = []
  for (const task of tasksWithMeta) {
    if (task.phase_id && tasksByPhase[task.phase_id]) {
      tasksByPhase[task.phase_id].push(task)
    }
  }

  return {
    board: boardResult.data as unknown as OsBoard,
    phases,
    tasksByPhase,
  }
}
