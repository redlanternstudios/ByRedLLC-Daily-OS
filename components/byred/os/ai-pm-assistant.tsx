"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Brain, CheckCircle2, ClipboardList, Lightbulb, Loader2, Send, ShieldCheck, Target } from "lucide-react"

export type AiPmTaskSignal = {
  title: string
  project: string
  due: string
  priority: string
  status: string
}

export type AiPmProjectSignal = {
  title: string
  sector: string
  openCount: number
  monthCount: number
  blockedCount: number
  topTasks: string[]
}

export type AiPmDashboardContext = {
  monthLabel: string
  todayLabel: string
  primaryMove: AiPmTaskSignal | null
  nextMove: AiPmTaskSignal | null
  delegateMove: AiPmTaskSignal | null
  verifyMove: AiPmTaskSignal | null
  blockerMove: AiPmTaskSignal | null
  decisionCount: number
  blockedCount: number
  visibleTaskRows: number
  projects: AiPmProjectSignal[]
}

type AdvisorResult = {
  executive_summary?: string
  operating_mode?: string
  recommendation?: string
  reasoning_summary?: string
  priority_stack?: Array<{
    lane?: string
    title?: string
    project?: string
    status?: string
    why?: string
  }>
  blocked_decisions?: string[]
  delegation_plan?: string[]
  risks?: string[]
  codex_verification_steps?: string[]
  questions_for_kp?: string[]
  not_allowed_to_do?: string[]
  confidence_score?: number
}

type AdvisorResponse = {
  provider?: string
  model?: string
  mode?: string
  mutation_allowed?: boolean
  result?: AdvisorResult
  error?: string
}

type AiPmAssistantProps = {
  context: AiPmDashboardContext
}

type AiPmAction = {
  id: string
  label: string
  detail: string
  icon: typeof ClipboardList
  purpose: string
  prompt: string
}

const actions: AiPmAction[] = [
  {
    id: "month-plan",
    label: "Plan Month",
    detail: "Build a clean monthly execution plan.",
    icon: ClipboardList,
    purpose: "implementation_plan",
    prompt: "Operate as Keymon's enterprise PM assistant inside My Dashboard. Build a monthly execution packet with operating mode, executive summary, top project control lane, priority stack, blocked decisions, delegation plan, KP decisions needed, proof gates, and confidence score.",
  },
  {
    id: "today-priority",
    label: "Prioritize Today",
    detail: "Pick the next move and why.",
    icon: Target,
    purpose: "implementation_plan",
    prompt: "Operate as Keymon's enterprise PM assistant inside My Dashboard. Prioritize today by separating executable work from blocked/legal/admin work. Return the first move, second executable move only if clean, blocker lane, delegation lane, verification lane, KP decisions, proof gates, and confidence score.",
  },
  {
    id: "blocker-scan",
    label: "Find Blockers",
    detail: "Surface risk before it spreads.",
    icon: AlertTriangle,
    purpose: "ux_risk",
    prompt: "Operate as Keymon's enterprise PM assistant inside My Dashboard. Run blocker triage. Separate legal/admin blockers, team blockers, missing owner/due-date issues, proof gaps, KP-only decisions, and executable recovery steps. Do not treat blocked work as normal next-action work.",
  },
  {
    id: "task-shape",
    label: "Shape Tasks",
    detail: "Turn direction into board-ready work.",
    icon: Lightbulb,
    purpose: "implementation_plan",
    prompt: "Operate as Keymon's enterprise PM assistant inside My Dashboard. Convert the dashboard direction into board-ready tasks. For each task specify project lane, owner/routing, priority, due timing, definition of done, proof requirement, blocker dependency, and whether KP approval is required.",
  },
]

