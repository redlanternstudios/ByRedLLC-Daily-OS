"use client"

import React from "react"

type FieldProps = {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
  topGap?: boolean
  required?: boolean
  rightLabel?: React.ReactNode
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  topGap,
  required = true,
  rightLabel,
}: FieldProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  return (
    <div className={topGap ? "mt-4" : ""}>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-xs font-medium text-white/50 uppercase tracking-widest"
        >
          {label}
        </label>
        {rightLabel}
      </div>
      {/* Render a placeholder on the server; swap to real input on client only.
          This prevents password manager extensions (LastPass etc.) from injecting
          DOM nodes that cause React hydration mismatches. */}
      {mounted ? (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#c8102e]/60 focus:ring-1 focus:ring-[#c8102e]/30"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-9 w-full rounded-md border border-white/10 bg-white/5"
        />
      )}
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [year, setYear] = React.useState<number | null>(null)
  React.useEffect(() => { setYear(new Date().getFullYear()) }, [])
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Vault background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/vault-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-100 select-none pointer-events-none"
        onError={(e) => {
          // fallback — hide broken img so CSS gradient shows instead
          ;(e.target as HTMLImageElement).style.display = "none"
        }}
      />

      {/* Dark overlay — deepens the atmospheric black */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(140,0,0,0.35) 0%, rgba(60,0,0,0.18) 45%, transparent 70%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Side vignette */}
      <div
        className="absolute inset-y-0 left-0 w-40 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-40 pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-byred-llc.png"
          alt="By Red, LLC."
          className="w-[520px] max-w-[90vw] h-auto object-contain select-none -mb-4 drop-shadow-[0_0_60px_rgba(200,16,46,0.7)]"
        />
        <p className="text-[10px] font-semibold tracking-[0.35em] text-white/30 uppercase mb-8">
          Internal operations · execution only
        </p>

        {children}

        <p className="mt-8 text-[11px] text-white/20 text-center">
          By Red, LLC&nbsp;&nbsp;·&nbsp;&nbsp;{year ?? ""}&nbsp;&nbsp;·&nbsp;&nbsp;Build stable
        </p>
      </div>
    </main>
  )
}
