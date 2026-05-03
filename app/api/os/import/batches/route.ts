import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/os/import/batches — list recent import batches (newest first)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("byred_import_batches")
    .select("id, source, status, total_rows, imported_rows, failed_rows, error_message, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batches: data ?? [] })
}
