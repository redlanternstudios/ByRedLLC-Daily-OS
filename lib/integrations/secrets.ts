import "server-only"

import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

// Encrypted secrets vault. Values are encrypted app-side with AES-256-GCM using a
// key derived from SECRETS_ENCRYPTION_KEY. The DB stores only ciphertext/iv/tag —
// never plaintext, never the key. The AI never sees raw secrets: it references a
// secret by id/name, and only trusted server-side actions call resolveSecret().

export function secretsConfigured(): boolean {
  return !!process.env.SECRETS_ENCRYPTION_KEY
}

function encryptionKey(): Buffer {
  const k = process.env.SECRETS_ENCRYPTION_KEY
  if (!k) throw new Error("SECRETS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt secrets.")
  return crypto.createHash("sha256").update(k).digest() // 32-byte key
}

export type Encrypted = { ciphertext: string; iv: string; auth_tag: string }

export function encryptSecret(plaintext: string): Encrypted {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return { ciphertext: ct.toString("base64"), iv: iv.toString("base64"), auth_tag: cipher.getAuthTag().toString("base64") }
}

export function decryptSecret(rec: Encrypted): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(rec.iv, "base64"))
  decipher.setAuthTag(Buffer.from(rec.auth_tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(rec.ciphertext, "base64")), decipher.final()]).toString("utf8")
}

/**
 * Server-only: decrypt a stored secret by id. Call this ONLY inside a trusted
 * action (e.g. a GitHub API call), never to return a value to a client or an AI prompt.
 */
export async function resolveSecret(id: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data } = await admin
    .from("os_integration_secrets")
    .select("ciphertext, iv, auth_tag")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  return decryptSecret(data as Encrypted)
}
