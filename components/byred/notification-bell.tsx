"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, AtSign, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/context/user-context"
import Link from "next/link"

type Notif = {
  id: string
  type: string
  body: string
  context_url: string | null
  read: boolean
  created_at: string
}

function fmt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unread = notifications.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Fetch notifications
  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/os/notifications")
      const data = await res.json() as { notifications: Notif[] }
      setNotifications(data.notifications ?? [])
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to realtime new notifications for the current byred user
  useEffect(() => {
    if (!user?.profile?.id) return
    void load()

    const channel = supabase
      .channel(`notifications:${user.profile.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "os_notifications",
        filter: `user_id=eq.${user.profile.id}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notif, ...prev])
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile?.id])

  async function markAllRead() {
    await fetch("/api/os/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await fetch("/api/os/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function handleOpen() {
    setOpen(v => !v)
    if (!open) void load()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          "text-[#9CA3AF] hover:text-white hover:bg-white/5",
          open && "text-white bg-white/5",
        )}
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#D7261E] text-white text-[8px] font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[#2A2D35] bg-[#07080D] shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D35]">
            <span className="text-xs font-semibold text-[#9CA3AF] tracking-wide">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#9CA3AF] transition-colors"
              >
                <Check size={10} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center text-xs text-[#6B7280]">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell className="w-6 h-6 text-[#6B7280] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-[#6B7280]">No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map(n => {
              const content = (
                <div
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-[#2A2D35]/60 transition-colors cursor-pointer",
                    n.read ? "hover:bg-[#111318]/50" : "bg-[#111318] hover:bg-[#111318]",
                  )}
                  onClick={() => { if (!n.read) void markRead(n.id) }}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D7261E]/10 border border-[#D7261E]/20 flex items-center justify-center mt-0.5">
                    <AtSign size={12} strokeWidth={2} className="text-[#D7261E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-relaxed", n.read ? "text-[#9CA3AF]" : "text-[#9CA3AF]")}>
                      {n.body}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{fmt(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D7261E] flex-shrink-0 mt-2" />
                  )}
                </div>
              )

              return n.context_url ? (
                <Link key={n.id} href={n.context_url} onClick={() => { setOpen(false); void markRead(n.id) }}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
