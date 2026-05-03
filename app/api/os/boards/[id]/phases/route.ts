import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

type Ctx = { params: Promise<{ id: string }> }

const VALID_STATUS_MAPPINGS = [
  'not_started', 'in_progress', 'blocked', 'overdue', 'done', 'cancelled',
] as const

// ─── GET /api/os/boards/[id]/phases ──────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id: boardId } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    // Scope check: board must belong to one of the user's tenants
    const { data: board } = await supabase
      .from('os_boards')
      .select('tenant_id')
      .eq('id', boardId)
      .maybeSingle()

    if (!board || !tenantIds.includes(board.tenant_id ?? '')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('os_phases')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ phases: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// ─── POST /api/os/boards/[id]/phases ─────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id: boardId } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const { data: board } = await supabase
      .from('os_boards')
      .select('tenant_id')
      .eq('id', boardId)
      .maybeSingle()

    if (!board || !tenantIds.includes(board.tenant_id ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as {
      name?: string
      color?: string
      status_mapping?: string | null
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    if (body.status_mapping && !VALID_STATUS_MAPPINGS.includes(body.status_mapping as typeof VALID_STATUS_MAPPINGS[number])) {
      return NextResponse.json({ error: 'invalid status_mapping' }, { status: 400 })
    }

    // Next order_index = current max + 1
    const { data: maxRow } = await supabase
      .from('os_phases')
      .select('order_index')
      .eq('board_id', boardId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = ((maxRow?.order_index as number | null) ?? -1) + 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('os_phases') as any)
      .insert({
        board_id: boardId,
        name: body.name.trim(),
        color: body.color ?? null,
        status_mapping: body.status_mapping ?? null,
        order_index: nextOrder,
      })
      .select()
      .single()

    if (error) {
      // Unique constraint on (board_id, status_mapping) violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A phase already maps to "${body.status_mapping}" on this board` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ phase: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
