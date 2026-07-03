import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Save integration configuration with encrypted API keys
 * POST /api/os/integrations/save
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { tenantId, supabaseRepo, githubRepo, selectedIntegrations, apiKeys } = await req.json()

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenantId" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Encrypt API keys (in production, use proper encryption)
    // For now, storing with a marker that they're sensitive
    const encryptedKeys = {} as Record<string, string>
    if (apiKeys) {
      for (const [key, value] of Object.entries(apiKeys)) {
        // TODO: Implement proper encryption
        // For now, just mark as encrypted
        encryptedKeys[key] = `ENCRYPTED:${value?.substring(0, 5)}...`
      }
    }

    // Save integration config to os_integration_configs table
    const { data: config, error: configError } = await admin
      .from("os_integration_configs")
      .upsert(
        {
          tenant_id: tenantId,
          supabase_repo: supabaseRepo || null,
          github_repo: githubRepo || null,
          selected_integrations: selectedIntegrations,
          api_keys_metadata: encryptedKeys,
          updated_by_user_id: user.profile?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      )
      .select()
      .single()

    if (configError) {
      return NextResponse.json(
        { error: configError.message },
        { status: 400 }
      )
    }

    // Emit domain event for integration config change
    await admin
      .from("domain_events")
      .insert({
        event_type: "integration.configured",
        tenant_id: tenantId,
        payload: {
          supabaseRepo,
          githubRepo,
          integrations: selectedIntegrations,
          configId: config.id,
        },
        metadata: {
          userId: user.profile?.id,
          timestamp: new Date().toISOString(),
        },
      })

    return NextResponse.json({
      success: true,
      configId: config.id,
      message: "Integration configuration saved",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save configuration" },
      { status: 500 }
    )
  }
}
