"use server"

import { cookies } from "next/headers"
import { ACTIVE_TENANT_COOKIE } from "@/lib/data/tenant-scope"

/**
 * Server action: persist the selected tenant in a cookie so
 * requireTenantScope() picks it up on all subsequent server requests.
 */
export async function setActiveTenantAction(tenantId: string) {
  const jar = await cookies()
  jar.set(ACTIVE_TENANT_COOKIE, tenantId, {
    path: "/",
    httpOnly: false,   // readable client-side for optimistic UI
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}
