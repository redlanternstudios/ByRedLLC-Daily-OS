import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { CommsClient } from './CommsClient'

export type Channel = {
  id: string
  name: string
  description: string | null
  is_dm: boolean
  tenant_id: string
  created_at: string
}

export type Member = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string | null
}

export default async function CommsPage() {
  const { tenantIds } = await requireTenantScope()
  const supabase = await createClient()

  const [channelsRes, membersRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('os_channels')
      .select('id, name, description, is_dm, tenant_id, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at'),
    supabase
      .from('byred_user_tenants')
      .select('user_id')
      .in('tenant_id', tenantIds),
  ])

  const channels: Channel[] = channelsRes.data ?? []

  const memberIds = [...new Set(
    ((membersRes.data ?? []) as { user_id: string }[]).map(r => r.user_id)
  )]

  let members: Member[] = []
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from('byred_users')
      .select('id, name, email, avatar_url, role')
      .in('id', memberIds)
      .eq('active', true)
    members = (data ?? []) as Member[]
  }

  return <CommsClient initialChannels={channels} initialMembers={members} />
}
