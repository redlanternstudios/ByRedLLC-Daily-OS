import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

type TeamMember = {
  id: string
  name: string
  email: string
  role: string | null
  avatar_url: string | null
  monday_user_id: string | null
  task_count: number
}

async function getTeamWithTaskCounts(tenantIds: string[]): Promise<TeamMember[]> {
  if (tenantIds.length === 0) return []
  const supabase = await createClient()

  // Scope to users who belong to these tenants
  const { data: memberRows } = await supabase
    .from('byred_user_tenants')
    .select('user_id')
    .in('tenant_id', tenantIds)
  const memberIds = [...new Set((memberRows ?? []).map((r) => r.user_id))]
  if (memberIds.length === 0) return []

  const [usersRes, taskCountsRes] = await Promise.all([
    supabase
      .from('byred_users')
      .select('id,name,email,role,avatar_url,monday_user_id')
      .in('id', memberIds)
      .eq('active', true),
    supabase
      .from('byred_tasks')
      .select('owner_user_id')
      .in('tenant_id', tenantIds)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .is('archived_at', null),
  ])

  const users = usersRes.data ?? []
  const taskRows = taskCountsRes.data ?? []

  const countMap: Record<string, number> = {}
  for (const t of taskRows) {
    if (t.owner_user_id) {
      countMap[t.owner_user_id] = (countMap[t.owner_user_id] ?? 0) + 1
    }
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar_url: u.avatar_url ?? null,
    monday_user_id: u.monday_user_id ?? null,
    task_count: countMap[u.id] ?? 0,
  }))
}

const ROLE_COLOR: Record<string, string> = {
  admin: '#D7261E',
  member: '#38BDF8',
  owner: '#F59E0B',
  viewer: '#71717A',
}

function Avatar({ name, avatar_url }: { name: string; avatar_url: string | null }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  if (avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar_url}
        alt={name}
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#D7261E',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export default async function OsTeamPage() {
  const { tenantIds } = await requireTenantScope()
  const members = await getTeamWithTaskCounts(tenantIds)

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
          Team
        </h1>
        <p style={{ fontSize: 11, color: '#52525B' }}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              background: '#18181B',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Avatar name={m.name} avatar_url={m.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FAFAFA', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </p>
              <p style={{ fontSize: 10, color: '#52525B', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.email}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {m.role && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: ROLE_COLOR[m.role] ?? '#71717A',
                      background: `${ROLE_COLOR[m.role] ?? '#71717A'}18`,
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {m.role}
                  </span>
                )}
                <span style={{ fontSize: 10, color: '#71717A' }}>
                  {m.task_count} active task{m.task_count !== 1 ? 's' : ''}
                </span>
              </div>
              {m.monday_user_id && (
                <p style={{ fontSize: 9, color: '#3F3F46', marginTop: 4 }}>
                  Monday ID: {m.monday_user_id}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
