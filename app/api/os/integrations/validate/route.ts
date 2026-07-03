import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Validate integration setup (Supabase repo, GitHub repo, API keys)
 * POST /api/os/integrations/validate
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { supabaseRepo, githubRepo, selectedIntegrations, apiKeys } = await req.json()

    const results = {
      supabase: { valid: false, error: null as string | null },
      github: { valid: false, error: null as string | null },
      integrations: {} as Record<string, { valid: boolean; error: string | null }>,
    }

    // Validate Supabase repo selection
    if (supabaseRepo) {
      try {
        if (supabaseRepo === "rorysemeah-prod" || supabaseRepo === "keymon-prod" || supabaseRepo === "shared") {
          results.supabase.valid = true
        } else {
          results.supabase.error = "Invalid Supabase repo selected"
        }
      } catch (e) {
        results.supabase.error = String(e)
      }
    }

    // Validate GitHub repo
    if (githubRepo) {
      try {
        const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/
        if (repoRegex.test(githubRepo)) {
          // Could verify against GitHub API here if needed
          results.github.valid = true
        } else {
          results.github.error = "Invalid GitHub repo format (expected: owner/repo)"
        }
      } catch (e) {
        results.github.error = String(e)
      }
    }

    // Validate API keys
    if (selectedIntegrations && apiKeys) {
      for (const intId of selectedIntegrations) {
        const key = apiKeys[intId]
        if (!key) {
          results.integrations[intId] = {
            valid: false,
            error: "API key not provided",
          }
          continue
        }

        // Basic validation (could be more thorough)
        if (key.length < 10) {
          results.integrations[intId] = {
            valid: false,
            error: "API key appears too short",
          }
        } else {
          results.integrations[intId] = {
            valid: true,
            error: null,
          }
        }
      }
    }

    // Check if all required validations passed
    const allValid =
      (results.supabase.valid || !supabaseRepo) &&
      (results.github.valid || !githubRepo) &&
      Object.values(results.integrations).every((r) => r.valid || !r.error)

    return NextResponse.json({
      valid: allValid,
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Validation failed" },
      { status: 500 }
    )
  }
}
