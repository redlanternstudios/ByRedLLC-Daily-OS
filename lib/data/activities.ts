import { createClient } from "@/lib/supabase/server"
import type { Activity } from "@/types/db"

export type ActivityRow = {
  id: string
  tenant_id: string
  object_type: string
  object_id: string
  user_id: string | null
  type: string
  summary: string
  metadata: import("@/types/database").Json | null
  created_at: string
}

function mapActivityFromDb(row: ActivityRow): Activity {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    object_type: row.object_type,
    object_id: row.object_id,
    user_id: row.user_id,
    type: row.type,
    summary: row.summary,
    metadata: row.metadata,
    created_at: row.created_at,
  }
}

export async function getActivities(): Promise<Activity[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}

export async function getActivitiesForObject(
  objectType: "task" | "lead",
  objectId: string
): Promise<Activity[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_activities")
    .select("*")
    .eq("object_type", objectType)
    .eq("object_id", objectId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}

export async function getActivitiesByTenant(tenantId: string): Promise<Activity[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_activities")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}
