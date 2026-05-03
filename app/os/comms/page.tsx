'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Plus, Send, CornerUpLeft, X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'

type Channel = {
  id: string
  name: string
  description: string | null
  is_dm: boolean
  created_at: string
}

type Message = {
  id: string
  channel_id: string
  user_id: string
  body: string
  reply_to_id: string | null
  created_at: string
}

type Member = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string | null
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  if (isYesterday) return `Yesterday ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` · ${time}`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function AvatarCircle({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: '#D7261E',
      color: '#fff',
      fontSize: Math.round(size * 0.36),
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

export default function CommsPage() {
  const { activeTenantId, authUser, directory } = useUser()
  const supabase = createClient()

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load channels + members whenever the active tenant changes
  useEffect(() => {
    if (!activeTenantId) return
    let cancelled = false

    async function load() {
      const [channelsRes, membersRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from as any)('os_channels')
          .select('id, name, description, is_dm, created_at')
          .eq('tenant_id', activeTenantId)
          .order('created_at'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from as any)('byred_user_tenants')
          .select('user_id')
          .eq('tenant_id', activeTenantId),
      ])
      if (cancelled) return

      const ch: Channel[] = channelsRes.data ?? []
      setChannels(ch)
      setActiveChannelId(prev => prev ?? (ch[0]?.id ?? null))

      const memberIds = (membersRes.data ?? []).map((r: { user_id: string }) => r.user_id)
      if (memberIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: users } = await (supabase.from as any)('byred_users')
          .select('id, name, email, avatar_url, role')
          .in('id', memberIds)
          .eq('active', true)
        if (!cancelled) setMembers(users ?? [])
      }
    }

    void load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenantId])

  // Fetch messages + set up realtime subscription for active channel
  useEffect(() => {
    if (!activeChannelId) return

    setLoadingMessages(true)
    setMessages([])
    let cancelled = false

    async function fetchMessages() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)('os_messages')
        .select('id, channel_id, user_id, body, reply_to_id, created_at')
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true })
        .limit(100)
      if (!cancelled) {
        setMessages(data ?? [])
        setLoadingMessages(false)
      }
    }

    void fetchMessages()

    const sub = supabase
      .channel(`comms:${activeChannelId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'os_messages', filter: `channel_id=eq.${activeChannelId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(sub)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null

  async function handleSend() {
    const text = input.trim()
    if (!text || !activeChannelId || !activeTenantId || sending) return
    setSending(true)
    setInput('')
    const reply = replyTo
    setReplyTo(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('os_messages').insert({
      channel_id: activeChannelId,
      tenant_id: activeTenantId,
      user_id: authUser.id,
      body: text,
      reply_to_id: reply?.id ?? null,
    })
    setSending(false)
  }

  async function handleCreateChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!name || !activeTenantId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from as any)('os_channels')
      .insert({ tenant_id: activeTenantId, name, created_by: authUser.id })
      .select()
      .single()
    if (data) {
      setChannels(prev => [...prev, data as Channel])
      setActiveChannelId(data.id)
    }
    setNewChannelName('')
    setShowNewChannel(false)
  }

  function memberName(userId: string): string {
    const m = members.find(m => m.id === userId)
    if (m) return m.name
    const d = directory.find(u => u.id === userId)
    return d?.name ?? 'Unknown'
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* ── Left: Channels ────────────────────────────────────────── */}
      <div style={{
        width: 220,
        minWidth: 220,
        background: '#18181B',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#52525B', textTransform: 'uppercase' }}>
            Channels
          </span>
          <button
            type="button"
            onClick={() => setShowNewChannel(v => !v)}
            title="New channel"
            style={{
              width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              cursor: 'pointer',
              color: '#52525B',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = '#D7261E'
              el.style.borderColor = 'rgba(215,38,30,0.4)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = '#52525B'
              el.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <Plus size={11} strokeWidth={2} />
          </button>
        </div>

        {/* Inline new-channel form */}
        {showNewChannel && (
          <div style={{ padding: '0 12px 8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#111112',
              border: '1px solid rgba(215,38,30,0.4)',
              borderRadius: 5,
              padding: '4px 8px',
            }}>
              <Hash size={10} strokeWidth={2} style={{ color: '#52525B', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="channel-name"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleCreateChannel()
                  if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName('') }
                }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#FAFAFA', fontSize: 11, fontFamily: 'inherit', minWidth: 0,
                }}
              />
            </div>
            <p style={{ fontSize: 9, color: '#3F3F46', marginTop: 3, paddingLeft: 2 }}>
              Enter to create · Esc to cancel
            </p>
          </div>
        )}

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {channels.filter(c => !c.is_dm).map(ch => {
            const active = ch.id === activeChannelId
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannelId(ch.id)}
                style={{
                  width: '100%', height: 30,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: active ? '0 16px 0 14px' : '0 16px',
                  background: active ? 'rgba(215,38,30,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #D7261E' : '2px solid transparent',
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  cursor: 'pointer',
                  color: active ? '#FAFAFA' : '#71717A',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#A1A1AA'
                    el.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#71717A'
                    el.style.background = 'transparent'
                  }
                }}
              >
                <Hash size={11} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                {ch.name}
              </button>
            )
          })}
          {channels.length === 0 && !showNewChannel && (
            <p style={{ fontSize: 11, color: '#3F3F46', padding: '8px 16px' }}>No channels yet</p>
          )}
        </div>
      </div>

      {/* ── Center: Messages ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0F0F10' }}>

        {/* Channel header */}
        <div style={{
          height: 52, padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {activeChannel ? (
            <>
              <Hash size={14} strokeWidth={1.75} style={{ color: '#52525B' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>{activeChannel.name}</span>
              {activeChannel.description && (
                <>
                  <span style={{ color: '#3F3F46', fontSize: 12 }}>·</span>
                  <span style={{ fontSize: 11, color: '#52525B' }}>{activeChannel.description}</span>
                </>
              )}
            </>
          ) : (
            <span style={{ fontSize: 13, color: '#3F3F46' }}>Select a channel</span>
          )}
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'none', minHeight: 0 }}>

          {loadingMessages && (
            <div style={{ textAlign: 'center', paddingTop: 48, fontSize: 12, color: '#3F3F46' }}>
              Loading…
            </div>
          )}

          {!loadingMessages && messages.length === 0 && activeChannel && (
            <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(215,38,30,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Hash size={20} strokeWidth={1.5} style={{ color: '#D7261E' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA', marginBottom: 4 }}>
                Welcome to #{activeChannel.name}
              </p>
              <p style={{ fontSize: 12, color: '#52525B' }}>
                {activeChannel.description ?? 'This is the very beginning of this channel.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev = messages[i - 1]
            const grouped =
              !!prev &&
              prev.user_id === msg.user_id &&
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
            const name = memberName(msg.user_id)
            const quotedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null
            const isHovered = hoveredMsgId === msg.id

            return (
              <div
                key={msg.id}
                style={{ display: 'flex', gap: 10, marginBottom: grouped ? 1 : 12, alignItems: 'flex-start' }}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {/* Avatar or spacer */}
                <div style={{ width: 28, flexShrink: 0, paddingTop: grouped ? 0 : 2 }}>
                  {!grouped && <AvatarCircle name={name} size={28} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {!grouped && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA' }}>{name}</span>
                      <span style={{ fontSize: 10, color: '#3F3F46' }}>{fmt(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Quoted reply */}
                  {quotedMsg && (
                    <div style={{
                      borderLeft: '2px solid rgba(215,38,30,0.4)',
                      paddingLeft: 8,
                      marginBottom: 4,
                      display: 'flex',
                      gap: 4,
                      alignItems: 'baseline',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#71717A', flexShrink: 0 }}>
                        {memberName(quotedMsg.user_id)}
                      </span>
                      <span style={{
                        fontSize: 11, color: '#52525B',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {quotedMsg.body}
                      </span>
                    </div>
                  )}

                  {/* Message body */}
                  <p style={{
                    fontSize: 13,
                    color: '#E4E4E7',
                    lineHeight: 1.55,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}>
                    {msg.body}
                  </p>
                </div>

                {/* Reply button — visible on hover */}
                <button
                  type="button"
                  onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                  title="Reply"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#18181B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: '#71717A',
                    flexShrink: 0,
                    transition: 'opacity 120ms',
                    marginTop: 2,
                  }}
                >
                  <CornerUpLeft size={11} strokeWidth={2} />
                </button>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Compose area */}
        <div style={{ padding: '8px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

          {/* Reply preview banner */}
          {replyTo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px',
              background: '#18181B',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              fontSize: 11, color: '#71717A',
            }}>
              <CornerUpLeft size={11} strokeWidth={2} style={{ flexShrink: 0, color: '#52525B' }} />
              <span>
                Replying to{' '}
                <strong style={{ color: '#A1A1AA' }}>{memberName(replyTo.user_id)}</strong>
              </span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: '#3F3F46', fontSize: 11,
              }}>
                {replyTo.body}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#52525B', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: replyTo ? '0 0 8px 8px' : 8,
            padding: '8px 10px 8px 14px',
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel to start messaging'}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                const el = e.target
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              disabled={!activeChannelId || sending}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FAFAFA',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: 120,
                overflow: 'hidden',
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || !activeChannelId || sending}
              style={{
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && activeChannelId && !sending ? '#D7261E' : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 5,
                cursor: input.trim() && activeChannelId && !sending ? 'pointer' : 'not-allowed',
                color: '#fff',
                flexShrink: 0,
                transition: 'background 150ms',
              }}
            >
              <Send size={13} strokeWidth={2} />
            </button>
          </div>
          <p style={{ fontSize: 10, color: '#3F3F46', marginTop: 4, paddingLeft: 2 }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Right: Members ───────────────────────────────────────── */}
      <div style={{
        width: 180,
        minWidth: 180,
        background: '#18181B',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={11} strokeWidth={1.75} style={{ color: '#52525B' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#52525B', textTransform: 'uppercase' }}>
            Members
          </span>
          <span style={{ fontSize: 10, color: '#3F3F46', marginLeft: 'auto' }}>{members.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          {members.map(m => (
            <div
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px' }}
            >
              <AvatarCircle name={m.name} size={24} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: m.id === authUser.id ? '#FAFAFA' : '#A1A1AA',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                }}>
                  {m.name}{m.id === authUser.id ? ' (you)' : ''}
                </p>
                {m.role && (
                  <p style={{ fontSize: 9, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                    {m.role}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
