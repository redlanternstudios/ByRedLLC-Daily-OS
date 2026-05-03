import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

type Ctx = { params: Promise<{ id: string; phaseId: string }> }

const VALID_STATUS_MAPPINGS = [
  'not_started', 'in_progress', 'blocked', 'overdue', 'done', 'cancelled',
] as const

async function resolvePhase(boardId: string, phaseId: string, tenantIds: string[]) {
  const supabase = await createClient()
  const { data: board } = await supabase
    .from('os_boards')
    .select('tenant_id')
    .eq('id', boardId)
    .maybeSingle()
  if (!board || !tenantIds.includes(board.tenant_id ?? '')) return null

  const { data: phase } = await supabase
    .from('os_phases')
    .select('id')
    .eq('id', phaseId)
    .eq('board_id', boardId)
    .maybeSingle()
  return phase ? supabase : null
}

// ─── PATCH /api/os/boards/[id]/phases/[phaseId] ───────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id: boardId, phaseId } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    // Scope check
    const { data: board } = await supabase
      .from('os_boards')
      .select('tenant_id')
      .eq('id', boardId)
      .maybeSingle()

    if (!board || !tenantIds.includes(board.tenant_id ?? '')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('os_phases')
      .select('id')
      .eq('id', phaseId)
      .eq('board_id', boardId)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await req.json()) as {
      name?: string
      color?: string
      status_mapping?: string | null
      order_index?: number
    }

    if (
      body.status_mapping !== undefined &&
      body.status_mapping !== null &&
      !VALID_STATUS_MAPPINGS.includes(body.status_mapping as typeof VALID_STATUS_MAPPINGS[number])
    ) {
      return NextResponse.json({ error: 'invalid status_mapping' }, { status: 400 })
    }

    const allowed = ['name', 'color', 'status_mapping', 'order_index']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = (body as Record<string, unknown>)[key]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('os_phases') as any)
      .update(patch)
      .eq('id', phaseId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A phase already maps to "${body.status_mapping}" on this board` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ phase: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// ─── DELETE /api/os/boards/[id]/phases/[phaseId] ─────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id: boardId, phaseId } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const { data: board } = await supabase
      .from('os_boards')
      .select('tenant_id')
      .eq('id', boardId)
      .maybeSingle()

    if (!board || !tenantIds.includes(board.tenant_id ?? '')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('os_phases')
      .select('id')
      .eq('id', phaseId)
      .eq('board_id', boardId)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Null out phase_id on any tasks still in this phase (don't delete the tasks)
    await supabase
      .from('byred_tasks')
      .update({ phase_id: null })
      .eq('phase_id', phaseId)

    const { error } = await supabase
      .from('os_phases')
      .delete()
      .eq('id', phaseId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
