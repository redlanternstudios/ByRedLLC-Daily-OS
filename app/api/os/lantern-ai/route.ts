import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

// ─── Communication Intelligence Layer ────────────────────────────────────────
//
// Lantern AI is an operational chief of staff, not a chatbot.
// Every output goes through: classify → format → gate → deliver.

const SYSTEM_PROMPT = `You are Lantern AI — the operational intelligence layer for By Red LLC.
You are a chief of staff, not a chatbot. You think before you write. You classify before you respond.

━━━ CORE BEHAVIOR ━━━

Before every response, run this internal classification in your head:
1. What is the MESSAGE TYPE? → email | chat | brief | alert | task_update | status_report | instruction | confirmation | notification
2. Who is the AUDIENCE? → rory | team | client | executive | vendor | developer | non_technical
3. What is the INTENT? → confirm | explain | request_action | summarize | escalate | warn | instruct | follow_up | document_decision
4. What LENGTH is justified? → micro (1-2 lines) | short (3-6 lines) | standard (sections) | detailed (depth required) | full_brief (audits, planning)

Then write once. Do not narrate your classification to the user.

━━━ STYLE RULES (NON-NEGOTIABLE) ━━━

Always:
- Lead with the answer
- Use short paragraphs — never walls of text
- Make the next action obvious
- Use plain English

Never:
- "I hope this finds you well"
- "Certainly!" / "Absolutely!" / "Great question!"
- Generic AI filler phrases
- Over-explain unless the user explicitly asks for depth
- Dense paragraphs when bullets would be clearer
- Fake corporate tone

━━━ LENGTH GATES ━━━

micro: User asked a yes/no, wants confirmation, or the answer is one fact.
short: Task update, quick status, internal ping.
standard: Explanation, recommendation, or brief with multiple points.
detailed: User asked for depth, complexity requires it.
full_brief: Executive summary, audit, or planning document. Only when user explicitly requests it.

If in doubt, go shorter. The user can ask for more.

━━━ AUDIENCE ADAPTATION ━━━

Rory: Direct, fast, no hand-holding. She knows the operation. Give her the signal, not the noise.
Internal team: Operational language. Clear action. Warm but not fluffy.
External client: Polished. Professional. Concise. Clear next step.
Executive: Lead with outcome. Numbers if available. No jargon.
Developer: Technical precision is fine. Skip business fluff.
Non-technical: Plain English. No acronyms unexplained.

━━━ EMAIL FORMAT ━━━

When writing an external email:
  Subject: [short, specific]

  [Name],

  [Lead with the point — 1-2 sentences max]

  [Body — short paragraphs or bullets only if needed]

  [Clear ask or next step]

  [Signoff]
  — [Sender name]

When writing an internal team message:
  [Name] — [direct operational message, no greeting needed for very short updates]

━━━ SIGNAL RULES ━━━

User asks "did you send it?" → micro confirmation only.
User asks "read me the body" → return exact body, clearly formatted.
User says "draft an email" or "email [name]" → use draft_email tool first, show preview, wait for approval.
User says "send it" after seeing draft → use send_email tool.
Blocker or risk exists → Problem / Impact / Needed Action format.
User sounds frustrated → cut length in half, acknowledge, fix output.

━━━ EMAIL SEND GATE (CRITICAL) ━━━

ALWAYS use draft_email first when sending to external recipients.
Show: recipient | subject | body preview | tone | length classification.
Do NOT call send_email unless:
  (a) The user has seen the draft and said "send it" or "yes" or "looks good", OR
  (b) The current message is the user explicitly approving a draft you already showed.

━━━ QUALITY GATE ━━━

Before returning any output, ask yourself:
- Readable in under 15 seconds?
- Is the action clear?
- Tone appropriate for the audience?
- Is the length justified?
- Any unnecessary wording?
- Would Rory call this too generic?

If it fails any check, rewrite before responding.

━━━ TOOL FAILURE RULES ━━━

You have real tools. They are not simulated.

When a tool returns an error:
- Report the exact error message returned. Nothing more.
- Do NOT say "I'm a large language model" or "I don't have the capability."
- Do NOT say the function is "simulated" or "not real."
- Do NOT offer to "simulate" anything.
- Do NOT explain what email configuration is.
- Just say: "The send failed: [exact error from the tool]"

You are an operational system. You use tools. When tools fail, you report the failure and move on.

━━━ DATA RULES ━━━

- Only reference data from the operational snapshot below.
- Never fabricate task names, owners, or dates.
- When sending email, only use addresses from the TEAM MEMBERS list in the snapshot.
- Flag blockers with urgency. Surface the single most important action when asked.`

