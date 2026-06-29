import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const AGENT_FAMILIES = ["web_app", "ios", "ops", "comms", "sales", "universal"] as const
const FRAMEWORK_SCOPES = ["web_app", "ios", "ops", "comms", "sales", "mindset_universal"] as const

const receiptSchema = z.object({
  tenant_id: z.string().uuid(),
  receipt_type: z.enum(["feature", "task", "bug", "verification", "decision", "lesson"]),
  source_surface: z.string().trim().min(1),
  agent_family: z.enum(AGENT_FAMILIES).default("web_app"),
  framework_scope: z.enum(FRAMEWORK_SCOPES).default("web_app"),
  related_task_id: z.string().uuid().nullable().optional(),
  related_project_id: z.string().uuid().nullable().optional(),
  summary: z.string().trim().min(1),
  lesson: z.string().trim().min(1),
  proof_url_or_path: z.string().trim().min(1),
  verification_status: z.literal("verified").default("verified"),
})

type Profile = { id: string; role: string | null }

async function getCallerScope() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, profile: null, tenantIds: [] as string[] }

  const { data: profileRaw } = await supabase
    .from("byred_users")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const profile = profileRaw as Profile | null

  if (!profile) return { supabase, profile: null, tenantIds: [] as string[] }

  const { data: memberships } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id")
    .eq("user_id", profile.id)

  const tenantIds = (memberships ?? []).map((row: { tenant_id: string }) => row.tenant_id)
  return { supabase, profile, tenantIds }
}

function frameworkAllowed(agentFamily: (typeof AGENT_FAMILIES)[number], frameworkScope: (typeof FRAMEWORK_SCOPES)[number]) {
  if (agentFamily === "universal") return frameworkScope === "mindset_universal"
  if (frameworkScope === "mindset_universal") return true
  return agentFamily === frameworkScope
}

export async function GET(req: NextRequest) {
  const { supabase, profile, tenantIds } = await getCallerScope()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenantIds.length === 0) return NextResponse.json({ receipts: [] })

  const target = req.nextUrl.searchParams.get("agent_family") ?? "web_app"
  const agentFamily = AGENT_FAMILIES.includes(target as (typeof AGENT_FAMILIES)[number])
    ? target
    : "web_app"

  const { data, error } = await supabase
    .from("os_agent_receipts")
    .select("*")
    .in("tenant_id", tenantIds)
    .eq("verification_status", "verified")
    .or(`agent_family.eq.${agentFamily},framework_scope.eq.mindset_universal`)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    receipts: data ?? [],
    agent_family: agentFamily,
    includes_mindset_universal: true,
  })
}

export async function POST(req: NextRequest) {
  const { profile, tenantIds } = await getCallerScope()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = receiptSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const receipt = parsed.data
  if (!tenantIds.includes(receipt.tenant_id)) {
    return NextResponse.json({ error: "Tenant not in caller scope" }, { status: 403 })
  }

  if (!frameworkAllowed(receipt.agent_family, receipt.framework_scope)) {
    return NextResponse.json(
      { error: "Framework scope must match the agent family unless it is mindset_universal" },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from("os_agent_receipts")
    .insert({
      ...receipt,
      created_by_user_id: profile.id,
      verification_status: "verified",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ receipt: data }, { status: 201 })
}
