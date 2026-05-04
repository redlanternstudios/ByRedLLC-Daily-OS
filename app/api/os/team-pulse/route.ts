import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const today = new Date().toISOString().split("T")[0]

    // Fetch today's team-wide pulse (user_id IS NULL = cron-generated team brief)
    const { data: pulses } = await supabase
      .from("byred_daily_briefs")
      .select("*")
      .is("user_id", null)
      .gte("date", today)
      .order("created_at", { ascending: false })
      .limit(2)

    return NextResponse.json({ pulses: pulses ?? [] })
  } catch {
    return NextResponse.json({ pulses: [] }, { status: 500 })
  }
}
