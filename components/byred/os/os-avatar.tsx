"use client"

import { cn } from "@/lib/utils"
import { useUser } from "@/lib/context/user-context"

const COLORS = [
  "bg-red-900 text-red-300",
  "bg-sky-900 text-sky-300",
  "bg-emerald-900 text-emerald-300",
  "bg-amber-900 text-amber-300",
  "bg-orange-900 text-orange-300",
]

function colorFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

type OSAvatarProps = {
  /** byred_users.id — will be resolved to a real name via UserContext directory */
  userId?: string | null
  /** Explicit name override — used when you already have the name (e.g. comment join) */
  fallbackName?: string
  /** Legacy: pass a name directly (no lookup). Still supported for non-user contexts. */
  name?: string
  size?: "xs" | "sm" | "md"
  className?: string
}

export function OSAvatar({ userId, fallbackName, name, size = "sm", className }: OSAvatarProps) {
  const user = useUser()

  // Resolve display name: userId lookup > fallbackName > name prop > "?"
  let displayName = name ?? fallbackName ?? "?"
  if (userId && user?.directory) {
    const entry = user.directory.find((d) => d.id === userId)
    if (entry) displayName = entry.name
  }

  const initials = getInitials(displayName)

  const sizeClass = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
  }[size]

  return (
    <div
      title={displayName !== "?" ? displayName : undefined}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 border border-white/5",
        colorFromName(displayName),
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  )
}
