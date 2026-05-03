import { create } from 'zustand'
import type { BoardWithData, TaskWithMeta } from '@/types/kanban'

type State = {
  boards: Record<string, BoardWithData>
  isLoading: boolean
  error: string | null
}

type Actions = {
  setBoard: (boardId: string, data: BoardWithData) => void
  updateTask: (taskId: string, patch: Partial<TaskWithMeta>) => void
  moveTask: (taskId: string, toPhaseId: string, newOrderIndex: number) => void
}

export const useBoardStore = create<State & Actions>((set, get) => ({
  boards: {},
  isLoading: false,
  error: null,

  setBoard: (boardId, data) =>
    set((s) => ({ boards: { ...s.boards, [boardId]: data } })),

  updateTask: (taskId, patch) => {
    const boards = { ...get().boards }

    for (const boardId in boards) {
      const board = boards[boardId]

      // If phase_id is changing, we need to physically move the card between
      // column buckets, not just update it in-place (which would leave it in
      // the wrong column even though its data says otherwise).
      const newPhaseId = 'phase_id' in patch ? (patch.phase_id as string | null) : undefined

      if (newPhaseId !== undefined && newPhaseId !== null) {
        let movedTask: TaskWithMeta | undefined
        const nextTasksByPhase = { ...board.tasksByPhase }

        // Find and remove from current phase
        for (const phaseId in nextTasksByPhase) {
          const idx = nextTasksByPhase[phaseId].findIndex((t) => t.id === taskId)
          if (idx !== -1) {
            movedTask = { ...nextTasksByPhase[phaseId][idx], ...patch, phase_id: newPhaseId }
            nextTasksByPhase[phaseId] = nextTasksByPhase[phaseId].filter((t) => t.id !== taskId)
            break
          }
        }

        // Append to target phase (realtime doesn't give us a target index, so append)
        if (movedTask && nextTasksByPhase[newPhaseId] !== undefined) {
          nextTasksByPhase[newPhaseId] = [...nextTasksByPhase[newPhaseId], movedTask]
          boards[boardId] = { ...board, tasksByPhase: nextTasksByPhase }
        }
      } else {
        // Simple in-place update — no phase change
        const nextTasksByPhase: typeof board.tasksByPhase = {}
        for (const phaseId in board.tasksByPhase) {
          nextTasksByPhase[phaseId] = board.tasksByPhase[phaseId].map(
            (t) => (t.id === taskId ? { ...t, ...patch } : t)
          )
        }
        boards[boardId] = { ...board, tasksByPhase: nextTasksByPhase }
      }
    }

    set({ boards })
  },

  moveTask: (taskId, toPhaseId, newOrderIndex) => {
    const boards = { ...get().boards }
    for (const boardId in boards) {
      const board = boards[boardId]
      let movedTask: TaskWithMeta | undefined

      // Remove from source phase
      const nextTasksByPhase = { ...board.tasksByPhase }
      for (const phaseId in nextTasksByPhase) {
        const idx = nextTasksByPhase[phaseId].findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          movedTask = { ...nextTasksByPhase[phaseId][idx], phase_id: toPhaseId }
          nextTasksByPhase[phaseId] = nextTasksByPhase[phaseId].filter((t) => t.id !== taskId)
          break
        }
      }

      if (movedTask) {
        // Insert at target position
        const target = [...(nextTasksByPhase[toPhaseId] ?? [])]
        target.splice(newOrderIndex, 0, movedTask)
        nextTasksByPhase[toPhaseId] = target
        boards[boardId] = { ...board, tasksByPhase: nextTasksByPhase }
      }
    }
    set({ boards })
  },
}))
