import { describe, expect, it } from 'vitest'
import { topologicalSort, assignOrderIndexes } from '@/lib/os/dependencySort'
import type { Task } from '@/types/db'

// Minimal task factory — only fields used by dependencySort
function t(id: string): Task {
  return {
    id,
    tenant_id: 'tenant-1',
    title: id,
    description: null,
    status: 'not_started',
    priority: 'medium',
    due_date: null,
    estimated_minutes: 30,
    ai_mode: null,
    blocker_flag: false,
    blocker_reason: null,
    blocked_by_task_id: null,
    owner_user_id: null,
    support_user_ids: [],
    revenue_impact_score: 5,
    urgency_score: 5,
    created_at: new Date().toISOString(),
  }
}

function dep(task_id: string, depends_on_task_id: string) {
  return { task_id, depends_on_task_id }
}

describe('topologicalSort', () => {
  it('returns an empty array for empty input', () => {
    expect(topologicalSort([], [])).toEqual([])
  })

  it('returns single task unchanged when there are no deps', () => {
    const tasks = [t('A')]
    const result = topologicalSort(tasks, [])
    expect(result.map((r) => r.id)).toEqual(['A'])
  })

  it('sorts a simple linear chain: dependency before dependent', () => {
    // A → B → C means A must come before B, B before C
    const tasks = [t('C'), t('B'), t('A')]
    const deps = [dep('B', 'A'), dep('C', 'B')]
    const result = topologicalSort(tasks, deps)
    const ids = result.map((r) => r.id)
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'))
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'))
  })

  it('handles a diamond dependency: A before B and C, B and C before D', () => {
    const tasks = [t('A'), t('B'), t('C'), t('D')]
    const deps = [dep('B', 'A'), dep('C', 'A'), dep('D', 'B'), dep('D', 'C')]
    const result = topologicalSort(tasks, deps)
    const ids = result.map((r) => r.id)
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'))
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('C'))
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'))
    expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('D'))
  })

  it('returns all tasks even when a cycle exists (cycle members appended at end)', () => {
    const tasks = [t('A'), t('B'), t('C')]
    // A → B → A is a cycle; C has no deps
    const deps = [dep('B', 'A'), dep('A', 'B')]
    const result = topologicalSort(tasks, deps)
    expect(result).toHaveLength(3)
    const ids = result.map((r) => r.id)
    expect(ids).toContain('A')
    expect(ids).toContain('B')
    expect(ids).toContain('C')
    // C has no deps so should appear before the cycle members
    expect(ids.indexOf('C')).toBeLessThan(Math.min(ids.indexOf('A'), ids.indexOf('B')))
  })

  it('ignores dep edges that reference task IDs not in the task list', () => {
    const tasks = [t('A'), t('B')]
    const deps = [dep('B', 'GHOST'), dep('B', 'A')]
    const result = topologicalSort(tasks, deps)
    const ids = result.map((r) => r.id)
    // GHOST is not in tasks — the edge should be silently ignored
    // B depends on A (valid), so A before B
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'))
    expect(result).toHaveLength(2)
  })

  it('preserves original order for tasks with no dependencies', () => {
    const tasks = [t('X'), t('Y'), t('Z')]
    const result = topologicalSort(tasks, [])
    expect(result.map((r) => r.id)).toEqual(['X', 'Y', 'Z'])
  })

  it('handles a large chain without stack overflow', () => {
    const n = 500
    const tasks = Array.from({ length: n }, (_, i) => t(`T${i}`))
    const deps = tasks.slice(1).map((task, i) => dep(task.id, `T${i}`))
    const result = topologicalSort(tasks, deps)
    expect(result).toHaveLength(n)
    // T0 must be first, T(n-1) must be last
    expect(result[0].id).toBe('T0')
    expect(result[n - 1].id).toBe(`T${n - 1}`)
  })
})

describe('assignOrderIndexes', () => {
  it('returns sequential 1-based indexes', () => {
    const tasks = [t('A'), t('B'), t('C')]
    const deps = [dep('B', 'A'), dep('C', 'B')]
    const result = assignOrderIndexes(tasks, deps)
    // Should be sorted: A=1, B=2, C=3
    const byId = Object.fromEntries(result.map((r) => [r.id, r.order_index]))
    expect(byId['A']).toBe(1)
    expect(byId['B']).toBe(2)
    expect(byId['C']).toBe(3)
  })

  it('returns empty array for empty input', () => {
    expect(assignOrderIndexes([], [])).toEqual([])
  })

  it('assigns unique consecutive indexes (no duplicates, no gaps)', () => {
    const tasks = [t('A'), t('B'), t('C'), t('D')]
    const deps = [dep('C', 'A'), dep('D', 'B')]
    const result = assignOrderIndexes(tasks, deps)
    const indexes = result.map((r) => r.order_index).sort((a, b) => a - b)
    expect(indexes).toEqual([1, 2, 3, 4])
  })
})
