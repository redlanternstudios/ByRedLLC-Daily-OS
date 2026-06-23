"use client"

import React, {
  useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle,
  type KeyboardEvent, type ChangeEvent, type TextareaHTMLAttributes,
} from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export type MentionUser = {
  id: string
  name: string
  avatar_url?: string | null
}

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value" | "onKeyDown"> & {
  value: string
  onChange: (value: string) => void
  users: MentionUser[]
  onSubmit?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  autoResize?: boolean
  maxHeight?: number
  className?: string
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function MentionTextarea(
    { value, onChange, users, onSubmit, onKeyDown: externalOnKeyDown, autoResize, maxHeight = 120, className, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(forwardedRef, () => innerRef.current!)

    const [query, setQuery] = useState<string | null>(null)
    const [atIndex, setAtIndex] = useState(-1)
    const [focused, setFocused] = useState(0)
    // Portal dropdown position
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)

    const filtered = query === null
      ? []
      : users.filter((u) => u.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 6)
    const isOpen = query !== null && filtered.length > 0

    // Auto-resize
    useEffect(() => {
      if (autoResize && innerRef.current) {
        const el = innerRef.current
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, maxHeight) + "px"
      }
    }, [value, autoResize, maxHeight])

    // Position the portal dropdown above the textarea
    useEffect(() => {
      if (!isOpen || !innerRef.current) { setDropPos(null); return }
      const rect = innerRef.current.getBoundingClientRect()
      setDropPos({
        top: rect.top + window.scrollY - 4,  // 4px gap above
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 224),     // min 224px (w-56)
      })
    }, [isOpen, value])

    const pick = useCallback((user: MentionUser) => {
      if (!innerRef.current) return
      const before = value.slice(0, atIndex)
      const after  = value.slice(innerRef.current.selectionStart)
      const inserted = `@${user.name} `
      const next = before + inserted + after
      onChange(next)
      setQuery(null)
      setAtIndex(-1)
      setTimeout(() => {
        if (!innerRef.current) return
        const pos = (before + inserted).length
        innerRef.current.setSelectionRange(pos, pos)
        innerRef.current.focus()
      }, 0)
    }, [value, atIndex, onChange])

    function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
      const v = e.target.value
      onChange(v)
      const pos = e.target.selectionStart ?? v.length
      const textBefore = v.slice(0, pos)
      const match = /@(\w*)$/.exec(textBefore)
      if (match) {
        setAtIndex(pos - match[0].length)
        setQuery(match[1])
        setFocused(0)
      } else {
        setQuery(null)
        setAtIndex(-1)
      }
    }

    function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (isOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, filtered.length - 1)); return }
        if (e.key === "ArrowUp")   { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); return }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(filtered[focused]); return }
        if (e.key === "Escape")    { e.preventDefault(); setQuery(null); return }
      }
      if (!isOpen && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onSubmit?.()
        return
      }
      externalOnKeyDown?.(e)
    }

    useEffect(() => { setFocused(0) }, [query])

    const dropdown = isOpen && dropPos ? createPortal(
      <div
        className="absolute z-[9999] -translate-y-full"
        style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
      >
        <div className="rounded-lg border border-[#2A2D35] bg-[#111318] shadow-2xl overflow-hidden">
          <div className="px-2 pt-1.5 pb-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#6B7280]">Mention</span>
          </div>
          {filtered.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(u) }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                i === focused ? "bg-[#1A1D24]/60 text-white" : "text-[#9CA3AF] hover:bg-[#1A1D24]",
              )}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-[#D7261E]/[0.13] text-[#D7261E]">
                {u.name.charAt(0).toUpperCase()}
              </span>
              {u.name}
            </button>
          ))}
        </div>
      </div>,
      document.body
    ) : null

    return (
      <div className="relative w-full">
        <textarea
          {...rest}
          ref={innerRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          className={cn("w-full resize-none bg-transparent outline-none", className)}
        />
        {dropdown}
      </div>
    )
  }
)

export function renderMentions(text: string, className = "text-[#D7261E] font-semibold"): React.ReactNode {
  const parts = text.split(/(@[\w][\w ]*)/g)
  return parts.map((part, i) =>
    /^@[\w]/.test(part)
      ? <span key={i} className={className}>{part}</span>
      : part
  )
}
