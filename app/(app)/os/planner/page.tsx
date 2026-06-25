"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, ListChecks } from "lucide-react"

type Tenant = { id: string; name: string }
type Draft = {
  restated_goal: string
  clarifying_questions: string[]
  assumptions: string[]
  risks: { risk: string; mitigation: string }[]
  proposed_epics: { name: string; summary: string; est_stories: number }[]
}
type Story = {
  title: string; user_story: string; description: string
  acceptance_criteria: string[]; definition_of_done: string[]
  priority: "critical" | "high" | "medium" | "low"; estimate_minutes: number
}
type Plan = { epics: { name: string; goal: string; stories: Story[] }[] }

const card = "rounded-xl bg-[#111318] border border-[#2A2D35] p-5"
const label = "text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest"
const prio: Record<string, string> = { critical: "#F87171", high: "#FB923C", medium: "#FACC15", low: "#4ADE80" }

async function call(payload: Record<string, unknown>) {
  const r = await fetch("/api/os/planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || "Request failed")
  return j
}

export default function PlannerPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState("")
  const [goal, setGoal] = useState("")
  const [answers, setAnswers] = useState("")
  const [step, setStep] = useState<"input" | "golden" | "plan" | "done">("input")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [created, setCreated] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/os/tenants").then((r) => r.json()).then((d) => {
      const t = d.tenants ?? []; setTenants(t); if (t[0]) setTenantId(t[0].id)
    }).catch(() => {})
  }, [])

  const run = async (fn: () => Promise<void>) => {
    setErr(""); setLoading(true)
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong") } finally { setLoading(false) }
  }

  const doDraft = () => run(async () => {
    const j = await call({ mode: "draft", tenantId, goal, answers }); setDraft(j.draft); setStep("golden")
  })
  const doGenerate = () => run(async () => {
    const j = await call({ mode: "generate", tenantId, goal, answers, golden: draft }); setPlan(j.plan); setStep("plan")
  })
  const doCommit = () => run(async () => {
    const j = await call({ mode: "commit", tenantId, plan }); setCreated(j.created); setStep("done")
  })

  const storyCount = plan ? plan.epics.reduce((s, e) => s + e.stories.length, 0) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-5 h-5 text-[#D92532]" strokeWidth={1.75} />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Project Partner</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Describe a goal. Confirm the plan. We write the tasks.</p>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {err}
        </div>
      )}

      {/* STEP 1 — INPUT */}
      {step === "input" && (
        <div className={card + " space-y-4"}>
          <div>
            <span className={label}>Project</span>
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}
              className="mt-2 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white">
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>What do you want to achieve?</span>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={5}
              placeholder="e.g. Launch a simple booking page for Paradise so customers can request a quote and we get notified."
              className="mt-2 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white placeholder:text-[#52525B]" />
          </div>
          <button onClick={doDraft} disabled={loading || !goal.trim() || !tenantId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Draft the golden path
          </button>
        </div>
      )}

      {/* STEP 2 — GOLDEN PATH */}
      {step === "golden" && draft && (
        <div className="space-y-4">
          <div className={card + " space-y-1"}>
            <span className={label}>The goal, restated</span>
            <p className="text-[15px] text-white leading-relaxed">{draft.restated_goal}</p>
          </div>

          {draft.clarifying_questions.length > 0 && (
            <div className={card}>
              <span className={label}>Questions worth answering</span>
              <ul className="mt-2 space-y-1.5">
                {draft.clarifying_questions.map((q, i) => <li key={i} className="text-sm text-[#D1D5DB] flex gap-2"><span className="text-[#D92532]">?</span>{q}</li>)}
              </ul>
              <textarea value={answers} onChange={(e) => setAnswers(e.target.value)} rows={3}
                placeholder="Answer any of the above here (optional) so the plan fits better."
                className="mt-3 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white placeholder:text-[#52525B]" />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className={card}>
              <span className={label}>Assumptions we will proceed on</span>
              <ul className="mt-2 space-y-1.5">
                {draft.assumptions.map((a, i) => <li key={i} className="text-sm text-[#D1D5DB] flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80] mt-0.5 shrink-0" />{a}</li>)}
              </ul>
            </div>
            <div className={card}>
              <span className={label}>Risks and mitigations</span>
              <ul className="mt-2 space-y-2">
                {draft.risks.map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-[#FCA5A5] flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{r.risk}</span>
                    <span className="block text-[#9CA3AF] text-xs pl-5.5 ml-[22px]">{r.mitigation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={card}>
            <span className={label}>Proposed epics</span>
            <div className="mt-2 space-y-2">
              {draft.proposed_epics.map((e, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#0E0F13] border border-[#2A2D35]/60">
                  <div><p className="text-sm text-white font-medium">{e.name}</p><p className="text-xs text-[#9CA3AF]">{e.summary}</p></div>
                  <span className="text-[10px] text-[#6B7280] shrink-0 mt-1">~{e.est_stories} stories</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("input")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]">
              <ArrowLeft className="w-4 h-4" /> Revise
            </button>
            <button onClick={doGenerate} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Looks right, build the full plan
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — PLAN */}
      {step === "plan" && plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#9CA3AF]">{plan.epics.length} epics · <span className="text-white font-medium">{storyCount} stories</span> ready to create</p>
          </div>
          {plan.epics.map((epic, ei) => (
            <div key={ei} className={card}>
              <div className="flex items-center gap-2 mb-1"><ListChecks className="w-4 h-4 text-[#D92532]" /><span className="text-sm font-semibold text-white">{epic.name}</span></div>
              <p className="text-xs text-[#9CA3AF] mb-3">{epic.goal}</p>
              <div className="space-y-3">
                {epic.stories.map((s, si) => (
                  <div key={si} className="p-3 rounded-lg bg-[#0E0F13] border border-[#2A2D35]/60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white font-medium">{s.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold" style={{ color: prio[s.priority] }}>{s.priority}</span>
                        <span className="text-[10px] text-[#6B7280]">{s.estimate_minutes}m</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#9CA3AF] italic mt-1">{s.user_story}</p>
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[#6B7280]">Acceptance</span>
                        <ul className="mt-0.5">{s.acceptance_criteria.map((a, i) => <li key={i} className="text-[11px] text-[#D1D5DB]">• {a}</li>)}</ul>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[#6B7280]">Definition of done</span>
                        <ul className="mt-0.5">{s.definition_of_done.map((d, i) => <li key={i} className="text-[11px] text-[#D1D5DB]">• {d}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 sticky bottom-4">
            <button onClick={() => setStep("golden")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={doCommit} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-semibold disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create {storyCount} tasks
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — DONE */}
      {step === "done" && (
        <div className={card + " flex flex-col items-center text-center gap-3 py-10"}>
          <CheckCircle2 className="w-10 h-10 text-[#4ADE80]" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-white">{created} tasks created</p>
          <p className="text-sm text-[#9CA3AF] max-w-sm">Your plan is now live in the project. Owners and dates can be set on the board.</p>
          <div className="flex gap-3 mt-2">
            <Link href="/os/tasks" className="px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium">View tasks</Link>
            <button onClick={() => { setStep("input"); setGoal(""); setAnswers(""); setDraft(null); setPlan(null) }}
              className="px-4 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]">Plan another</button>
          </div>
        </div>
      )}
    </div>
  )
}
