'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Plus, Send, CornerUpLeft, X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRequiredUser } from '@/lib/context/user-context'
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
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
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

export function CommsClient({
  initialChannels,
  initialMembers,
}: {
  initialChannels: Channel[]
  initialMembers: Member[]
}) {
  const { activeTenantId, authUser, directory } = useRequiredUser()

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
    if (!text || !activeChannelId || !activeTenantId || sending) return
    setSending(true)
    setInput('')
    const reply = replyTo
    setReplyTo(null)
    await fetch('/api/os/comms/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: activeChannelId,
        tenant_id: activeTenantId,
        body: text,
        reply_to_id: reply?.id ?? null,
      }),
    })
    setSending(false)
  }

  async function handleCreateChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!name || !activeTenantId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('os_channels')
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
    return directory.find(u => u.id === userId)?.name ?? 'Unknown'
  }

  function mentionMember(name: string) {
    const prefix = input && !input.endsWith(' ') ? ' ' : ''
    setInput(prev => prev + prefix + `@${name} `)
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* Left: Channels */}
      <div style={{
        width: 220, minWidth: 220,
        background: '#1A1D24',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6B7280', textTransform: 'uppercase' }}>
            Channels
          </span>
          <button
            type="button"
            onClick={() => setShowNewChannel(v => !v)}
            title="New channel"
            style={{
              width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
              cursor: 'pointer', color: '#6B7280',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#D7261E'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,38,30,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            <Plus size={11} strokeWidth={2} />
          </button>
        </div>

        {showNewChannel && (
          <div style={{ padding: '0 12px 8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#111318', border: '1px solid rgba(215,38,30,0.4)', borderRadius: 5, padding: '4px 8px',
            }}>
              <Hash size={10} strokeWidth={2} style={{ color: '#6B7280', flexShrink: 0 }} />
              <input
                autoFocus type="text" placeholder="channel-name"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleCreateChannel()
                  if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName('') }
                }}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FAFAFA', fontSize: 11, fontFamily: 'inherit', minWidth: 0 }}
              />
            </div>
            <p style={{ fontSize: 9, color: '#6B7280', marginTop: 3, paddingLeft: 2 }}>Enter to create · Esc to cancel</p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {tenantChannels.filter(c => !c.is_dm).map(ch => {
            const active = ch.id === activeChannelId
            return (
              <button
                key={ch.id} type="button"
                onClick={() => setActiveChannelId(ch.id)}
                style={{
                  width: '100%', height: 30, display: 'flex', alignItems: 'center', gap: 6,
                  padding: active ? '0 16px 0 14px' : '0 16px',
                  background: active ? 'rgba(215,38,30,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #D7261E' : '2px solid transparent',
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  cursor: 'pointer', color: active ? '#FAFAFA' : '#9CA3AF',
                  fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                <Hash size={11} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                {ch.name}
              </button>
            )
          })}
          {tenantChannels.length === 0 && (
            <p style={{ fontSize: 11, color: '#6B7280', padding: '8px 16px' }}>No channels yet</p>
          )}
        </div>
      </div>

      {/* Center: Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#111318' }}>
        <div style={{ height: 52, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {activeChannel ? (
            <>
              <Hash size={14} strokeWidth={1.75} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>{activeChannel.name}</span>
              {activeChannel.description && (
                <>
                  <span style={{ color: '#6B7280', fontSize: 12 }}>·</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{activeChannel.description}</span>
                </>
              )}
            </>
          ) : (
            <span style={{ fontSize: 13, color: '#6B7280' }}>Select a channel</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'none', minHeight: 0 }}>
          {loadingMessages && (
            <div style={{ textAlign: 'center', paddingTop: 48, fontSize: 12, color: '#6B7280' }}>Loading…</div>
          )}
          {!loadingMessages && messages.length === 0 && activeChannel && (
            <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(215,38,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Hash size={20} strokeWidth={1.5} style={{ color: '#D7261E' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA', marginBottom: 4 }}>Welcome to #{activeChannel.name}</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{activeChannel.description ?? 'This is the very beginning of this channel.'}</p>
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
                style={{ display: 'flex', gap: 10, marginBottom: grouped ? 1 : 12, alignItems: 'flex-start' }}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                <div style={{ width: 28, flexShrink: 0, paddingTop: grouped ? 0 : 2 }}>
                  {!grouped && <AvatarCircle name={name} size={28} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!grouped && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA' }}>{name}</span>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{fmt(msg.created_at)}</span>
                    </div>
                  )}
                  {quotedMsg && (
                    <div style={{ borderLeft: '2px solid rgba(215,38,30,0.4)', paddingLeft: 8, marginBottom: 4, display: 'flex', gap: 4, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', flexShrink: 0 }}>{memberName(quotedMsg.user_id)}</span>
                      <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quotedMsg.body}</span>
                    </div>
                  )}
                  <p style={{ fontSize: 13, color: '#FAFAFA', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {renderMentions(msg.body, 'font-semibold text-[#D7261E]')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                  title="Reply"
                  style={{
                    opacity: isHovered ? 1 : 0, width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#1A1D24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                    cursor: 'pointer', color: '#9CA3AF', flexShrink: 0,
                    transition: 'opacity 120ms', marginTop: 2,
                  }}
                >
                  <CornerUpLeft size={11} strokeWidth={2} />
                </button>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div style={{ padding: '8px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: '#1A1D24', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', borderRadius: '6px 6px 0 0', fontSize: 11, color: '#9CA3AF' }}>
              <CornerUpLeft size={11} strokeWidth={2} style={{ flexShrink: 0, color: '#6B7280' }} />
              <span>Replying to <strong style={{ color: '#A1A1AA' }}>{memberName(replyTo.user_id)}</strong></span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7280', fontSize: 11 }}>{replyTo.body}</span>
              <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, display: 'flex', alignItems: 'center' }}>
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#1A1D24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: replyTo ? '0 0 8px 8px' : 8, padding: '8px 10px 8px 14px' }}>
            <MentionTextarea
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              users={[...members, ...directory.filter(d => !members.some(m => m.id === d.id))]}
              autoResize
              maxHeight={120}
              rows={1}
              placeholder={activeChannel ? `Message #${activeChannel.name} — @ to mention` : 'Select a channel'}
              disabled={!activeChannelId || sending}
              style={{ flex: 1, color: '#FAFAFA', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5, overflow: 'hidden' }}
            />
            <button
              type="button" onClick={() => void handleSend()}
              disabled={!input.trim() || !activeChannelId || sending}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && activeChannelId && !sending ? '#D7261E' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 5, cursor: input.trim() && activeChannelId && !sending ? 'pointer' : 'not-allowed', color: '#fff', flexShrink: 0, transition: 'background 150ms' }}
            >
              <Send size={13} strokeWidth={2} />
            </button>
          </div>
          <p style={{ fontSize: 10, color: '#6B7280', marginTop: 4, paddingLeft: 2 }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Right: Members */}
      <div style={{ width: 180, minWidth: 180, background: '#1A1D24', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={11} strokeWidth={1.75} style={{ color: '#6B7280' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6B7280', textTransform: 'uppercase' }}>Members</span>
          <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 'auto' }}>{members.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          {members.map(m => {
            const isMe = m.id === authUser.id
            return (
              <button
                key={m.id}
                type="button"
                title={isMe ? undefined : `@mention ${m.name}`}
                disabled={isMe}
                onClick={() => !isMe && mentionMember(m.name)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 14px', background: 'transparent',
                  border: 'none', cursor: isMe ? 'default' : 'pointer', textAlign: 'left',
                  borderRadius: 4,
                }}
                onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = 'rgba(215,38,30,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <AvatarCircle name={m.name} size={24} />
                <p style={{ fontSize: 11, fontWeight: 600, color: isMe ? '#FAFAFA' : '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {m.name}{isMe ? ' (you)' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
