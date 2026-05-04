import { createClient } from "@/lib/supabase/server"
import type { DailyBriefSummary } from "@/types/database"

const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
}

export async function getTodayBrief(): Promise<{
  summary: DailyBriefSummary
  date: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await (supabase as any)
    .from("byred_daily_briefs")
    .select("summary, date")
    .eq("date", today)
    .is("user_id", null) // Global brief
    .single()

  if (error || !data) {
    return { summary: DEFAULT_BRIEF, date: today }
  }

  return {
    summary: data.summary as DailyBriefSummary,
    date: data.date,
  }
}

export async function getUserBrief(
  userId: string
): Promise<{ summary: DailyBriefSummary; date: string }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Try user-specific brief first
  const { data: userBrief } = await (supabase as any)
    .from("byred_daily_briefs")
    .select("summary, date")
    .eq("date", today)
    .eq("user_id", userId)
    .single()

  if (userBrief) {
    return {
      summary: userBrief.summary as DailyBriefSummary,
      date: userBrief.date,
    }
  }

  // Fall back to global brief
  return getTodayBrief()
}
