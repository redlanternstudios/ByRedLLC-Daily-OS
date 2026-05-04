import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/observability/logger"

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function rateLimit(opts: {
  key: string
  maxEvents: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await (admin as any).rpc("byred_rate_limit_try", {
      p_key: opts.key,
      p_max_events: opts.maxEvents,
      p_window_seconds: opts.windowSeconds,
    })

    if (error) {
      logger.warn(
        "rate_limit.rpc_error",
        { key: opts.key, max: opts.maxEvents, window: opts.windowSeconds },
        error
      )
      return { allowed: true, remaining: 0, retryAfterSeconds: 0 }
    }

    const row = (data as unknown as Array<{
      allowed: boolean
      remaining: number
      retry_after_s: number
    }>)?.[0]

    if (!row) {
      return { allowed: true, remaining: 0, retryAfterSeconds: 0 }
    }

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfterSeconds: row.retry_after_s,
    }
  } catch (e) {
    logger.warn("rate_limit.exception", { key: opts.key }, e)
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 }
  }
}

export async function rateLimitLogin(opts: {
  email: string
  ip: string | null
}): Promise<RateLimitResult> {
  const normalizedEmail = opts.email.trim().toLowerCase()
  const ip = opts.ip?.trim() || "unknown"
  return rateLimit({
    key: `login:${normalizedEmail}:${ip}`,
    maxEvents: 10,
    windowSeconds: 300,
  })
}