const aiPmOperatingContract = {
  identity: "Keymon's embedded AI PM inside ByRedLLC My Dashboard",
  provider: "deepseek",
  model: "deepseek-v4-flash",
  lane: "cost-aware PM reasoning, code-risk critique, task shaping, blocker analysis, and execution planning",
  operatingStandard: "enterprise-grade PM assistant for SaaS operations",
  authority: [
    "Advise, organize, prioritize, critique, and draft PM plans from dashboard context.",
    "Treat verified receipts and dashboard data as stronger than chat-only assumptions.",
    "Keep LanternAI separate; this assistant operates in My Dashboard only.",
    "Codex remains the operator/verifier for file edits, data mutations, deployments, browser checks, GitHub, Vercel, and receipts.",
  ],
  hardBoundaries: [
    "Do not claim work is complete without proof.",
    "Do not mutate tasks, close tasks, deploy, send messages, or edit production data.",
    "Do not treat unverified model output as reusable truth.",
    "Never request, reveal, store, or summarize secrets, tokens, env values, cookies, or private credentials.",
    "Never place blocked, legal/admin, or waiting-on-human work in the normal next-action lane.",
    "Never repeat the same task as next move and verification move.",
  ],
  requiredOutput: [
    "Return one executive summary and one clear recommendation.",
    "Return an operating mode such as Execution, Blocker Triage, Delegation, Monthly Planning, or Task Design.",
    "Return a priority stack separated by lane.",
    "Return blocked decisions separately from executable work.",
    "Return delegation plan, risks, proof requirements, KP questions, and confidence score.",
    "State what the dashboard PM is not allowed to do.",
  ],
}

function cleanList(value: string[] | undefined) {
  return value?.filter(Boolean).slice(0, 5) ?? []
}

function cleanPriorityStack(value: AdvisorResult["priority_stack"]) {
  return value?.filter((item) => item.title || item.lane || item.why).slice(0, 5) ?? []
}

function taskLine(task: AiPmTaskSignal | null, fallback: string) {
  if (!task) return fallback
  return `${task.title} (${task.project}, ${task.due}, ${task.priority}, ${task.status})`
}

function isBlockedSignal(task: AiPmTaskSignal | null) {
  return task?.status === "blocked"
}

