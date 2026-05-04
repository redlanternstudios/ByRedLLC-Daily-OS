import { createClient } from "@/lib/supabase/server"
import type { Tenant } from "@/types/db"

type TenantRow = {
  id: string
  name: string
  type: string
  color: string
  active: boolean | null
  created_at: string | null
  updated_at: string | null
}

function mapTenantFromDb(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Tenant["type"],
    color: row.color,
    active: row.active ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

export async function getTenants(): Promise<Tenant[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true }) as { data: TenantRow[] | null; error: { message: string } | null }

  if (error) {
    console.error("Error fetching tenants:", error)
    return []
  }

  return (data ?? []).map(mapTenantFromDb)
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_tenants")
    .select("*")
    .eq("id", id)
    .single() as { data: TenantRow | null; error: { message: string } | null }

  if (error || !data) {
    console.error("Error fetching tenant:", error)
    return null
  }

  return mapTenantFromDb(data)
}

export type TenantWithStats = Tenant & {
  activeTasks: number
  overdueTasks: number
  openLeads: number
  lastActivityAt: string | null
}

export async function getTenantsWithStats(): Promise<TenantWithStats[]> {
  const supabase = await createClient()

  // Fetch all tenants
  const { data: tenants, error: tenantsError } = await (supabase as any)
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true }) as { data: TenantRow[] | null; error: { message: string } | null }

  if (tenantsError || !tenants) {
    console.error("Error fetching tenants:", tenantsError)
    return []
  }

  // Fetch tasks and leads counts for all tenants
  const sa = supabase as any
  const [
    { data: tasks },
    { data: leads },
    { data: activities },
  ] = await Promise.all([
    sa.from("byred_tasks").select("id, tenant_id, status") as Promise<{ data: Array<{ id: string; tenant_id: string; status: string }> | null }>,
    sa.from("byred_leads").select("id, tenant_id, stage") as Promise<{ data: Array<{ id: string; tenant_id: string; stage: string }> | null }>,
    sa.from("byred_activities").select("tenant_id, created_at").order("created_at", { ascending: false }) as Promise<{ data: Array<{ tenant_id: string; created_at: string | null }> | null }>,
  ])

  return tenants.map((tenant: TenantRow) => {
    const tenantTasks = (tasks ?? []).filter((t) => t.tenant_id === tenant.id)
    const tenantLeads = (leads ?? []).filter((l) => l.tenant_id === tenant.id)
    const tenantActivities = (activities ?? []).filter((a) => a.tenant_id === tenant.id)

    return {
      id: tenant.id,
      name: tenant.name,
      type: tenant.type as Tenant["type"],
      color: tenant.color,
      active: tenant.active ?? true,
      created_at: tenant.created_at ?? new Date().toISOString(),
      updated_at: tenant.updated_at ?? new Date().toISOString(),
      activeTasks: tenantTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      overdueTasks: tenantTasks.filter((t) => t.status === "overdue").length,
      openLeads: tenantLeads.filter((l) => !["WON", "LOST"].includes(l.stage)).length,
      lastActivityAt: tenantActivities[0]?.created_at ?? null,
    }
  })
}
