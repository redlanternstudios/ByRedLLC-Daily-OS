"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

type OSEmptyProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function OSEmpty({ icon: Icon = Inbox, title, description, action, className }: OSEmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="w-12 h-12 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-[#9CA3AF] mb-1">{title}</p>
      {description && <p className="text-xs text-[#6B7280] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function OSLoadingRow({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-11 rounded-lg bg-[#1A1D24]/80 animate-shimmer" />
      ))}
    </div>
  )
}

export function OSLoadingCard({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-40 rounded-xl bg-[#1A1D24]/80 animate-shimmer" />
      ))}
    </div>
  )
}

export function OSErrorState({ message = "Something went wrong. Try again." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl font-bold">!</span>
      </div>
      <p className="text-sm font-medium text-[#9CA3AF] mb-1">Error</p>
      <p className="text-xs text-[#6B7280] max-w-xs">{message}</p>
    </div>
  )
}