function buildLocalPmResult(actionId: string, context: AiPmDashboardContext): AdvisorResult {
  const topProject = context.projects.find((project) => project.openCount > 0) ?? context.projects[0]
  const projectLine = topProject
    ? `${topProject.title} is carrying ${topProject.openCount} open items, ${topProject.monthCount} due this month, and ${topProject.blockedCount} blocked.`
    : "No active project pressure is showing in the dashboard context."
  const firstMove = taskLine(context.primaryMove, "No urgent first move is selected.")
  const blockedSignal = context.blockerMove
    ?? (isBlockedSignal(context.nextMove) ? context.nextMove : null)
    ?? (isBlockedSignal(context.verifyMove) ? context.verifyMove : null)
    ?? (isBlockedSignal(context.delegateMove) ? context.delegateMove : null)
  const executableNextMove = isBlockedSignal(context.nextMove) ? null : context.nextMove
  const executableDelegateMove = isBlockedSignal(context.delegateMove) ? null : context.delegateMove
  const executableVerifyMove = isBlockedSignal(context.verifyMove) ? null : context.verifyMove
  const nextMove = taskLine(executableNextMove, "No second executable move is queued.")
  const delegateMove = taskLine(executableDelegateMove, "No delegation move is currently selected.")
  const verifyMove = taskLine(executableVerifyMove, "No non-blocked verification move is currently selected.")
  const blockerMove = taskLine(blockedSignal, "No blocked/admin risk is currently selected.")

  if (actionId === "blocker-scan") {
    return {
      executive_summary: "Blocked work needs a separate PM lane before normal execution continues.",
      operating_mode: "Blocker Triage",
      recommendation: `Treat blocked/admin risk as a separate PM lane, not as normal execution work. Review this blocker first: ${blockerMove}`,
      reasoning_summary: `${projectLine} First move: ${firstMove}`,
      priority_stack: [
        { lane: "Do", title: firstMove, why: "Highest executable KP-owned move." },
        { lane: "Blocked Decision", title: blockerMove, why: "Must be cleared outside the normal execution lane." },
        { lane: "Delegate", title: delegateMove, why: "Move team-owned setup work away from KP's execution queue." },
      ],
      blocked_decisions: [blockerMove],
      delegation_plan: [delegateMove],
      risks: [
        "Blocked work can hide behind normal open-task volume.",
        "Decision items need routing before the team can execute cleanly.",
        "No item should be marked complete without a proof receipt.",
      ],
      codex_verification_steps: [
        "Open the selected blocker task and confirm the blocker reason.",
        "Confirm owner, due date, and next action are visible on the task.",
        "Record or attach the proof receipt before closing the loop.",
      ],
      not_allowed_to_do: ["The dashboard PM cannot mutate tasks directly from this readout yet."],
      confidence_score: 0.82,
    }
  }

  if (actionId === "task-shape") {
    return {
      executive_summary: "Turn the first move into board-ready work with owner, due date, and proof.",
      operating_mode: "Task Design",
      recommendation: `Shape the next board work from the current first move: ${firstMove}`,
      reasoning_summary: `${projectLine} Keep each task tied to a project, owner, due timing, and definition of done.`,
      priority_stack: [
        { lane: "Task Source", title: firstMove, why: "This is the current work signal to convert into clean tasks." },
        { lane: "Blocked Decision", title: blockerMove, why: "Keep blocked work out of new task creation until the blocker is named." },
      ],
      blocked_decisions: [blockerMove],
      delegation_plan: [delegateMove],
      risks: [
        "Vague task titles will not map cleanly into project panels.",
        "Unowned work will fall back into dashboard noise.",
      ],
      codex_verification_steps: [
        "Create or update each task with project name in the title or description.",
        "Assign owner, priority, due date, and status.",
        "Reopen My Dashboard and verify the task appears in the correct project/month lane.",
      ],
      not_allowed_to_do: ["The dashboard PM can draft task structure; task creation still needs the task tool flow."],
      confidence_score: 0.78,
    }
  }

  if (actionId === "today-priority") {
    const nextSentence = executableNextMove ? `Then move to: ${nextMove}.` : "No second executable move is queued."
    const verifySentence = executableVerifyMove ? `Verify: ${verifyMove}.` : "No non-blocked verification move is currently selected."

    return {
      executive_summary: "Run one executable move, keep blocked work in a PM decision lane, and avoid false verification.",
      operating_mode: "Execution",
      recommendation: `Do this first: ${firstMove}. ${nextSentence} Keep this blocked/admin item in the PM decision lane: ${blockerMove}. Delegate: ${delegateMove}. ${verifySentence}`,
      reasoning_summary: `The dashboard is showing ${context.visibleTaskRows} visible rows, ${context.decisionCount} decision items, and ${context.blockedCount} blocked items for ${context.todayLabel}.`,
      priority_stack: [
        { lane: "Do Now", title: firstMove, why: "Executable, KP-owned, highest priority move." },
        { lane: "Next", title: nextMove, why: executableNextMove ? "Second executable item after the first move." : "No clean second executable move is available." },
        { lane: "Blocked Decision", title: blockerMove, why: "Blocked/legal/admin work should not be treated as normal execution." },
        { lane: "Delegate", title: delegateMove, why: "Move assignable team work out of KP's direct lane." },
        { lane: "Verify", title: verifyMove, why: executableVerifyMove ? "Non-blocked item needing proof." : "No non-blocked verification target is available." },
      ],
      blocked_decisions: [blockerMove],
      delegation_plan: [delegateMove],
      risks: [
        "Treating blocked or legal/admin work as normal next-action work will create bad sequencing.",
        "Delegation without owner, due date, and proof will create follow-up noise.",
      ],
      codex_verification_steps: [
        "Open the first-move task and confirm it is still current.",
        "Check whether the delegate move has an owner and due date.",
        "Add a receipt when the verified move is complete.",
      ],
      not_allowed_to_do: ["The dashboard PM cannot complete or verify tasks by itself."],
      confidence_score: 0.84,
    }
  }

  return {
    executive_summary: "Monthly work needs a control lane, executable tasks, blocker separation, and proof.",
    operating_mode: "Monthly Planning",
    recommendation: `Run ${topProject?.title ?? "the top project"} as the monthly control lane, then execute the first move, next move, delegate move, and verification move in order.`,
    reasoning_summary: `${projectLine} First move: ${firstMove} Next move: ${nextMove}`,
    priority_stack: [
      { lane: "Top Project", title: topProject?.title ?? "No active project", why: projectLine },
      { lane: "Do Now", title: firstMove, why: "First executable move." },
      { lane: "Blocked Decision", title: blockerMove, why: "Must be separated from normal execution." },
      { lane: "Delegate", title: delegateMove, why: "Routable work should not sit in KP's direct lane." },
    ],
    blocked_decisions: [blockerMove],
    delegation_plan: [delegateMove],
    risks: [
      "The month plan will drift if blocked items are not separated from normal tasks.",
      "AI PM guidance is planning support, not a completion receipt.",
    ],
    codex_verification_steps: [
      "Click the top project card and verify this month's task bucket.",
      "Open the first-move task before acting.",
      "Record proof once the work is verified.",
    ],
    not_allowed_to_do: ["The dashboard PM cannot mark the monthly plan complete without verified receipts."],
    confidence_score: 0.8,
  }
}

