"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isTextUIPart } from "ai"
import { ChevronUp, ChevronDown, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { MentionTextarea } from "@/components/byred/mention-textarea"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const transport = new DefaultChatTransport({ api: "/api/os/lantern-ai" })
const SUGGESTIONS = ["What should I focus on today?", "Highest-priority blockers?", "Which projects are at risk?"]

function LanternMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="6" fill="#D7261E" />
      <path d="M16 5L20 11H12L16 5Z" fill="white" opacity="0.9" />
      <rect x="12" y="11" width="8" height="11" rx="1" fill="white" opacity="0.85" />
      <rect x="14.5" y="22" width="3" height="4" rx="0.75" fill="white" opacity="0.7" />
    </svg>
  )
}

export function LanternDock() {
  const { isCollapsed } = useSidebar()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const teamMembers = useTeamMembers()
  const { messages, sendMessage, status, error } = useChat({ transport })
  const isActive = status === "submitted" || status === "streaming"

  // Persist open/closed.
  useEffect(() => {
    try { setOpen(localStorage.getItem("lantern_dock_open") === "1") } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem("lantern_dock_open", open ? "1" : "0") } catch { /* ignore */ }
  }, [open])
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, open])

  function submit() {
    const text = input.trim()
    if (!text || isActive) return
    setInput("")
    sendMessage({ text })
    if (!open) setOpen(true)
  }

  const leftClass = isMobile ? "left-0" : isCollapsed ? "left-14" : "left-56"

  return (
    <div className={cn("fixed bottom-0 right-0 z-40 transition-all duration-300", leftClass)}>
      {/* Expanded chat panel */}
      {open && (
        <div className="flex flex-col border-t border-white/[0.08] bg-[#0A0B0F] shadow-[0_-8px_24px_rgba(0,0,0,0.4)]" style={{ height: "min(60vh, 560px)" }}>
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2">
              <LanternMark />
              <span className="text-sm font-bold text-zinc-50 tracking-tight">LanternAI</span>
              <span className="text-[10px] text-[#6B7280]">operations assistant</span>
            </div>
            <button onClick={() => setOpen(false)} title="Collapse" className="w-6 h-6 inline-flex items-center justify-center rounded text-[#9CA3AF] hover:text-white hover:bg-white/5">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 [scrollbar-width:thin]">
            {messages.length === 0 && (
              <div className="text-center pt-8">
                <p className="text-sm font-semibold text-zinc-100 mb-1">How can I help?</p>
                <p className="text-[11px] text-[#6B7280] mb-3">Ask about tasks, projects, blockers — or tell me to build something.</p>
                <div className="flex gap-1.5 justify-center flex-wrap">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="text-[10px] text-[#9CA3AF] bg-[#111318] border border-white/10 rounded-md px-2.5 py-1 hover:border-red-500/40 hover:text-white">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.filter(isTextUIPart).map((p) => p.text).join("")
              const streamingThis = isActive && m.role === "assistant" && m.id === messages[messages.length - 1]?.id
              return (
                <div key={m.id} className={cn("flex mb-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] px-3 py-2 text-[13px] text-zinc-50 leading-relaxed whitespace-pre-wrap",
                    m.role === "user" ? "bg-red-600 rounded-xl rounded-br-sm" : "bg-[#111318] border border-white/[0.07] rounded-xl rounded-bl-sm")}>
                    {text}
                    {streamingThis && <span className="inline-block w-[3px] h-3.5 ml-0.5 bg-zinc-500 align-middle animate-pulse" />}
                  </div>
                </div>
              )
            })}
            {isActive && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start mb-2.5"><div className="px-3 py-2 bg-[#111318] border border-white/[0.07] rounded-xl text-xs text-[#6B7280]">Thinking…</div></div>
            )}
            {error && <div className="text-center py-2 text-xs text-red-500">Something went wrong. Try again.</div>}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Bar: input + expand/collapse toggle (always visible) */}
      <div className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0A0B0F] px-3 py-2">
        {!open && <button onClick={() => setOpen(true)} title="Open Lantern" className="shrink-0"><LanternMark /></button>}
        <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex-1 flex items-center gap-2 bg-[#111318] border border-white/10 rounded-lg px-3 py-1.5">
          <MentionTextarea
            placeholder="Ask LanternAI…  (@name to mention)"
            value={input}
            onChange={setInput}
            users={teamMembers}
            onSubmit={submit}
            disabled={isActive}
            className="flex-1 text-zinc-50 text-[13px] placeholder-zinc-600 disabled:opacity-50 min-h-[20px] max-h-[80px]"
            autoResize
            maxHeight={80}
          />
          <button type="submit" title="Send" disabled={isActive || !input.trim()}
            className={cn("w-7 h-7 inline-flex items-center justify-center rounded-md shrink-0 transition-colors",
              isActive || !input.trim() ? "bg-white/[0.06] text-[#6B7280] cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-500")}>
            <Send size={12} strokeWidth={2} />
          </button>
        </form>
        <button onClick={() => setOpen((o) => !o)} title={open ? "Collapse" : "Expand chat"} className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/5">
          {open ? <X className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
