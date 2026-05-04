import { createClient } from "@/lib/supabase/server"
import type { Lead } from "@/types/db"

type LeadRow = {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  stage: string
  assigned_user_id: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  revenue_potential: number | null
  created_by_user_id: string | null
  notes: string | null
  updated_at: string | null
  created_at: string | null
}

function mapLeadFromDb(row: LeadRow): Lead {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    stage: row.stage as Lead["stage"],
    assigned_user_id: row.assigned_user_id,
    last_contacted_at: row.last_contacted_at,
    next_follow_up_at: row.next_follow_up_at,
    revenue_potential: row.revenue_potential,
    created_by_user_id: row.created_by_user_id,
    notes: row.notes,
    updated_at: row.updated_at,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_leads")
    .select("*")
    .order("created_at", { ascending: false }) as { data: LeadRow[] | null; error: { message: string } | null }

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return (data ?? []).map(mapLeadFromDb)
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_leads")
    .select("*")
    .eq("id", id)
    .single() as { data: LeadRow | null; error: { message: string } | null }

  if (error || !data) {
    console.error("Error fetching lead:", error)
    return null
  }

  return mapLeadFromDb(data)
}

export async function getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("byred_leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false }) as { data: LeadRow[] | null; error: { message: string } | null }

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return (data ?? []).map(mapLeadFromDb)
}