function ResultPanel({ result }: { result: AdvisorResult }) {
  const risks = cleanList(result.risks)
  const proof = cleanList(result.codex_verification_steps)
  const blocked = cleanList(result.not_allowed_to_do)
  const priorityStack = cleanPriorityStack(result.priority_stack)
  const blockedDecisions = cleanList(result.blocked_decisions)
  const delegationPlan = cleanList(result.delegation_plan)
  const kpQuestions = cleanList(result.questions_for_kp)
  const actionStack = priorityStack.slice(0, 3)
  const firstAction = actionStack[0]
  const decisionText = kpQuestions[0] ?? blockedDecisions[0]

  return (
    <div className="rounded-lg border border-[#D7B85E] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#E8DEC7] bg-[#FCFAF5] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D7B85E] bg-white">
          <Brain className="h-3.5 w-3.5 text-[#8A610F]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">AI PM</p>
          <p className="truncate text-xs font-semibold text-[#171717]">{result.operating_mode ?? "Dashboard answer"}</p>
        </div>
        {typeof result.confidence_score === "number" && (
          <span className="ml-auto rounded-full border border-[#E3D7BC] bg-white px-2 py-1 text-[10px] font-semibold text-[#6B6254]">
            {Math.round(result.confidence_score * 100)}%
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="max-w-3xl rounded-lg rounded-tl-sm bg-[#F7F3EA] px-4 py-3">
          {result.executive_summary && (
            <p className="mb-2 text-sm font-semibold leading-relaxed text-[#171717]">{result.executive_summary}</p>
          )}
          {firstAction?.title ? (
            <div className="rounded-md border border-[#E8DEC7] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A610F]">First move</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-[#171717]">{firstAction.title}</p>
              {firstAction.why && <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{firstAction.why}</p>}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#3F3A32]">
              {result.recommendation ?? "No recommendation returned."}
            </p>
          )}
        </div>

        {actionStack.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#8A610F]" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Next sequence</h3>
            </div>
            <div className="space-y-2">
              {actionStack.map((item, index) => (
                <div key={`${item.lane ?? "lane"}-${index}`} className="flex gap-3 rounded-md border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A610F]">{item.lane ?? "Move"}</p>
                    {item.title && <p className="mt-0.5 text-xs font-semibold leading-snug text-[#171717]">{item.title}</p>}
                    {item.why && <p className="mt-1 text-[10px] leading-relaxed text-[#5F5A51]">{item.why}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {decisionText && (
          <div className="rounded-md border border-[#D7B85E] bg-[#FFFCF2] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A610F]">Needs your call</p>
            <p className="mt-1 text-xs leading-relaxed text-[#3F3A32]">{decisionText}</p>
          </div>
        )}

        <details className="group rounded-md border border-[#E8DEC7] bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#6B6254] transition hover:text-[#171717]">
            Show PM details
          </summary>
          <div className="space-y-3 border-t border-[#E8DEC7] px-3 py-3">
            {result.recommendation && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Full PM read</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{result.recommendation}</p>
              </div>
            )}
            {result.reasoning_summary && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Why</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{result.reasoning_summary}</p>
              </div>
            )}
            {delegationPlan.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Delegation</h3>
                <ul className="mt-1 space-y-1">
                  {delegationPlan.map((item) => (
                    <li key={item} className="text-xs leading-relaxed text-[#5F5A51]">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {risks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Risks</h3>
                <ul className="mt-1 space-y-1">
                  {risks.map((risk) => (
                    <li key={risk} className="text-xs leading-relaxed text-[#5F5A51]">{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {proof.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Proof</h3>
                <ul className="mt-1 space-y-1">
                  {proof.map((step) => (
                    <li key={step} className="text-xs leading-relaxed text-[#5F5A51]">{step}</li>
                  ))}
                </ul>
              </div>
            )}
            {blocked.length > 0 && (
              <div className="rounded-md border border-[#E8DEC7] bg-[#FBF7ED] px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Boundary</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{blocked.join(" ")}</p>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

export function AiPmAssistant({ context }: AiPmAssistantProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [result, setResult] = useState<AdvisorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [providerLabel, setProviderLabel] = useState("DeepSeek / deepseek-v4-flash")
  const [customPrompt, setCustomPrompt] = useState("")

  const contextSummary = useMemo(() => JSON.stringify({
    operating_contract: aiPmOperatingContract,
    dashboard_context: context,
  }, null, 2), [context])

  async function runPm(action: AiPmAction) {
    setActiveAction(action.id)
    setError(null)
    setResult(buildLocalPmResult(action.id, context))
    setProviderLabel("DeepSeek / deepseek-v4-flash running")

    try {
      const response = await fetch("/api/os/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "deepseek",
          purpose: action.purpose,
          prompt: action.prompt,
          context: contextSummary,
        }),
      })
      const payload = (await response.json()) as AdvisorResponse

      if (!response.ok) throw new Error(payload.error ?? "AI PM could not produce a readout.")
      if (!payload.result) throw new Error("AI PM provider returned no readout, so the dashboard draft remains visible.")
      setResult(payload.result)
      setProviderLabel(payload.provider && payload.model ? `${payload.provider} / ${payload.model}` : "Dashboard PM")
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI PM could not produce a readout.")
      setProviderLabel("DeepSeek / deepseek-v4-flash draft")
    } finally {
      setActiveAction(null)
    }
  }

  async function submitCustomPrompt() {
    const prompt = customPrompt.trim()
    if (prompt.length < 8 || activeAction) return

    await runPm({
      id: "custom-prompt",
      label: "Ask PM",
      detail: "Custom dashboard PM prompt.",
      icon: Send,
      purpose: "implementation_plan",
      prompt: `Operate as Keymon's enterprise PM assistant inside My Dashboard. Answer this like a Codex-style task PM flow: ${prompt}`,
    })
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#D7B85E] bg-white shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] lg:p-5">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D7B85E] bg-[#FBF7ED]">
              <Brain className="h-4 w-4 text-[#8A610F]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">
                Keymon's AI PM
              </p>
              <h2 className="text-xl font-condensed font-bold uppercase tracking-tight text-[#171717]">
                Dashboard project manager
              </h2>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-[#5F5A51]">
            Ask it what to do next. It reads your task board, keeps blockers separate, and answers here without opening LanternAI.
          </p>
          <div className="mt-4 rounded-lg border border-[#E8DEC7] bg-[#FCFAF5] p-2">
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="Ask your PM what to do next..."
              rows={3}
              className="min-h-20 w-full resize-none rounded-md border border-transparent bg-white px-3 py-2 text-sm text-[#171717] outline-none transition placeholder:text-[#9A9388] focus:border-[#D7B85E]"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A610F]">{providerLabel}</span>
              <button
                type="button"
                onClick={submitCustomPrompt}
                disabled={activeAction !== null || customPrompt.trim().length < 8}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#171717] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2B2925] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "custom-prompt" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Ask
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md border border-[#E3D7BC] bg-[#FBF7ED] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Decisions</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{context.decisionCount}</p>
            </div>
            <div className="rounded-md border border-[#E3D7BC] bg-[#FBF7ED] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Blocked</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{context.blockedCount}</p>
            </div>
            <div className="rounded-md border border-[#E3D7BC] bg-[#FBF7ED] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Visible</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{context.visibleTaskRows}</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6254]">Current first move</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-[#171717]">
              {context.primaryMove ? context.primaryMove.title : "No urgent KP-owned task is currently selected."}
            </p>
            {context.primaryMove && (
              <p className="mt-1 text-xs text-[#5F5A51]">
                {context.primaryMove.project} / {context.primaryMove.due} / {context.primaryMove.priority}
              </p>
            )}
          </div>
        </div>

        <div className="grid content-start grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {actions.map((action) => {
            const Icon = action.icon
            const loading = activeAction === action.id
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => runPm(action)}
                disabled={activeAction !== null}
                className="group flex items-center gap-3 rounded-full border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-2 text-left transition hover:border-[#C8A951] hover:bg-[#FBF7ED] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9A6A12]" strokeWidth={1.75} />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#9A6A12]" strokeWidth={1.75} />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#171717]">{action.label}</span>
                  <span className="block truncate text-[10px] text-[#6B6254]">{action.detail}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {(result || error) && (
        <div className="border-t border-[#E8DEC7] bg-[#FBF7ED] p-4">
          {result ? <ResultPanel result={result} /> : null}
          {error ? (
            <div className="rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-[#5F5A51]">
              {error}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[#E8DEC7] bg-[#FBF7ED] px-4 py-3 text-xs text-[#5F5A51] sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#8A610F]" strokeWidth={1.75} />
          PM can plan and route; Codex/app actions still verify and record receipts.
        </span>
      </div>
    </section>
  )
}
