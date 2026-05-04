"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const fullName = formData.get("fullName") as string

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: "Not authenticated" }
  }

  const { error } = await (supabase as any)
    .from("byred_users")
    .update({ name: fullName })
    .eq("auth_user_id", authUser.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
