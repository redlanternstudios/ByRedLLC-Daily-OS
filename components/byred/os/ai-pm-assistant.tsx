"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Brain, CheckCircle2, ClipboardList, Lightbulb, Loader2, ShieldCheck, Target } from "lucide-react"

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
  decisionCount: number
  blockedCount: number
  visibleTaskRows: number
  projects: AiPmProjectSignal[]
}

type AdvisorResult = {
  recommendation?: string
  reasoning_summary?: string
  risks?: string[]
  codex_verification_steps?: string[]
  not_allowed_to_do?: string[]
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

const actions = [
  {
    id: "month-plan",
    label: "Plan Month",
    detail: "Build a clean monthly execution plan.",
    icon: ClipboardList,
    purpose: "implementation_plan",
    prompt: "Act as Keymon's embedded AI PM inside My Dashboard. Build a clear monthly execution plan from the dashboard context. Include the top project, the first three moves, owners or routing notes, blockers, and what proof is needed before any work is called complete.",
  },
  {
    id: "today-priority",
    label: "Prioritize Today",
    detail: "Pick the next move and why.",
    icon: Target,
    purpose: "implementation_plan",
    prompt: "Act as Keymon's embedded AI PM inside My Dashboard. Prioritize today from the dashboard context. Give one first move, one next move, what to delegate, and what should not be touched yet.",
  },
  {
    id: "blocker-scan",
    label: "Find Blockers",
    detail: "Surface risk before it spreads.",
    icon: AlertTriangle,
    purpose: "ux_risk",
    prompt: "Act as Keymon's embedded AI PM inside My Dashboard. Find blockers, risks, missing decisions, and proof gaps in the dashboard context. Separate what KP should decide from what the team can execute.",
  },
  {
    id: "task-shape",
    label: "Shape Tasks",
    detail: "Turn direction into board-ready work.",
    icon: Lightbulb,
    purpose: "implementation_plan",
    prompt: "Act as Keymon's embedded AI PM inside My Dashboard. Convert the dashboard direction into clean board-ready tasks. For each task include project, priority, owner or route, due timing, and definition of done.",
  },
] as const

const aiPmOperatingContract = {
  identity: "Keymon's embedded AI PM inside ByRedLLC My Dashboard",
  provider: "deepseek",
  lane: "cost-aware PM reasoning, code-risk critique, task shaping, blocker analysis, and execution planning",
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
  ],
  requiredOutput: [
    "Return one clear recommendation.",
    "Explain why using current dashboard signals.",
    "List risks or blockers.",
    "List Codex verification steps before completion.",
    "State what the dashboard PM is not allowed to do.",
  ],
}

function cleanList(value: string[] | undefined) {
  return value?.filter(Boolean).slice(0, 5) ?? []
}

function taskLine(task: AiPmTaskSignal | null, fallback: string) {
  if (!task) return fallback
  return `${task.title} (${task.project}, ${task.due}, ${task.priority}, ${task.status})`
}

