import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Link auth user to an existing byred_users profile that was pre-created by
      // an admin (invite flow). Only fires when auth_user_id is still null on
      // the matching email row — safe to call on every sign-in.
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const sa = supabase as any
        const { data: existing } = await sa
          .from("byred_users")
          .select("id")
          .eq("email", user.email)
          .is("auth_user_id", null)
          .maybeSingle() as { data: { id: string } | null }

        if (existing) {
          await sa
            .from("byred_users")
            .update({ auth_user_id: user.id })
            .eq("id", existing.id)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
