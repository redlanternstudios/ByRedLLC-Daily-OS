"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const AVATAR_BUCKET = "profile-avatars"
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const fullName = String(formData.get("fullName") ?? "").trim()

  if (!fullName) {
    return { error: "Name is required" }
  }

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

  revalidatePath("/os/settings")
  revalidatePath("/os")

  return { success: true }
}

export async function updateProfilePhotoAction(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const file = formData.get("avatar")

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: "Not authenticated" }
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first" }
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image must be 5 MB or smaller" }
  }

  const extension = ALLOWED_AVATAR_TYPES.get(file.type)
  if (!extension) {
    return { error: "Use a JPG, PNG, or WebP image" }
  }

  const path = `${authUser.id}/profile.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error: updateError } = await (admin as any)
    .from("byred_users")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("auth_user_id", authUser.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/os/settings")
  revalidatePath("/os")

  return { success: true, avatarUrl: publicUrl }
}

export async function removeProfilePhotoAction() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: "Not authenticated" }
  }

  const { error } = await (admin as any)
    .from("byred_users")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("auth_user_id", authUser.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/os/settings")
  revalidatePath("/os")

  return { success: true }
}
