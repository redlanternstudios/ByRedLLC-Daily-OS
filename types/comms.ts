
// Comms types
export type OsChannel = {
  id: string
  name: string
  slug: string
  description: string | null
  type: "team" | "project" | "direct"
  tenant_id: string | null
  created_by: string | null
  archived: boolean
  created_at: string | null
  updated_at: string | null
}

export type OsMessage = {
  id: string
  channel_id: string
  user_id: string
  body: string
  reply_to_id: string | null
  edited: boolean
  created_at: string
  updated_at: string | null
}

export type OsChannelMember = {
  id: string
  channel_id: string
  user_id: string
  role: "owner" | "member"
  last_read_at: string | null
  created_at: string | null
}
