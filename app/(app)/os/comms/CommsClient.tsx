'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Plus, Send, CornerUpLeft, X, Users, ChevronLeft, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { cn } from '@/lib/utils'
import { MentionTextarea, renderMentions } from '@/components/byred/mention-textarea'
import type { Channel, Member } from './page'

type Message = {
  id: string
  channel_id: string
  user_id: string
  body: string
  reply_to_id: string | null
  created_at: string
}

type MobileView = 'channels' | 'chat' | 'members'

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` · ${time}`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function AvatarCircle({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-byred-red text-white flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), fontWeight: 700 }}
    >
      {getInitials(name)}
    </div>
  )
}

export function CommsClient({
  initialChannels,
  initialMembers,
}: {
  initialChannels: Channel[]
  initialMembers: Member[]
}) {
  const user = useUser()
  const activeTenantId = user?.activeTenantId
  const profileId = user?.profile?.id // byred_users.id — use for inserts
  const directory = user?.directory ?? []

  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannels.find(c => c.tenant_id === activeTenantId)?.id ??
    initialChannels[0]?.id ??
    null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [members] = useState<Member[]>(initialMembers)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('chat')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!activeTenantId) return
    const tenantChannels = channels.filter(c => c.tenant_id === activeTenantId)
    if (tenantChannels.length > 0) {
      setActiveChannelId(prev => {
        const stillValid = tenantChannels.some(c => c.id === prev)
        return stillValid ? prev : tenantChannels[0].id
      })
    }
  }, [activeTenantId, channels])

  useEffect(() => {
    if (!activeChannelId) return
    setLoadingMessages(true)
    setMessages([])
    let cancelled = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('os_messages')
      .select('id, channel_id, user_id, body, reply_to_id, created_at')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }: { data: Message[] | null }) => {
        if (!cancelled) {
          setMessages(data ?? [])
          setLoadingMessages(false)
        }
      })

    const sub = supabase
      .channel(`comms:${activeChannelId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'os_messages',
        filter: `channel_id=eq.${activeChannelId}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new as Message]
        })
      })
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(sub)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const tenantChannels = channels.filter(c => c.tenant_id === activeTenantId)
  const activeChannel = tenantChannels.find(c => c.id === activeChannelId) ?? null

  async function handleSend() {
    const text = input.trim()
    if (!text || !activeChannelId || !activeTenantId || !profileId || sending) return
    setSending(true)
    setInput('')
    const reply = replyTo
    setReplyTo(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('os_messages').insert({
      channel_id: activeChannelId,
      tenant_id: activeTenantId,
      user_id: profileId, // byred_users.id, not auth.users.id
      body: text,
      reply_to_id: reply?.id ?? null,
    })
    if (error) {
      console.error('[v0] Failed to send message:', error)
      // Restore input on failure
      setInput(text)
      if (reply) setReplyTo(reply)
    }
    setSending(false)
  }

  async function handleCreateChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!name || !activeTenantId || !profileId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('os_channels')
      .insert({ tenant_id: activeTenantId, name, created_by: profileId })
      .select()
      .single()
    if (error) {
      console.error('[v0] Failed to create channel:', error)
      return
    }
    if (data) {
      setChannels(prev => [...prev, data as Channel])
      setActiveChannelId(data.id)
      setMobileView('chat')
    }
    setNewChannelName('')
    setShowNewChannel(false)
  }

  function memberName(userId: string): string {
    const m = members.find(m => m.id === userId)
    if (m) return m.name
    return directory.find(u => u.id === userId)?.name ?? 'Unknown'
  }

  function selectChannel(id: string) {
    setActiveChannelId(id)
    setMobileView('chat')
  }

  function insertMention(name: string) {
    const mention = `@${name} `
    setInput((prev) => (prev.endsWith(' ') || prev === '' ? prev + mention : prev + ' ' + mention))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Channels Panel
  // ─────────────────────────────────────────────────────────────────────────
  const ChannelsPanel = (
    <div className={cn(
      "flex flex-col overflow-hidden bg-zinc-900 border-r border-white/[0.07]",
      "w-full md:w-[220px] md:min-w-[220px]",
      "absolute inset-0 md:relative md:inset-auto",
      mobileView === 'channels' ? "flex" : "hidden md:flex"
    )}>
      <div className="p-4 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">Channels</span>
        <button
          type="button"
          onClick={() => setShowNewChannel(v => !v)}
          title="New channel"
          className="w-5 h-5 flex items-center justify-center bg-transparent border border-white/10 rounded text-zinc-600 hover:text-byred-red hover:border-byred-red/40 transition-colors"
        >
          <Plus size={11} strokeWidth={2} />
        </button>
      </div>

      {showNewChannel && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-byred-red/40 rounded px-2 py-1">
            <Hash size={10} strokeWidth={2} className="text-zinc-600 shrink-0" />
            <input
              autoFocus type="text" placeholder="channel-name"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleCreateChannel()
                if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName('') }
              }}
              className="flex-1 bg-transparent border-none outline-none text-zinc-50 text-[11px] min-w-0"
            />
          </div>
          <p className="text-[9px] text-zinc-700 mt-1 pl-0.5">Enter to create · Esc to cancel</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {tenantChannels.filter(c => !c.is_dm).map(ch => {
          const active = ch.id === activeChannelId
          return (
            <button
              key={ch.id} type="button"
              onClick={() => selectChannel(ch.id)}
              className={cn(
                "w-full h-8 flex items-center gap-1.5 px-4 text-left text-xs transition-colors",
                "border-l-2",
                active
                  ? "bg-byred-red/[0.08] border-byred-red text-zinc-50 font-semibold pl-[14px]"
                  : "border-transparent text-zinc-500 hover:text-zinc-400 hover:bg-white/[0.04]"
              )}
            >
              <Hash size={11} strokeWidth={1.75} className="shrink-0" />
              {ch.name}
            </button>
          )
        })}
        {tenantChannels.length === 0 && (
          <p className="text-[11px] text-zinc-700 p-4">No channels yet</p>
        )}
      </div>

      {/* Mobile back button */}
      <button
        type="button"
        onClick={() => setMobileView('chat')}
        className="md:hidden flex items-center gap-2 p-4 border-t border-white/[0.07] text-zinc-500 text-xs"
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Back to chat
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Members Panel
  // ─────────────────────────────────────────────────────────────────────────
  const MembersPanel = (
    <div className={cn(
      "flex flex-col overflow-hidden bg-zinc-900 border-l border-white/[0.07]",
      "w-full md:w-[180px] md:min-w-[180px]",
      "absolute inset-0 md:relative md:inset-auto",
      mobileView === 'members' ? "flex" : "hidden md:flex"
    )}>
      <div className="p-4 pb-2 flex items-center gap-1.5">
        <Users size={11} strokeWidth={1.75} className="text-zinc-600" />
        <span className="text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">Members</span>
        <span className="text-[10px] text-zinc-700 ml-auto">{members.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none pb-2">
        {members.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => { if (m.id !== profileId) insertMention(m.name) }}
            className={cn(
              "w-full flex items-center gap-2 px-3.5 py-1.5 text-left transition-colors",
              m.id !== profileId ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"
            )}
            title={m.id !== profileId ? `Mention ${m.name}` : undefined}
          >
            <AvatarCircle name={m.name} size={24} />
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-[11px] font-semibold truncate",
                m.id === profileId ? "text-zinc-50" : "text-zinc-400"
              )}>
                {m.name}{m.id === profileId ? ' (you)' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Mobile back button */}
      <button
        type="button"
        onClick={() => setMobileView('chat')}
        className="md:hidden flex items-center gap-2 p-4 border-t border-white/[0.07] text-zinc-500 text-xs"
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Back to chat
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Chat Panel (Center)
  // ─────────────────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className={cn(
      "flex-1 flex flex-col min-w-0 bg-zinc-950",
      "absolute inset-0 md:relative md:inset-auto",
      mobileView === 'chat' ? "flex" : "hidden md:flex"
    )}>
      {/* Header */}
      <div className="h-[52px] px-4 md:px-5 flex items-center gap-2 border-b border-white/[0.07] shrink-0">
        {/* Mobile: channels toggle */}
        <button
          type="button"
          onClick={() => setMobileView('channels')}
          className="md:hidden w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 -ml-1"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>

        {activeChannel ? (
          <>
            <Hash size={14} strokeWidth={1.75} className="text-zinc-600 hidden md:block" />
            <span className="text-sm font-bold text-zinc-50 truncate">{activeChannel.name}</span>
            {activeChannel.description && (
              <>
                <span className="text-zinc-700 text-xs hidden sm:inline">·</span>
                <span className="text-[11px] text-zinc-600 truncate hidden sm:inline">{activeChannel.description}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-[13px] text-zinc-700">Select a channel</span>
        )}

        {/* Mobile: members toggle */}
        <button
          type="button"
          onClick={() => setMobileView('members')}
          className="md:hidden ml-auto w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
        >
          <Users size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 scrollbar-none min-h-0">
        {loadingMessages && (
          <div className="text-center pt-12 text-xs text-zinc-700">Loading…</div>
        )}
        {!loadingMessages && messages.length === 0 && activeChannel && (
          <div className="text-center pt-[15vh]">
            <div className="w-12 h-12 rounded-full bg-byred-red/10 flex items-center justify-center mx-auto mb-3">
              <Hash size={20} strokeWidth={1.5} className="text-byred-red" />
            </div>
            <p className="text-[15px] font-bold text-zinc-50 mb-1">Welcome to #{activeChannel.name}</p>
            <p className="text-xs text-zinc-600">{activeChannel.description ?? 'This is the very beginning of this channel.'}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const grouped = !!prev && prev.user_id === msg.user_id &&
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
          const name = memberName(msg.user_id)
          const quotedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null
          const isHovered = hoveredMsgId === msg.id

          return (
            <div
              key={msg.id}
              className={cn("flex gap-2.5 items-start", grouped ? "mb-0.5" : "mb-3")}
              onMouseEnter={() => setHoveredMsgId(msg.id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              <div className="w-7 shrink-0 pt-0.5">
                {!grouped && <AvatarCircle name={name} size={28} />}
              </div>
              <div className="flex-1 min-w-0">
                {!grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-bold text-zinc-50">{name}</span>
                    <span className="text-[10px] text-zinc-700">{fmt(msg.created_at)}</span>
                  </div>
                )}
                {quotedMsg && (
                  <div className="border-l-2 border-byred-red/40 pl-2 mb-1 flex gap-1 items-baseline">
                    <span className="text-[11px] font-semibold text-zinc-500 shrink-0">{memberName(quotedMsg.user_id)}</span>
                    <span className="text-[11px] text-zinc-600 truncate">{quotedMsg.body}</span>
                  </div>
                )}
                <p className="text-[13px] text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                  {renderMentions(msg.body)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                title="Reply"
                className={cn(
                  "w-6 h-6 flex items-center justify-center bg-zinc-900 border border-white/10 rounded text-zinc-500 shrink-0 mt-0.5 transition-opacity",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
              >
                <CornerUpLeft size={11} strokeWidth={2} />
              </button>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="px-4 md:px-5 pt-2 pb-4 border-t border-white/[0.07] shrink-0">
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/[0.07] border-b-0 rounded-t-md text-[11px] text-zinc-500">
            <CornerUpLeft size={11} strokeWidth={2} className="shrink-0 text-zinc-600" />
            <span>Replying to <strong className="text-zinc-400">{memberName(replyTo.user_id)}</strong></span>
            <span className="flex-1 truncate text-zinc-700 text-[11px]">{replyTo.body}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-600 hover:text-zinc-400">
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )}
        <div className={cn(
          "flex gap-2 items-end bg-zinc-900 border border-white/10 px-3 py-2",
          replyTo ? "rounded-b-lg" : "rounded-lg"
        )}>
          <MentionTextarea
            ref={inputRef}
            placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel'}
            value={input}
            onChange={setInput}
            onSubmit={() => void handleSend()}
            users={members.map(m => ({ id: m.id, name: m.name }))}
            autoResize
            maxHeight={120}
            disabled={!activeChannelId || sending}
            className="flex-1 border-none outline-none text-zinc-50 text-[13px] leading-relaxed min-h-[20px]"
            style={{ fontSize: 16 }}
          />
          <button
            type="button" onClick={() => void handleSend()}
            disabled={!input.trim() || !activeChannelId || sending}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded text-white shrink-0 transition-colors",
              input.trim() && activeChannelId && !sending
                ? "bg-byred-red cursor-pointer"
                : "bg-white/[0.06] cursor-not-allowed"
            )}
          >
            <Send size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1 pl-0.5 hidden md:block">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-52px)] overflow-hidden relative">
      {ChannelsPanel}
      {ChatPanel}
      {MembersPanel}
    </div>
  )
}
