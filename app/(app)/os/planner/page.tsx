"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, Bot, User, PencilLine } from "lucide-react"

type Tenant = { id: string; name: string }
type Draft = {
  restated_goal: string
  clarifying_questions: string[]
  assumptions: string[]
  risks: { risk: string; mitigation: string }[]
  proposed_epics: { name: string; summary: string; est_stories: number }[]
}
type Capability = "ai_can_complete" | "ai_can_draft" | "human_only"
type Story = {
  title: string; user_story: string; description: string
  acceptance_criteria: string[]; definition_of_done: string[]
  priority: "critical" | "high" | "medium" | "low"; estimate_minutes: number
  capability: Capability; capability_reason: string
}
type Plan = { epics: { name: string; goal: string; stories: Story[] }[] }
type Mode = "HUMAN_ONLY" | "AI_DRAFT" | "AI_EXECUTE"
type Sel = { on: boolean; mode: Mode }

const card = "rounded-xl bg-[#111318] border border-[#2A2D35] p-5"
const label = "text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest"
const prio: Record<string, string> = { critical: "#F87171", high: "#FB923C", medium: "#FACC15", low: "#4ADE80" }

const CAP: Record<Capability, { text: string; color: string; bg: string }> = {
  ai_can_complete: { text: "AI can complete", color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  ai_can_draft: { text: "AI can draft", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  human_only: { text: "Human only", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)" },
}
const defaultMode = (c: Capability): Mode => c === "ai_can_complete" ? "AI_EXECUTE" : c === "ai_can_draft" ? "AI_DRAFT" : "HUMAN_ONLY"
const keyOf = (ei: number, si: number) => `${ei}-${si}`

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
  const [refine, setRefine] = useState("")
  const [step, setStep] = useState<"input" | "golden" | "plan" | "done">("input")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [sel, setSel] = useState<Record<string, Sel>>({})
  const [created, setCreated] = useState<{ created: number; aiQueued: number }>({ created: 0, aiQueued: 0 })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/os/tenants").then((r) => r.json()).then((d) => {
      const t = d.tenants ?? []; setTenants(t); if (t[0]) setTenantId(t[0].id)
    }).catch(() => {})
  }, [])

  // Initialise the menu selection whenever a new plan arrives.
  useEffect(() => {
    if (!plan) return
    const next: Record<string, Sel> = {}
    plan.epics.forEach((e, ei) => e.stories.forEach((s, si) => {
      next[keyOf(ei, si)] = { on: true, mode: defaultMode(s.capability) }
    }))
    setSel(next)
  }, [plan])

  const run = async (fn: () => Promise<void>) => {
    setErr(""); setLoading(true)
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong") } finally { setLoading(false) }
  }
  const doDraft = () => run(async () => { const j = await call({ mode: "draft", tenantId, goal, answers }); setDraft(j.draft); setStep("golden") })
  const doGenerate = (rev?: string) => run(async () => { const j = await call({ mode: "generate", tenantId, goal, answers, golden: draft, refine: rev ?? "" }); setPlan(j.plan); setRefine(""); setStep("plan") })
  const doCommit = () => run(async () => {
    const items: unknown[] = []
    plan!.epics.forEach((e, ei) => e.stories.forEach((s, si) => {
      const k = sel[keyOf(ei, si)]; if (!k || !k.on) return
      items.push({ epic_name: e.name, title: s.title, user_story: s.user_story, description: s.description,
        acceptance_criteria: s.acceptance_criteria, definition_of_done: s.definition_of_done,
        priority: s.priority, estimate_minutes: s.estimate_minutes, ai_mode: k.mode })
    }))
    const j = await call({ mode: "commit", tenantId, items }); setCreated(j); setStep("done")
  })

  const setMode = (k: string, mode: Mode) => setSel((p) => ({ ...p, [k]: { on: p[k]?.on ?? true, mode } }))
  const toggle = (k: string) => setSel((p) => ({ ...p, [k]: { on: !(p[k]?.on ?? true), mode: p[k]?.mode ?? "HUMAN_ONLY" } }))
  const selectedCount = Object.values(sel).filter((s) => s.on).length
  const aiCount = Object.values(sel).filter((s) => s.on && (s.mode === "AI_DRAFT" || s.mode === "AI_EXECUTE")).length

  const ModeBtn = ({ k, m, cap, icon: Icon, text }: { k: string; m: Mode; cap: Capability; icon: typeof Bot; text: string }) => {
    const disabled = cap === "human_only" && m !== "HUMAN_ONLY"
    const active = (sel[k]?.mode ?? "HUMAN_ONLY") === m
    return (
      <button type="button" disabled={disabled} onClick={() => setMode(k, m)}
        className={"flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors " +
          (active ? "bg-[#D92532] border-[#D92532] text-white" : disabled ? "border-[#2A2D35]/50 text-[#52525B] cursor-not-allowed" : "border-[#2A2D35] text-[#9CA3AF] hover:text-white")}>
        <Icon className="w-3 h-3" /> {text}
      </button>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-5 h-5 text-[#D92532]" strokeWidth={1.75} />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Project Partner</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Shape the plan, then check the plates you want. You decide who cooks each one.</p>
        </div>
      </div>

      {err && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" /> {err}</div>}

      {/* STEP 1 — INPUT */}
      {step === "input" && (
        <div className={card + " space-y-4"}>
          <div>
            <span className={label}>Project</span>
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="mt-2 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white">
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>What do you want to achieve?</span>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={5}
              placeholder="e.g. Launch a simple booking page for Paradise so customers can request a quote and we get notified."
              className="mt-2 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white placeholder:text-[#52525B]" />
          </div>
          <button onClick={doDraft} disabled={loading || !goal.trim() || !tenantId} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Draft the golden path
          </button>
        </div>
      )}

      {/* STEP 2 — GOLDEN PATH */}
      {step === "golden" && draft && (
        <div className="space-y-4">
          <div className={card + " space-y-1"}><span className={label}>The goal, restated</span><p className="text-[15px] text-white leading-relaxed">{draft.restated_goal}</p></div>
          {draft.clarifying_questions.length > 0 && (
            <div className={card}>
              <span className={label}>Questions worth answering</span>
              <ul className="mt-2 space-y-1.5">{draft.clarifying_questions.map((q, i) => <li key={i} className="text-sm text-[#D1D5DB] flex gap-2"><span className="text-[#D92532]">?</span>{q}</li>)}</ul>
              <textarea value={answers} onChange={(e) => setAnswers(e.target.value)} rows={3} placeholder="Answer any of the above here (optional) so the plan fits better." className="mt-3 w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white placeholder:text-[#52525B]" />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className={card}><span className={label}>Assumptions we will proceed on</span><ul className="mt-2 space-y-1.5">{draft.assumptions.map((a, i) => <li key={i} className="text-sm text-[#D1D5DB] flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80] mt-0.5 shrink-0" />{a}</li>)}</ul></div>
            <div className={card}><span className={label}>Risks and mitigations</span><ul className="mt-2 space-y-2">{draft.risks.map((r, i) => <li key={i} className="text-sm"><span className="text-[#FCA5A5] flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{r.risk}</span><span className="block text-[#9CA3AF] text-xs ml-[22px]">{r.mitigation}</span></li>)}</ul></div>
          </div>
          <div className={card}><span className={label}>Proposed epics</span><div className="mt-2 space-y-2">{draft.proposed_epics.map((e, i) => <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#0E0F13] border border-[#2A2D35]/60"><div><p className="text-sm text-white font-medium">{e.name}</p><p className="text-xs text-[#9CA3AF]">{e.summary}</p></div><span className="text-[10px] text-[#6B7280] shrink-0 mt-1">~{e.est_stories} stories</span></div>)}</div></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("input")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]"><ArrowLeft className="w-4 h-4" /> Revise</button>
            <button onClick={() => doGenerate()} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium disabled:opacity-40">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Build the menu</button>
          </div>
        </div>
      )}

      {/* STEP 3 — THE MENU */}
      {step === "plan" && plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-[#9CA3AF]"><span className="text-white font-medium">{selectedCount}</span> plates checked · {aiCount} for the AI</p>
          </div>

          {/* refine / shape box */}
          <div className={card}>
            <span className={label}>Shape the plan</span>
            <div className="flex gap-2 mt-2">
              <input value={refine} onChange={(e) => setRefine(e.target.value)} placeholder="e.g. drop the multi language stuff, add a thank you page, keep it under a week"
                className="flex-1 rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2 text-sm text-white placeholder:text-[#52525B]" />
              <button onClick={() => doGenerate(refine)} disabled={loading || !refine.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF] hover:text-white disabled:opacity-40">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilLine className="w-4 h-4" />} Update
              </button>
            </div>
          </div>

          {plan.epics.map((epic, ei) => (
            <div key={ei} className={card}>
              <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-[#D92532]" /><span className="text-sm font-semibold text-white">{epic.name}</span></div>
              <p className="text-xs text-[#9CA3AF] mb-3">{epic.goal}</p>
              <div className="space-y-3">
                {epic.stories.map((s, si) => {
                  const k = keyOf(ei, si); const on = sel[k]?.on ?? true; const cap = CAP[s.capability]
                  return (
                    <div key={si} className={"p-3 rounded-lg border transition-colors " + (on ? "bg-[#0E0F13] border-[#2A2D35]" : "bg-transparent border-[#2A2D35]/40 opacity-55")}>
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggle(k)} className={"mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center " + (on ? "bg-[#D92532] border-[#D92532]" : "border-[#52525B]")}>
                          {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-white font-medium">{s.title}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-semibold" style={{ color: prio[s.priority] }}>{s.priority}</span>
                              <span className="text-[10px] text-[#6B7280]">{s.estimate_minutes}m</span>
                            </div>
                          </div>
                          <p className="text-xs text-[#9CA3AF] italic mt-1">{s.user_story}</p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: cap.color, backgroundColor: cap.bg }} title={s.capability_reason}>{cap.text}</span>
                            <span className="text-[#3F3F46]">|</span>
                            <ModeBtn k={k} m="HUMAN_ONLY" cap={s.capability} icon={User} text="I do it" />
                            <ModeBtn k={k} m="AI_DRAFT" cap={s.capability} icon={PencilLine} text="AI drafts" />
                            <ModeBtn k={k} m="AI_EXECUTE" cap={s.capability} icon={Bot} text="AI does it" />
                          </div>
                          <p className="text-[11px] text-[#6B7280] mt-1.5">{s.capability_reason}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 sticky bottom-4 bg-[#0A0B0F]/80 backdrop-blur py-2 rounded-lg">
            <button onClick={() => setStep("golden")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={doCommit} disabled={loading || selectedCount === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-semibold disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Place the order ({selectedCount})
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — DONE */}
      {step === "done" && (
        <div className={card + " flex flex-col items-center text-center gap-3 py-10"}>
          <CheckCircle2 className="w-10 h-10 text-[#4ADE80]" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-white">{created.created} tasks created</p>
          <p className="text-sm text-[#9CA3AF] max-w-md">
            {created.aiQueued > 0
              ? `${created.aiQueued} are marked for the AI partner. They are queued with their ai_mode — live execution (the kitchen) wires next, so for now they sit as flagged tasks for review.`
              : "All plates are owned by the team. Owners and dates can be set on the board."}
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/os/tasks" className="px-4 py-2.5 rounded-lg bg-[#D92532] text-white text-sm font-medium">View tasks</Link>
            <button onClick={() => { setStep("input"); setGoal(""); setAnswers(""); setRefine(""); setDraft(null); setPlan(null); setSel({}) }} className="px-4 py-2.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-sm text-[#9CA3AF]">Plan another</button>
          </div>
        </div>
      )}
    </div>
  )
}
