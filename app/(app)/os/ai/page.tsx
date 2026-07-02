"use client"

import { useState, useEffect, useRef } from "react"
import type { ComponentType } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isTextUIPart } from "ai"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { MentionTextarea } from "@/components/byred/mention-textarea"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const SUGGESTIONS = [
  "What are the highest-priority blockers right now?",
  "Summarize open tasks by tenant",
  "What should I focus on today?",
  "Which projects are at risk?",
]

function LanternIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="6" fill="#D7261E" />
      <path d="M16 5L20 11H12L16 5Z" fill="white" opacity="0.9" />
      <rect x="12" y="11" width="8" height="11" rx="1" fill="white" opacity="0.85" />
      <rect x="14.5" y="22" width="3" height="4" rx="0.75" fill="white" opacity="0.7" />
      <circle cx="16" cy="16.5" r="2.5" fill="#D7261E" opacity="0.6" />
    </svg>
  )
}

const transport = new DefaultChatTransport({ api: "/api/os/lantern-ai" })


export default function OSAIPage() {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const teamMembers = useTeamMembers()

  const { messages, sendMessage, status, error } = useChat({ transport })

  const isActive = status === "submitted" || status === "streaming"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isActive) return
    setInput("")
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      <div className="flex min-h-0 flex-col flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 px-7 py-5 border-b border-white/[0.07] shrink-0">
        <LanternIcon />
        <div>
          <h1 className="text-xl font-extrabold text-zinc-50 tracking-tight leading-none mb-0.5">
            LanternAI
          </h1>
          <p className="text-[11px] text-[#6B7280]">Your intelligent operations assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 min-h-0 [scrollbar-width:none]">
        {messages.length === 0 && (
          <div className="text-center pt-[15vh]">
            <div className="flex justify-center mb-4">
              <LanternIcon />
            </div>
            <p className="text-base font-bold text-zinc-50 mb-2">How can I help you today?</p>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Ask me about your tasks, projects, blockers, or anything about your business operations.
            </p>
            <div className="flex gap-2 justify-center mt-5 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-[11px] text-[#9CA3AF] bg-[#111318] border border-white/10 rounded-md px-3 py-1.5 cursor-pointer transition-colors hover:border-red-500/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.filter(isTextUIPart).map((p) => p.text).join("")
          const isStreamingThis =
            isActive && m.role === "assistant" && m.id === messages[messages.length - 1]?.id

          return (
            <div
              key={m.id}
              className={cn(
                "flex mb-3",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] px-3.5 py-2.5 text-[13px] text-zinc-50 leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-red-600 rounded-xl rounded-br-sm"
                    : "bg-[#111318] border border-white/[0.07] rounded-xl rounded-bl-sm"
                )}
              >
                {text}
                {isStreamingThis && (
                  <span className="inline-block w-[3px] h-3.5 ml-0.5 bg-zinc-500 align-middle animate-pulse" />
                )}
              </div>
            </div>
          )
        })}

        {isActive && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start mb-3">
            <div className="px-3.5 py-2.5 bg-[#111318] border border-white/[0.07] rounded-xl rounded-bl-sm text-xs text-[#6B7280]">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 px-3.5 py-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 mb-3">
            <div className="flex-1">
              <p className="font-semibold mb-1">Error sending message</p>
              <p className="text-red-300/80 text-[11px]">The request failed. This might be due to a network issue, API error, or an unsupported command. Try rephrasing or clearing the message.</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-7 pb-5 pt-3 border-t border-white/[0.07] shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-center bg-[#111318] border border-white/10 rounded-lg px-3.5 py-2"
        >
          <MentionTextarea
            placeholder="Ask LanternAI anything… (@name to mention)"
            value={input}
            onChange={setInput}
            users={teamMembers}
            onSubmit={() => { const text = input.trim(); if (!text || isActive) return; setInput(""); sendMessage({ text }) }}
            disabled={isActive}
            className="flex-1 text-zinc-50 text-[13px] placeholder-zinc-600 disabled:opacity-50 min-h-[20px] max-h-[120px]"
            autoResize
            maxHeight={120}
          />
          <button
            type="submit"
            title="Send message"
            disabled={isActive || !input.trim()}
            className={cn(
              "w-[30px] h-[30px] inline-flex items-center justify-center rounded-[5px] border-none shrink-0 transition-colors",
              isActive || !input.trim()
                ? "bg-white/[0.06] cursor-not-allowed text-[#6B7280]"
                : "bg-red-600 cursor-pointer text-white hover:bg-red-500"
            )}
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
