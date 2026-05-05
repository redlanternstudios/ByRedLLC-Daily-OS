// app/api/os/lantern-ai/route.ts
import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const SYSTEM_PROMPT = `You are LanternAI, the operations intelligence assistant for By Red LLC — a multi-brand \
agency managing several client tenants simultaneously. You have real-time access to the team's task data in \
Supabase (byred_tasks, byred_users, byred_tenants).

Your job is to give concise, actionable intelligence about:
- What's overdue or at risk
- Who's blocked and why
- What the requesting user should prioritize today
- Cross-tenant workload health
- Pipeline and momentum trends

You can also send emails on behalf of the user when they ask you to. When sending emails:
- Use the send_email tool — do not fabricate email addresses; use only addresses from the TEAM MEMBERS list in the snapshot
- Confirm what you sent after the tool call succeeds
- Keep subject lines short and professional

Rules:
- Answer directly and specifically — reference task titles, owner names, and tenant names when relevant
- Keep replies under 200 words unless more detail is requested
- Flag blockers with urgency; surface the single most important next action when asked
- Never fabricate data — only use the snapshot provided below`

const MAX_MESSAGES = 20

type TenantRow = {
  tenant_id: string
  byred_tenants: { id: string; name: string } | null
}

type TaskRow = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  owner_user_id: string | null
  tenant_id: string
  blocker_flag: boolean
  blocker_reason: string | null
  updated_at: string | null
  created_at: string | null
}

