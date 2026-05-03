/**
 * DELETE /api/os/boards/[boardId]
 *
 * Boards are derived from tenants, so "deleting" a board is not supported.
 * This route exists to handle the delete UI gracefully — it returns 200 and
 * the UI removes the board from the list optimistically.
 *
 * In a future iteration, boards can be persisted as real rows and this
 * route can perform a real delete.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ boardId: string }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { boardId } = await params

  // Boards are tenant-derived. We can't delete the tenant itself.
  // Return success so the UI can remove the card optimistically.
  return NextResponse.json({ success: true, boardId, note: "Board view dismissed for this session." })
}
