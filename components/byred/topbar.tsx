"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, FileText, AlertTriangle, Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useUser } from "@/lib/context/user-context"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useTheme } from "@/lib/context/theme-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { DailyBriefSummary } from "@/types/database"
import { NotificationBell } from "@/components/byred/notification-bell"

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/os": "Home",
  "/os/dashboard": "Home",
  "/os/today": "Today",
  "/os/projects": "Projects",
  "/os/boards": "Boards",
  "/os/tasks": "Tasks",
  "/os/calendar": "Calendar",
  "/os/team": "Team",
  "/os/comms": "Comms",
  "/os/import": "Import",
  "/os/docs": "Docs",
  "/os/crm": "CRM",
  "/os/files": "Files",
  "/os/reports": "Reports",
  "/os/ai": "AI",
  "/os/automations": "Automations",
  "/os/signals": "Signals",
  "/os/settings": "Settings",
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Command Center", href: "/" }]

  const crumbs: { label: string; href: string }[] = []
  let path = ""
  for (const seg of segments) {
    path += `/${seg}`
    const label =
      ROUTE_LABELS[path] ?? (seg.length > 12 ? `${seg.slice(0, 10)}...` : seg)
    crumbs.push({ label, href: path })
  }
  return crumbs
}

// Default brief when none exists
const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
}

export function AppTopbar() {
  const pathname = usePathname()
  const currentUser = useUser()
  const { isCollapsed, toggleMobile } = useSidebar()
  const { theme, toggle: toggleTheme } = useTheme()
  const isMobile = useIsMobile()
  const [briefOpen, setBriefOpen] = useState(false)
  const [brief, setBrief] = useState<DailyBriefSummary>(DEFAULT_BRIEF)
  const [briefDate, setBriefDate] = useState<string | null>(null)
  const breadcrumbs = getBreadcrumbs(pathname)

  // Fetch today's brief on mount
  useEffect(() => {
    async function fetchBrief() {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]

      const { data } = await (supabase as any)
        .from("byred_daily_briefs")
        .select("summary, date")
        .eq("date", today)
        .is("user_id", null) // Global brief
        .single()

      if (data?.summary) {
        setBrief(data.summary as DailyBriefSummary)
        setBriefDate(data.date)
      }
    }

    fetchBrief()
  }, [])

  // User display info
  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = briefDate
    ? new Date(briefDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Today"

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-30 bg-[#0D0D0F] border-b border-white/[0.07] flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        isMobile ? "left-0" : isCollapsed ? "left-14" : "left-56"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobile}
            className="w-8 h-8 text-[#9CA3AF] hover:text-white hover:bg-white/5 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </Button>
        )}

        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-sm"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="w-3 h-3 text-[#6B7280]"
                  strokeWidth={1.75}
                />
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-white font-semibold tracking-tight truncate max-w-[150px] md:max-w-none font-condensed text-base uppercase">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors hidden md:inline text-xs"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Daily Brief */}
        <Popover open={briefOpen} onOpenChange={setBriefOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#9CA3AF] hover:text-white hover:bg-white/5 gap-2 text-xs px-2 md:px-3"
            >
              <FileText className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden md:inline">Brief</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 bg-[var(--elevated)] border-[var(--border-default)] p-0 shadow-xl"
            align="end"
          >
            <div className="p-4 border-b border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">
                Daily Brief · {formattedDate}
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                {brief.headline}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {brief.top_3.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-2">
                    Top 3
                  </p>
                  <ol className="space-y-1">
                    {brief.top_3.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-[#9CA3AF]"
                      >
                        <span className="text-[#D7261E] font-mono font-medium shrink-0">
                          {i + 1}.
                        </span>
                        {typeof item === "string" ? item : item.title}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {brief.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-2">
                    Warnings
                  </p>
                  {brief.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-yellow-500"
                    >
                      <AlertTriangle
                        className="w-3 h-3 shrink-0 mt-0.5"
                        strokeWidth={1.75}
                      />
                      {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-[#2A2D35]">
                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-1">
                  Next Action
                </p>
                <p className="text-sm font-medium text-white">
                  {brief.next_action}
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-[#9CA3AF] hover:text-white hover:bg-white/5 w-8 h-8"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4" strokeWidth={1.75} />
          )}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar — links to OS settings */}
        <Link
          href="/os/settings"
          className="w-7 h-7 rounded-full bg-[#D7261E]/20 border border-[#D7261E]/30 flex items-center justify-center cursor-pointer hover:border-[#D7261E]/50 transition-colors"
          aria-label="User settings"
        >
          <span className="text-xs font-semibold text-[#D7261E]">
            {initials}
          </span>
        </Link>
      </div>
    </header>
  )
}
