import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ members: [] }, { status: 401 })

    const { data } = await supabase
      .from("byred_users")
      .select("id, name, email, role, avatar_url")
      .eq("active", true)
      .order("name")

    return NextResponse.json({ members: data ?? [] })
  } catch {
    return NextResponse.json({ members: [] }, { status: 500 })
  }
}
