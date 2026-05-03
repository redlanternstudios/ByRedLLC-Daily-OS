import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

export async function GET(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const tenantId = req.nextUrl.searchParams.get('tenant_id')
    const status = req.nextUrl.searchParams.get('status')
    const priority = req.nextUrl.searchParams.get('priority')

    const scopedIds = tenantId
      ? tenantIds.filter((id) => id === tenantId)
      : tenantIds

    if (scopedIds.length === 0) return NextResponse.json({ tasks: [] })

    const supabase = await createClient()
    let q = supabase
      .from('byred_tasks')
      .select('id,tenant_id,title,description,status,priority,due_date,estimated_minutes,order_index,owner_user_id,revenue_impact_score,project_id,board_id')
      .in('tenant_id', scopedIds)
      .is('archived_at', null)
      .order('order_index', { ascending: true })
      .order('revenue_impact_score', { ascending: false })
      .limit(200)

    if (status) q = q.eq('status', status)
    if (priority) q = q.eq('priority', priority)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tasks: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantIds, profileId } = await requireTenantScope()
    const body = (await req.json()) as {
      tenant_id?: string
      tasks?: Array<Record<string, unknown>>
      title?: string
      description?: string
      status?: string
      priority?: string
      due_date?: string
      estimated_minutes?: number
      project_id?: string
      board_id?: string
    }

    // Bulk import mode
    if (Array.isArray(body.tasks)) {
      const validated = body.tasks.filter((t) => {
        const tid = t.tenant_id as string | undefined
        return tid && tenantIds.includes(tid) && typeof t.title === 'string' && t.title
      })
      if (validated.length === 0) return NextResponse.json({ tasks: [] })

      const supabase = await createClient()
      const { data, error } = await supabase
        .from('byred_tasks')
        .insert(validated.map((t) => ({
          tenant_id: t.tenant_id as string,
          title: t.title as string,
          description: (t.description as string | undefined) ?? null,
          status: (t.status as string | undefined) ?? 'not_started',
          priority: (t.priority as string | undefined) ?? 'medium',
          due_date: (t.due_date as string | undefined) ?? null,
          estimated_minutes: typeof t.estimated_minutes === 'number' ? t.estimated_minutes : 30,
          revenue_impact_score: 0,
          urgency_score: 0,
        })))
        .select('id,title,status')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ tasks: data ?? [] }, { status: 201 })
    }

    // Single task mode
    const tid = body.tenant_id
    if (!tid || !tenantIds.includes(tid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('byred_tasks')
      .insert({
        tenant_id: tid,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? 'not_started',
        priority: body.priority ?? 'medium',
        due_date: body.due_date ?? null,
        project_id: body.project_id ?? null,
        board_id: body.board_id ?? null,
        owner_user_id: profileId ?? null,
        estimated_minutes: body.estimated_minutes ?? 30,
        revenue_impact_score: 0,
        urgency_score: 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