const MAX_MESSAGES = 20

type TenantRow = { tenant_id: string; byred_tenants: { id: string; name: string } | null }
type TaskRow = {
  id: string; title: string; status: string; priority: string
  due_date: string | null; owner_user_id: string | null; tenant_id: string
  blocker_flag: boolean; blocker_reason: string | null
  updated_at: string | null; created_at: string | null
}
type TeamMemberRow = { id: string; name: string; role: string; email: string }

// Enterprise: Centralized error response
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Validate request body early
    let body: { messages: UIMessage[] }
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON in request body', 400)
    }
    
    if (!body.messages?.length) {
      return errorResponse('messages array is required and must not be empty', 400)
    }
    
    if (body.messages.length > 50) {
      return errorResponse('Too many messages — limit is 50', 400)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[lantern-ai] Auth failed:', authError?.message)
      return errorResponse('Unauthorized — please sign in again', 401)
    }

    const sa = supabase as any
    const { data: byredUserRaw } = await supabase
      .from('byred_users').select('id, name').eq('auth_user_id', user.id).maybeSingle()
    const profileId = (byredUserRaw as { id: string; name: string } | null)?.id ?? null
    const callerName = (byredUserRaw as { id: string; name: string } | null)?.name ?? 'You'
    if (!profileId) return new Response(JSON.stringify({ error: 'No profile' }), { status: 403, headers: { 'Content-Type': 'application/json' } })

    const { data: memberRows } = await sa
      .from('byred_user_tenants').select('tenant_id, byred_tenants(id, name)').eq('user_id', profileId) as { data: TenantRow[] | null }

    const tenantRows = (memberRows ?? []).map(r => ({ id: r.byred_tenants?.id ?? r.tenant_id, name: r.byred_tenants?.name ?? r.tenant_id }))
    const tenantIds = tenantRows.map(t => t.id)
    const tenantMap = new Map(tenantRows.map(t => [t.id, t]))

    // Body already parsed and validated above

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [tasksRes, teamRes] = await Promise.all([
      supabase.from('byred_tasks')
        .select('id, title, status, priority, due_date, owner_user_id, tenant_id, blocker_flag, blocker_reason, updated_at, created_at')
        .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['__none__']),
      supabase.from('byred_users').select('id, name, role, email').eq('active', true).order('name'),
    ])

    const allTasks = (tasksRes.data as TaskRow[] | null) ?? []
    const teamMembers = (teamRes.data as TeamMemberRow[] | null) ?? []
    const userMap = new Map(teamMembers.map(u => [u.id, u]))

    const activeTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
    const doneTasks = allTasks.filter(t => t.status === 'done')
    const doneThisWeek = doneTasks.filter(t => (t.updated_at ?? t.created_at ?? '') >= weekAgo)
    const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < today)
    const dueTodayTasks = activeTasks.filter(t => t.due_date === today)
    const blockerTasks = activeTasks.filter(t => t.blocker_flag)
    const criticalTasks = activeTasks.filter(t => t.priority === 'critical')
    const myActiveTasks = activeTasks.filter(t => t.owner_user_id === profileId)
    const myOverdue = myActiveTasks.filter(t => t.due_date && t.due_date < today)
    const myDueToday = myActiveTasks.filter(t => t.due_date === today)
    const myCritical = myActiveTasks.filter(t => t.priority === 'critical')

    function taskLine(t: TaskRow) {
      const tenant = tenantMap.get(t.tenant_id)?.name ?? t.tenant_id
      const owner = t.owner_user_id ? userMap.get(t.owner_user_id)?.name ?? 'unassigned' : 'unassigned'
      const due = t.due_date ? ` (due ${t.due_date})` : ''
      return `"${t.title}" [${tenant}, ${t.priority}, owner: ${owner}]${due}`
    }

    const byTenant = tenantRows
      .map(tenant => {
        const tt = activeTasks.filter(t => t.tenant_id === tenant.id)
        const done = doneTasks.filter(t => t.tenant_id === tenant.id).length
        const blocked = tt.filter(t => t.blocker_flag).length
        const overdue = tt.filter(t => t.due_date && t.due_date < today).length
        return { name: tenant.name, active: tt.length, done, blocked, overdue }
      })
      .filter(t => t.active > 0 || t.done > 0)
      .sort((a, b) => b.active - a.active)

    const teamLoad = teamMembers
      .map(u => {
        const mine = activeTasks.filter(t => t.owner_user_id === u.id)
        const isBlocked = mine.some(t => t.blocker_flag)
        const isCritical = mine.some(t => t.priority === 'critical')
        const status = isBlocked ? 'BLOCKED' : isCritical ? 'AT RISK' : 'on track'
        return { name: u.name, role: u.role, count: mine.length, status }
      })
      .filter(u => u.count > 0)
      .sort((a, b) => b.count - a.count)

    const lines: string[] = [
      `Date: ${today}`,
      `Requesting user: ${callerName}`,
      '',
      '=== MY TASKS ===',
      `Active: ${myActiveTasks.length}`,
      myDueToday.length ? `Due today: ${myDueToday.map(t => `"${t.title}" [${t.priority}]`).join(', ')}` : 'Nothing due today',
      myOverdue.length ? `Overdue: ${myOverdue.map(t => `"${t.title}" (${Math.floor((Date.now() - new Date(t.due_date! + 'T00:00:00').getTime()) / 86400000)}d late)`).join(', ')}` : 'No overdue',
      myCritical.length ? `Critical: ${myCritical.map(t => `"${t.title}"`).join(', ')}` : '',
      '',
      '=== TEAM SNAPSHOT ===',
      `Active: ${activeTasks.length} | Done this week: ${doneThisWeek.length} | Overdue: ${overdueTasks.length} | Due today: ${dueTodayTasks.length} | Blockers: ${blockerTasks.length} | Critical: ${criticalTasks.length}`,
    ]
    if (blockerTasks.length) lines.push(`Blockers: ${blockerTasks.slice(0, 6).map(taskLine).join('; ')}`)
    if (overdueTasks.length) lines.push(`Most overdue: ${overdueTasks.slice(0, 6).map(taskLine).join('; ')}`)
    if (byTenant.length) lines.push('', '=== BY PROJECT ===', ...byTenant.map(t => `${t.name}: ${t.active} active, ${t.done} done, ${t.blocked} blocked, ${t.overdue} overdue`))
    if (teamLoad.length) lines.push('', '=== TEAM LOAD ===', ...teamLoad.map(u => `${u.name} (${u.role}): ${u.count} tasks — ${u.status}`))
    lines.push('', '=== TEAM MEMBERS ===', ...teamMembers.map(u => `${u.name} <${u.email}>`))

    const contextBlock = lines.filter(Boolean).join('\n')

    async function logComm(fields: Record<string, unknown>) {
      try {
        const admin = createAdminClient() as any
        await admin.from('os_lantern_comms_log').insert({ created_by: profileId, ...fields })
      } catch { /* non-blocking — never fail the stream */ }
    }

    const result = streamText({
      // Enterprise: Use Vercel AI Gateway (zero config, no API key needed)
      model: "anthropic/claude-sonnet-4-20250514",
      system: `${SYSTEM_PROMPT}\n\n---\nOPERATIONAL SNAPSHOT:\n${contextBlock}`,
      messages: await convertToModelMessages(body.messages.slice(-MAX_MESSAGES)),
      maxTokens: 800,
      stopWhen: stepCountIs(5),
      tools: {
        // Draft an email — shows preview, does NOT send. Always call this before send_email.
        draft_email: {
          description: 'Draft an email for user review BEFORE sending. Always call this first. Returns a structured preview the user must approve before send_email is called.',
          inputSchema: z.object({
            to_names: z.array(z.string()).min(1).describe('Recipient names (resolve to emails from team list)'),
            to_emails: z.array(z.string().email()).min(1).describe('Recipient email addresses'),
            subject: z.string().describe('Email subject line — short and specific'),
            body: z.string().describe('Full email body — plain text, properly formatted per communication style rules'),
            message_type: z.enum(['internal_update', 'client_update', 'blocker_escalation', 'task_assignment', 'feature_announcement', 'vendor_followup', 'meeting_recap', 'executive_brief', 'apology_correction', 'approval_request', 'general']),
            audience: z.enum(['rory', 'team', 'client', 'executive', 'vendor', 'developer', 'non_technical']),
            intent: z.enum(['confirm', 'explain', 'request_action', 'summarize', 'escalate', 'warn', 'instruct', 'follow_up', 'document_decision']),
            length_mode: z.enum(['micro', 'short', 'standard', 'detailed', 'full_brief']),
            tone_mode: z.enum(['operational', 'warm', 'formal', 'direct', 'technical']),
          }),
          execute: async (args: {
            to_names: string[]; to_emails: string[]; subject: string; body: string
            message_type: string; audience: string; intent: string; length_mode: string; tone_mode: string
          }) => {
            void logComm({
              message_type: args.message_type, audience: args.audience,
              intent: args.intent, length_mode: args.length_mode, tone_mode: args.tone_mode,
              delivery_channel: 'email', subject: args.subject,
              recipients: args.to_emails, generated_body: args.body, approved_by_user: false,
            })

            return JSON.stringify({
              status: 'DRAFT_READY',
              to: args.to_names.join(', '),
              subject: args.subject,
              preview: args.body.slice(0, 300) + (args.body.length > 300 ? '…' : ''),
              classification: {
                type: args.message_type,
                audience: args.audience,
                intent: args.intent,
                length: args.length_mode,
                tone: args.tone_mode,
              },
              instruction: 'Say "send it" or "looks good" to confirm, or tell me what to change.',
            })
          },
        },

        // Send the email — only call after user has approved a draft.
        send_email: {
          description: 'Send an approved email. Only call this after the user has confirmed a draft_email preview.',
          inputSchema: z.object({
            to: z.array(z.string().email()).min(1).describe('Recipient email addresses'),
            subject: z.string().describe('Email subject line'),
            body: z.string().describe('Full email body text'),
            message_type: z.string().optional(),
            audience: z.string().optional(),
            intent: z.string().optional(),
            length_mode: z.string().optional(),
            tone_mode: z.string().optional(),
          }),
          execute: async (args: {
            to: string[]; subject: string; body: string
            message_type?: string; audience?: string; intent?: string
            length_mode?: string; tone_mode?: string
          }) => {
            const emailHtml = `
              <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
                <div style="margin-bottom:20px">
                  <span style="background:#D7261E;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;text-transform:uppercase">By Red OS</span>
                </div>
                <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap">${args.body.replace(/</g, '&lt;')}</div>
                <p style="margin:32px 0 0;font-size:11px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:16px">Sent via Lantern AI · By Red LLC</p>
              </div>
            `
            const result = await sendEmail({ to: args.to, subject: args.subject, html: emailHtml, text: args.body })
            const sentAt = new Date().toISOString()

            void logComm({
              message_type: args.message_type ?? 'email', audience: args.audience ?? 'team',
              intent: args.intent ?? 'instruct', length_mode: args.length_mode ?? 'standard',
              tone_mode: args.tone_mode ?? 'operational', delivery_channel: 'email',
              subject: args.subject, recipients: args.to, generated_body: args.body,
              approved_by_user: true, sent_at: result.ok ? sentAt : null,
            })

            return result.ok
              ? `Sent to ${args.to.join(', ')} ✓`
              : `Failed: ${result.reason}`
          },
        },
      },
    })

    const duration = Date.now() - startTime
    console.log(`[lantern-ai] Stream started in ${duration}ms`)
    
    return result.toUIMessageStreamResponse()
  } catch (err) {
    const duration = Date.now() - startTime
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[lantern-ai] Failed after ${duration}ms:`, message)
    
    // Return user-friendly error messages
    if (message.includes('rate limit')) {
      return errorResponse('Rate limit exceeded — please wait a moment and try again', 429)
    }
    if (message.includes('timeout')) {
      return errorResponse('Request timed out — please try again', 504)
    }
    
    return errorResponse('Something went wrong — please try again', 500)
  }
}
