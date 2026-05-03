import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are LanternAI, the operations intelligence assistant for Red Lantern Studios. \
You have live access to the workspace's tasks, team members, and project data — use it. \
Answer questions about task priorities, blockers, deadlines, workload, and operational strategy. \
Be direct and specific: reference actual task names, people, due dates, and tenants from the snapshot. \
Flag risks proactively. Keep replies concise (under 250 words) unless detail is explicitly requested.`

const MAX_MESSAGES = 20

export async function POST(req: NextRequest) {
  try {
    let tenantIds: string[]
    let profileId: string | null = null
    try {
      const scope = await requireTenantScope()
      tenantIds = scope.tenantIds
      profileId = scope.profileId
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as { messages: UIMessage[] }
    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // Parallel fetch: tenants, open tasks, caller profile
    const [tenantsRes, tasksRes, callerRes] = await Promise.all([
      supabase
        .from('byred_tenants')
        .select('id, name')
        .in('id', tenantIds),
      supabase
        .from('byred_tasks')
        .select('id, title, status, priority, due_date, owner_user_id, tenant_id, description')
        .in('tenant_id', tenantIds)
        .not('status', 'in', '("done","cancelled")')
        .is('archived_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(200),
      profileId
        ? supabase.from('byred_users').select('id, name, role').eq('id', profileId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const tenants: { id: string; name: string }[] = tenantsRes.data ?? []
    const allTasks: {
      id: string
      title: string
      status: string
      priority: string | null
      due_date: string | null
      owner_user_id: string | null
      tenant_id: string
      description: string | null
    }[] = tasksRes.data ?? []

    const callerProfile = callerRes.data as { id: string; name: string; role: string } | null

    // Collect unique owner IDs and fetch user roster
    const ownerIds = [...new Set(allTasks.map(t => t.owner_user_id).filter(Boolean) as string[])]
    const usersRes = ownerIds.length
      ? await supabase.from('byred_users').select('id, name, role').in('id', ownerIds)
      : { data: [] }
    const users: { id: string; name: string; role: string }[] = usersRes.data ?? []

    // Build lookup maps
    const tenantMap = new Map(tenants.map(t => [t.id, t.name]))
    const userMap = new Map(users.map(u => [u.id, u]))

    function userName(uid: string | null): string {
      if (!uid) return 'Unassigned'
      return userMap.get(uid)?.name ?? 'Unknown'
    }
    function tenantName(tid: string): string {
      return tenantMap.get(tid) ?? tid
    }

    // Classify tasks
    const blocked = allTasks.filter(t => t.status === 'blocked')
    const overdue = allTasks.filter(t =>
      t.status !== 'blocked' &&
      t.due_date !== null &&
      t.due_date < today
    )
    const dueToday = allTasks.filter(t =>
      t.due_date === today &&
      t.status !== 'blocked'
    )
    const callerTasks = profileId ? allTasks.filter(t => t.owner_user_id === profileId) : []
    const callerOverdue = callerTasks.filter(t => t.due_date && t.due_date < today)

    // Per-tenant summary
    const tenantSummary = tenants.map(t => {
      const tasks = allTasks.filter(x => x.tenant_id === t.id)
      const tenantOverdue = tasks.filter(x => x.due_date && x.due_date < today && x.status !== 'blocked')
      const tenantBlocked = tasks.filter(x => x.status === 'blocked')
      return { name: t.name, open: tasks.length, overdue: tenantOverdue.length, blocked: tenantBlocked.length }
    })

    // Per-user workload
    const workload = users.map(u => {
      const mine = allTasks.filter(t => t.owner_user_id === u.id)
      const critical = mine.filter(t => t.priority === 'critical').length
      return { name: u.name, role: u.role, open: mine.length, critical }
    }).sort((a, b) => b.open - a.open)

    function taskLine(t: typeof allTasks[0]): string {
      const parts = [
        `[${t.priority ?? 'none'}]`,
        `"${t.title}"`,
        `| ${t.status}`,
        `| ${tenantName(t.tenant_id)}`,
        `| ${userName(t.owner_user_id)}`,
      ]
      if (t.due_date) {
        const flag = t.due_date < today ? '← OVERDUE' : t.due_date === today ? '← TODAY' : ''
        parts.push(`| due ${t.due_date} ${flag}`.trim())
      }
      return parts.join(' ')
    }

    // Urgency-sorted task list (blocked first, then overdue, then by priority, then by due date)
    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    const sorted = [...allTasks].sort((a, b) => {
      const aBlocked = a.status === 'blocked' ? 0 : 1
      const bBlocked = b.status === 'blocked' ? 0 : 1
      if (aBlocked !== bBlocked) return aBlocked - bBlocked
      const aOverdue = a.due_date && a.due_date < today ? 0 : 1
      const bOverdue = b.due_date && b.due_date < today ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      const pa = PRIORITY_ORDER[a.priority ?? 'low'] ?? 3
      const pb = PRIORITY_ORDER[b.priority ?? 'low'] ?? 3
      if (pa !== pb) return pa - pb
      return (a.due_date ?? 'zzz').localeCompare(b.due_date ?? 'zzz')
    })
    const topTasks = sorted.slice(0, 60)

    // Build context block
    const lines: string[] = [
      `DATE: ${todayLabel}`,
      '',
      `USER: ${callerProfile?.name ?? 'Unknown'} (${callerProfile?.role ?? 'member'})`,
      `Open tasks assigned to you: ${callerTasks.length}`,
      callerOverdue.length
        ? `Your overdue: ${callerOverdue.map(t => `"${t.title}" (due ${t.due_date})`).join(', ')}`
        : 'You have no overdue tasks',
      '',
      '── WORKSPACE HEALTH ──',
      ...tenantSummary.map(t =>
        `• ${t.name}: ${t.open} open, ${t.overdue} overdue, ${t.blocked} blocked`
      ),
      `Total: ${allTasks.length} open, ${overdue.length} overdue, ${blocked.length} blocked`,
    ]

    if (blocked.length) {
      lines.push('', '── BLOCKED ──')
      blocked.slice(0, 8).forEach(t => lines.push(`• ${taskLine(t)}`))
    }

    if (overdue.length) {
      lines.push('', '── OVERDUE (non-blocked) ──')
      overdue.slice(0, 8).forEach(t => lines.push(`• ${taskLine(t)}`))
    }

    if (dueToday.length) {
      lines.push('', '── DUE TODAY ──')
      dueToday.slice(0, 8).forEach(t => lines.push(`• ${taskLine(t)}`))
    }

    lines.push('', '── TEAM WORKLOAD ──')
    workload.forEach(u => {
      lines.push(`• ${u.name} (${u.role}): ${u.open} open${u.critical ? `, ${u.critical} critical` : ''}`)
    })

    lines.push('', `── ALL OPEN TASKS (${topTasks.length} of ${allTasks.length}, urgency order) ──`)
    topTasks.forEach(t => lines.push(taskLine(t)))

    const contextBlock = lines.join('\n')

    const uiMessages = body.messages.slice(-MAX_MESSAGES)
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${SYSTEM_PROMPT}\n\n=== LIVE WORKSPACE SNAPSHOT ===\n${contextBlock}`,
      messages: await convertToModelMessages(uiMessages),
      maxOutputTokens: 800,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('[lantern-ai]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
