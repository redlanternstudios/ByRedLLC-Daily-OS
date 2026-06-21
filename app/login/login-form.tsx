"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"
import { Field } from "@/components/byred/auth-shell"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Invalid login payload"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    let supabase
    try {
      supabase = createClient()
    } catch (initException) {
      const detail =
        initException instanceof Error
          ? initException.message
          : String(initException)
      console.error("Supabase client init failed on /login", detail)
      const friendly =
        "Sign-in is temporarily unavailable — the app is misconfigured. Ask the admin to check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY on this environment."
      setError(friendly)
      toast.error(friendly)
      setLoading(false)
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      })

      if (signInError) {
        const message = signInError.message ?? "Invalid email or password."
        setError(message)
        toast.error(message)
        setLoading(false)
        return
      }

      router.refresh()
      router.push("/os/dashboard")
    } catch (authException) {
      const message =
        authException instanceof Error
          ? authException.message
          : "Sign-in failed unexpectedly"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card header */}
      <div className="rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 border-b border-white/6 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            Sign in
          </span>
          <span className="text-[10px] font-mono text-white/20">Auth · v1</span>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-1">
          {error && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-md border border-red-500/20 bg-red-500/8">
              <AlertOctagon
                className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"
                strokeWidth={1.75}
              />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="you@byred.co"
          />

          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="••••••••"
            topGap
            rightLabel={
              <Link
                href="/forgot-password"
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Forgot?
              </Link>
            }
          />

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-[#c8102e] hover:bg-[#a00d25] active:bg-[#8a0b1f] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in\u2026" : "Sign in"}
              {!loading && <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <p className="text-[11px] text-white/25">
            No account?{" "}
            <Link
              href="/register"
              className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
            >
              Request access
            </Link>
          </p>
          <span className="text-[10px] font-mono text-white/15">
            Allowlist gated
          </span>
        </div>
      </div>
    </div>
  )
}
