import { Users, CheckSquare, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"

const ROLE_MAP: Record<string, string> = {
  admin: "Administrator",
  member: "Member",
  viewer: "Viewer",
}

export default async function OSTeamPage() {
  await requireAuth()
  const supabase = await createClient()

  // Get all active users with their task counts
  const { data: users } = await supabase
    .from("byred_users")
    .select(`
      id,
      name,
      email,
      role,
      avatar_url,
      active
    `)
    .eq("active", true)
    .order("name")

  // Get task counts per user (non-done, non-cancelled)
  const { data: taskCounts } = await supabase
    .from("byred_tasks")
    .select("owner_user_id")
    .not("status", "in", "(done,cancelled)")
    .not("owner_user_id", "is", null)

  // Get tenant counts per user
  const { data: tenantMemberships } = await supabase
    .from("byred_user_tenants")
    .select("user_id, tenant_id")

  const taskCountMap: Record<string, number> = {}
  for (const t of taskCounts ?? []) {
    if (t.owner_user_id) {
      taskCountMap[t.owner_user_id] = (taskCountMap[t.owner_user_id] ?? 0) + 1
    }
  }

  const tenantCountMap: Record<string, number> = {}
  for (const m of tenantMemberships ?? []) {
    tenantCountMap[m.user_id] = (tenantCountMap[m.user_id] ?? 0) + 1
  }

  const members = (users ?? []).map((u) => ({
    ...u,
    task_count: taskCountMap[u.id] ?? 0,
    tenant_count: tenantCountMap[u.id] ?? 0,
  }))

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Team</h1>
        <p className="text-sm text-zinc-500 mt-1">{members.length} active members</p>
      </div>

      {members.length === 0 ? (
        <OSEmpty
          icon={Users}
          title="No team members found"
          description="Add team members in Settings to see them here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <OSAvatar name={member.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded capitalize">
                    {ROLE_MAP[member.role] ?? member.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                  <span>{member.task_count} active tasks</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Building2 className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                  <span>{member.tenant_count} tenants</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