function buildLocalPmResult(actionId: string, context: AiPmDashboardContext): AdvisorResult {
  const topProject = context.projects.find((project) => project.openCount > 0) ?? context.projects[0]
  const projectLine = topProject
    ? `${topProject.title} is carrying ${topProject.openCount} open items, ${topProject.monthCount} due this month, and ${topProject.blockedCount} blocked.`
    : "No active project pressure is showing in the dashboard context."
  const firstMove = taskLine(context.primaryMove, "No urgent first move is selected.")
  const nextMove = taskLine(context.nextMove, "No second move is queued.")
  const delegateMove = taskLine(context.delegateMove, "No delegation move is currently selected.")
  const verifyMove = taskLine(context.verifyMove, "No verification move is currently selected.")

  if (actionId === "blocker-scan") {
    return {
      recommendation: `Treat blockers as the control point first. The dashboard shows ${context.blockedCount} blocked items and ${context.decisionCount} PM decision items, so clear the highest-risk blocker before adding new work.`,
      reasoning_summary: `${projectLine} First move: ${firstMove}`,
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
    }
  }

  if (actionId === "task-shape") {
    return {
      recommendation: `Shape the next board work from the current first move: ${firstMove}`,
      reasoning_summary: `${projectLine} Keep each task tied to a project, owner, due timing, and definition of done.`,
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
    }
  }

  if (actionId === "today-priority") {
    return {
      recommendation: `Do this first: ${firstMove}. Then move to: ${nextMove}. Delegate: ${delegateMove}. Verify: ${verifyMove}.`,
      reasoning_summary: `The dashboard is showing ${context.visibleTaskRows} visible rows, ${context.decisionCount} decision items, and ${context.blockedCount} blocked items for ${context.todayLabel}.`,
      risks: [
        "Starting with lower-priority work will let blocked or critical items age.",
        "Delegation without proof will create follow-up noise.",
      ],
      codex_verification_steps: [
        "Open the first-move task and confirm it is still current.",
        "Check whether the delegate move has an owner and due date.",
        "Add a receipt when the verified move is complete.",
      ],
      not_allowed_to_do: ["The dashboard PM cannot complete or verify tasks by itself."],
    }
  }

  return {
    recommendation: `Run ${topProject?.title ?? "the top project"} as the monthly control lane, then execute the first move, next move, delegate move, and verification move in order.`,
    reasoning_summary: `${projectLine} First move: ${firstMove} Next move: ${nextMove}`,
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
  }
}

function ResultPanel({ result }: { result: AdvisorResult }) {
  const risks = cleanList(result.risks)
  const proof = cleanList(result.codex_verification_steps)
  const blocked = cleanList(result.not_allowed_to_do)

  return (
    <div className="rounded-lg border border-[#D7B85E] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[#8A610F]" strokeWidth={1.75} />
        <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">
          AI PM Readout
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#171717]">Recommendation</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#3F3A32]">
            {result.recommendation ?? "No recommendation returned."}
          </p>
        </div>
        {result.reasoning_summary && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Why</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{result.reasoning_summary}</p>
          </div>
        )}
        {risks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Risks</h3>
            <ul className="mt-1 space-y-1">
              {risks.map((risk) => (
                <li key={risk} className="text-xs leading-relaxed text-[#5F5A51]">
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
        {proof.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Proof Steps</h3>
            <ul className="mt-1 space-y-1">
              {proof.map((step) => (
                <li key={step} className="text-xs leading-relaxed text-[#5F5A51]">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
        {blocked.length > 0 && (
          <div className="rounded-md border border-[#E8DEC7] bg-[#FBF7ED] px-3 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6254]">Cannot Do Inside Dashboard</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#5F5A51]">{blocked.join(" ")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function AiPmAssistant({ context }: AiPmAssistantProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [result, setResult] = useState<AdvisorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [providerLabel, setProviderLabel] = useState("Dashboard PM")

  const contextSummary = useMemo(() => JSON.stringify({
    operating_contract: aiPmOperatingContract,
    dashboard_context: context,
  }, null, 2), [context])

  async function runPm(action: (typeof actions)[number]) {
    setActiveAction(action.id)
    setError(null)
    setResult(buildLocalPmResult(action.id, context))
    setProviderLabel("Dashboard PM draft")

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
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#D7B85E] bg-white shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] lg:p-5">
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
            This PM works inside My Dashboard. It reads the current dashboard signals and returns a plan here without opening LanternAI.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {actions.map((action) => {
            const Icon = action.icon
            const loading = activeAction === action.id
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => runPm(action)}
                disabled={activeAction !== null}
                className="group flex items-center justify-between gap-3 rounded-md border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-3 text-left transition hover:border-[#C8A951] hover:bg-[#FBF7ED] disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex min-w-0 items-start gap-2">
                  {loading ? (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[#9A6A12]" strokeWidth={1.75} />
                  ) : (
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6A12]" strokeWidth={1.75} />
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[#171717]">{action.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-[#6B6254]">{action.detail}</span>
                  </span>
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
          AI PM can organize and recommend; task changes still need app/tool confirmation and receipts.
        </span>
        <span className="font-semibold text-[#8A610F]">{providerLabel}</span>
      </div>
    </section>
  )
}
