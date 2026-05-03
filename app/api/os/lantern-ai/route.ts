// app/api/os/lantern-ai/route.ts
import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are LanternAI, the operations intelligence for By Red LLC. You have context \
about the business's projects, tasks, and team. Provide concise, actionable insights. \
Answer questions about task priorities, blockers, project health, and operational strategy. \
Keep replies under 200 words unless detail is explicitly requested.`

const MAX_MESSAGES = 20

export async function POST(req: NextRequest) {
  try {
    let tenantIds: string[]
    let profileId: string | null = null
    try {
      const scope = await requireTenantScope()
      // TenantScope returns { tenantId (singular), tenant } — wrap in array
      tenantIds = [scope.tenantId]
      // Resolve caller's byred_users.id from auth_user_id
      const supabaseAuth = await createClient()
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (user) {
        const { data: byredUser } = await supabaseAuth
          .from('byred_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        profileId = (byredUser as { id: string } | null)?.id ?? null
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // ai v6: DefaultChatTransport sends { messages: UIMessage[] }
    const body = (await req.json()) as { messages: UIMessage[] }

    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const uiMessages = body.messages.slice(-MAX_MESSAGES)

    // Fetch operational context — team-wide snapshot + personal snapshot for the caller
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: openCount },
      { data: blocked },
      { data: callerUser },
      { count: myOpenCount },
      { data: myCritical },
    ] = await Promise.all([
      // Team: total open tasks
      supabase
        .from('byred_tasks')
        .select('*', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .neq('status', 'done')
        .neq('status', 'cancelled'),
      // Team: blocked tasks
      supabase
        .from('byred_tasks')
        .select('title, status, priority')
        .in('tenant_id', tenantIds)
        .eq('status', 'blocked')
        .limit(5),
      // Caller: name from byred_users
      profileId
        ? supabase.from('byred_users').select('name').eq('id', profileId).maybeSingle()
        : Promise.resolve({ data: null }),
      // Caller: open task count
      profileId
        ? supabase
            .from('byred_tasks')
            .select('*', { count: 'exact', head: true })
            .in('tenant_id', tenantIds)
            .eq('owner_user_id', profileId)
            .neq('status', 'done')
            .neq('status', 'cancelled')
        : Promise.resolve({ count: null }),
      // Caller: critical tasks due today or overdue
      profileId
        ? supabase
            .from('byred_tasks')
            .select('title, priority, due_date')
            .in('tenant_id', tenantIds)
            .eq('owner_user_id', profileId)
            .eq('priority', 'critical')
            .lte('due_date', today)
            .neq('status', 'done')
            .neq('status', 'cancelled')
            .limit(5)
        : Promise.resolve({ data: null }),
    ])

    const callerName = (callerUser?.data as { name?: string } | null)?.name ?? 'You'

    const contextBlock = [
      `Requesting user: ${callerName}`,
      `${callerName}'s open tasks: ${myOpenCount ?? 0}`,
      myCritical?.length
        ? `${callerName}'s critical/overdue: ${myCritical.map((t) => `"${t.title}"`).join(', ')}`
        : `${callerName} has no critical overdue tasks`,
      `Team open tasks: ${openCount ?? 0}`,
      blocked?.length
        ? `Team blockers: ${blocked.map((t) => `"${t.title}" (${t.priority})`).join(', ')}`
        : 'No team blockers',
    ].join('\n')

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${SYSTEM_PROMPT}\n\nCurrent operational snapshot:\n${contextBlock}`,
      messages: await convertToModelMessages(uiMessages),
      maxOutputTokens: 600,
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
