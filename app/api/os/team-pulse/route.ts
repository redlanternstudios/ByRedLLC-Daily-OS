import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Enterprise: fetch last 7 days of team pulses (user_id IS NULL = team-wide)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split("T")[0]

    const { data: pulses, error } = await supabase
      .from("byred_daily_briefs")
      .select("*")
      .is("user_id", null)
      .gte("date", cutoff)
      .order("created_at", { ascending: false })
      .limit(14) // Up to 2 per day (morning + evening) for 7 days

    if (error) {
      console.error("[team-pulse] GET failed:", error)
      return NextResponse.json({ pulses: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pulses: pulses ?? [] })
  } catch (err) {
    console.error("[team-pulse] GET exception:", err)
    return NextResponse.json({ pulses: [], error: "Internal server error" }, { status: 500 })
  }
}