type TeamMemberRow = { id: string; name: string; role: string; email: string }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: byredUserRaw } = await supabase
      .from('byred_users')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    const profileId = (byredUserRaw as { id: string; name: string } | null)?.id ?? null
    const callerName = (byredUserRaw as { id: string; name: string } | null)?.name ?? 'You'

    if (!profileId) {
      return new Response(JSON.stringify({ error: 'No profile' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Resolve all tenants the user belongs to
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberRows } = await (supabase as any)
      .from('byred_user_tenants')
      .select('tenant_id, byred_tenants(id, name)')
      .eq('user_id', profileId) as { data: TenantRow[] | null }

    const tenantRows = (memberRows ?? []).map((r) => ({
      id: r.byred_tenants?.id ?? r.tenant_id,
      name: r.byred_tenants?.name ?? r.tenant_id,
    }))
    const tenantIds = tenantRows.map((t) => t.id)
    const tenantMap = new Map(tenantRows.map((t) => [t.id, t]))

    // Parse request body
    const body = (await req.json()) as { messages: UIMessage[] }
    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [tasksRes, teamRes] = await Promise.all([
      supabase
        .from('byred_tasks')
        .select('id, title, status, priority, due_date, owner_user_id, tenant_id, blocker_flag, blocker_reason, updated_at, created_at')
        .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['__none__']),
      supabase
        .from('byred_users')
        .select('id, name, role, email')
        .eq('active', true)
        .order('name'),
    ])

    const allTasks = (tasksRes.data as TaskRow[] | null) ?? []
    const teamMembers = (teamRes.data as TeamMemberRow[] | null) ?? []
    const userMap = new Map(teamMembers.map((u) => [u.id, u]))

    const activeTasks = allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
    const doneTasks = allTasks.filter((t) => t.status === 'done')
    const doneThisWeek = doneTasks.filter((t) => (t.updated_at ?? t.created_at ?? '') >= weekAgo)
    const overdueTasks = activeTasks.filter((t) => t.due_date && t.due_date < today)
    const dueTodayTasks = activeTasks.filter((t) => t.due_date === today)
    const blockerTasks = activeTasks.filter((t) => t.blocker_flag)
    const criticalTasks = activeTasks.filter((t) => t.priority === 'critical')

    // Caller's personal tasks
    const myActiveTasks = activeTasks.filter((t) => t.owner_user_id === profileId)
    const myOverdue = myActiveTasks.filter((t) => t.due_date && t.due_date < today)
    const myDueToday = myActiveTasks.filter((t) => t.due_date === today)
    const myCritical = myActiveTasks.filter((t) => t.priority === 'critical')

    function taskLine(t: TaskRow) {
      const tenant = tenantMap.get(t.tenant_id)?.name ?? t.tenant_id
      const owner = t.owner_user_id ? userMap.get(t.owner_user_id)?.name ?? 'unassigned' : 'unassigned'
      const due = t.due_date ? ` (due ${t.due_date})` : ''
      return `"${t.title}" [${tenant}, ${t.priority}, owner: ${owner}]${due}`
    }

    // Per-tenant breakdown
    const byTenant = tenantRows
      .map((tenant) => {
        const tt = activeTasks.filter((t) => t.tenant_id === tenant.id)
        const done = doneTasks.filter((t) => t.tenant_id === tenant.id).length
        const blocked = tt.filter((t) => t.blocker_flag).length
        const overdue = tt.filter((t) => t.due_date && t.due_date < today).length
        return { name: tenant.name, active: tt.length, done, blocked, overdue }
      })
      .filter((t) => t.active > 0 || t.done > 0)
      .sort((a, b) => b.active - a.active)

    // Team load
    const teamLoad = teamMembers
      .map((u) => {
        const mine = activeTasks.filter((t) => t.owner_user_id === u.id)
        const isBlocked = mine.some((t) => t.blocker_flag)
        const isCritical = mine.some((t) => t.priority === 'critical')
        const status = isBlocked ? 'BLOCKED' : isCritical ? 'AT RISK' : 'on track'
        return { name: u.name, role: u.role, count: mine.length, status }
      })
      .filter((u) => u.count > 0)
      .sort((a, b) => b.count - a.count)

    const lines: string[] = [
      `Date: ${today}`,
      `Requesting user: ${callerName}`,
      '',
      '=== PERSONAL (caller only) ===',
      `${callerName}'s active tasks: ${myActiveTasks.length}`,
      myDueToday.length > 0
        ? `Due today: ${myDueToday.map((t) => `"${t.title}" [${t.priority}]`).join(', ')}`
        : 'Nothing due today',
      myOverdue.length > 0
        ? `Overdue: ${myOverdue.map((t) => `"${t.title}" (${Math.floor((Date.now() - new Date(t.due_date! + 'T00:00:00').getTime()) / 86400000)}d late)`).join(', ')}`
        : 'No overdue tasks',
      myCritical.length > 0
        ? `Critical: ${myCritical.map((t) => `"${t.title}"`).join(', ')}`
        : 'No critical tasks',
      '',
      '=== TEAM SNAPSHOT ===',
      `Total active tasks: ${activeTasks.length}`,
      `Done this week: ${doneThisWeek.length}`,
      `Overdue: ${overdueTasks.length}`,
      `Due today: ${dueTodayTasks.length}`,
      `Blockers: ${blockerTasks.length}`,
      `Critical: ${criticalTasks.length}`,
    ]

    if (blockerTasks.length > 0) {
      lines.push(`Blocker detail: ${blockerTasks.slice(0, 6).map((t) => taskLine(t)).join('; ')}`)
    }

    if (overdueTasks.length > 0) {
      lines.push(`Most overdue: ${overdueTasks.slice(0, 6).map((t) => taskLine(t)).join('; ')}`)
    }

    if (byTenant.length > 0) {
      lines.push(
        '',
        '=== BY PROJECT ===',
        ...byTenant.map((t) => `${t.name}: ${t.active} active, ${t.done} done, ${t.blocked} blocked, ${t.overdue} overdue`),
      )
    }

    if (teamLoad.length > 0) {
      lines.push(
        '',
        '=== TEAM LOAD ===',
        ...teamLoad.map((u) => `${u.name} (${u.role}): ${u.count} tasks — ${u.status}`),
      )
    }

    lines.push(
      '',
      '=== TEAM MEMBERS (use for send_email tool) ===',
      ...teamMembers.map((u) => `${u.name} <${u.email}>`),
    )

    const contextBlock = lines.join('\n')

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${SYSTEM_PROMPT}\n\n---\nOPERATIONAL SNAPSHOT:\n${contextBlock}`,
      messages: await convertToModelMessages(body.messages.slice(-MAX_MESSAGES)),
      maxOutputTokens: 600,
      stopWhen: stepCountIs(3),
      tools: {
        send_email: {
          description: 'Send an email to one or more team members on behalf of the requesting user.',
          inputSchema: z.object({
            to: z.array(z.string().email()).min(1).describe('Recipient email addresses'),
            subject: z.string().describe('Email subject line'),
            body: z.string().describe('Plain-text email body (will be wrapped in branded HTML)'),
          }),
          execute: async ({ to, subject, body: emailBody }: { to: string[]; subject: string; body: string }) => {
            const emailHtml = `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <div style="margin-bottom:20px">
                  <span style="background:#D7261E;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;text-transform:uppercase">By Red OS</span>
                </div>
                <div style="font-size:15px;color:#333;line-height:1.7;white-space:pre-wrap">${emailBody.replace(/</g, '&lt;')}</div>
                <p style="margin:32px 0 0;font-size:11px;color:#bbb">Sent via Lantern AI · By Red LLC</p>
              </div>
            `
            const result = await sendEmail({ to, subject, html: emailHtml, text: emailBody })
            return result.ok
              ? `Email sent to ${to.join(', ')}`
              : `Failed to send: ${result.reason}`
          },
        },
      },
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
