'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useBoard } from '@/hooks/useBoard'
import { useBoardStore } from '@/hooks/useBoardStore'
import KanbanColumn from './KanbanColumn'
import type { BoardWithData, TaskWithMeta } from '@/types/kanban'

async function patchTask(taskId: string, patch: Record<string, unknown>) {
  await fetch(`/api/os/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

function resolveTargetPhase(overId: string, data: BoardWithData): string | null {
  // over.id is a phase ID (dropped directly on column)
  if (data.phases.find((p) => p.id === overId)) return overId
  // over.id is a task ID — find the phase containing it
  for (const phase of data.phases) {
    if ((data.tasksByPhase[phase.id] ?? []).find((t) => t.id === overId)) {
      return phase.id
    }
  }
  return null
}

function findTaskPhase(taskId: string, data: BoardWithData): string | null {
  for (const phase of data.phases) {
    if ((data.tasksByPhase[phase.id] ?? []).find((t) => t.id === taskId)) {
      return phase.id
    }
  }
  return null
}

export default function KanbanBoard({ boardId }: { boardId: string }) {
  const { data, isLoading, error } = useBoard(boardId)
  const moveTask = useBoardStore((s) => s.moveTask)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !data) return

    const taskId = active.id as string
    const toPhaseId = resolveTargetPhase(over.id as string, data)
    if (!toPhaseId) return

    const fromPhaseId = findTaskPhase(taskId, data)
    if (fromPhaseId === toPhaseId) return

    const targetPhase = data.phases.find((p) => p.id === toPhaseId)

    // Build patch — always move phase, also sync status if the destination column
    // has a status_mapping configured.
    const patchPayload: Record<string, unknown> = { phase_id: toPhaseId }
    if (targetPhase?.status_mapping) {
      patchPayload.status = targetPhase.status_mapping
    }

    const targetTasks = data.tasksByPhase[toPhaseId] ?? []
    // Optimistically update both phase and status in the local store
    moveTask(taskId, toPhaseId, targetTasks.length)
    if (patchPayload.status) {
      useBoardStore.getState().updateTask(taskId, {
        status: patchPayload.status as TaskWithMeta['status'],
      })
    }

    await patchTask(taskId, patchPayload)
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, color: '#52525B', fontSize: 13 }}>Loading board…</div>
    )
  }
  if (error || !data) {
    return (
      <div style={{ padding: 40, color: '#D7261E', fontSize: 13 }}>Board not found.</div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          padding: '0 28px 40px',
          alignItems: 'flex-start',
        }}
      >
        {data.phases.map((phase) => (
          <KanbanColumn
            key={phase.id}
            phase={phase}
            tasks={data.tasksByPhase[phase.id] ?? []}
          />
        ))}
        {data.phases.length === 0 && (
          <div style={{ color: '#3F3F46', fontSize: 13, paddingTop: 40 }}>
            No phases yet — add phases from the board settings.
          </div>
        )}
      </div>
    </DndContext>
  )
}
