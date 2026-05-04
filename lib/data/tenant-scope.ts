import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { Tenant } from "@/types/db"

export const ACTIVE_TENANT_COOKIE = "byred_active_tenant"

export type TenantScope = {
  tenantId: string
  tenantIds: string[]
  tenant: Tenant
  tenants: Tenant[]
}

function shapeTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Tenant["type"],
    color: row.color as string,
    active: (row.active as boolean) ?? true,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  }
}

/**
 * Require that the current request has a valid tenant scope.
 * Priority: explicit requestedTenantId > byred_active_tenant cookie > user's first tenant.
 * Redirects to /login if unauthenticated, or /dashboard if no valid tenant found.
 */
export async function requireTenantScope(
  requestedTenantId?: string | null
): Promise<TenantScope> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Resolve byred_users.id for this auth user
  const { data: byredUser } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const profileId = (byredUser as { id: string } | null)?.id ?? null

  // Fetch ALL tenants the user has access to
  let allTenants: Tenant[] = []
  if (profileId) {
    const { data: userTenants } = await supabase
      .from("byred_user_tenants")
      .select("tenant_id, byred_tenants(*)")
      .eq("user_id", profileId)

    allTenants = ((userTenants ?? []) as Array<{ byred_tenants: Record<string, unknown> }>)
      .map(ut => shapeTenant(ut.byred_tenants))
      .filter(t => t.id)
  }

  const tenantIds = allTenants.map(t => t.id)

  if (tenantIds.length === 0) redirect("/dashboard")

  // Determine which tenantId to use as "active": explicit > cookie > first
  const jar = await cookies()
  const cookieTenantId = jar.get(ACTIVE_TENANT_COOKIE)?.value ?? null
  const candidateId = requestedTenantId ?? cookieTenantId ?? null

  // Use candidate if valid, otherwise first tenant
  const activeTenantId = (candidateId && tenantIds.includes(candidateId))
    ? candidateId
    : tenantIds[0]

  const activeTenant = allTenants.find(t => t.id === activeTenantId) ?? allTenants[0]

  return {
    tenantId: activeTenantId,
    tenantIds,
    tenant: activeTenant,
    tenants: allTenants,
  }
}
