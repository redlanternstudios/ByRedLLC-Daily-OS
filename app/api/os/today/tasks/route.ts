import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mapTaskFromDb } from "@/types/db"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("byred_tasks")
      .select("*")
      .not("status", "in", "(done,cancelled)")
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true })

    if (error) return NextResponse.json({ tasks: [], blockers: [] })

    const tasks = data.map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.blocker_flag)

    return NextResponse.json({ tasks, blockers })
  } catch {
    return NextResponse.json({ tasks: [], blockers: [] }, { status: 500 })
  }
}
