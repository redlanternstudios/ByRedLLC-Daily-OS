"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Trello,
  ListTodo,
  Calendar,
  Users,
  FileText,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  AlertTriangle,
  Folder,
  Cpu,
  Flame,
  BarChart,
  Radio,
  ShieldAlert,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser, useActiveTenant } from "@/lib/context/user-context"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: "Home",     href: "/os/dashboard", icon: LayoutDashboard },
      { label: "Today",    href: "/os/today",     icon: Flame },
      { label: "Tasks",    href: "/os/tasks",     icon: ListTodo },
      { label: "Calendar", href: "/os/calendar",  icon: Calendar },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Projects", href: "/os/projects", icon: FolderKanban },
      { label: "Boards",   href: "/os/boards",   icon: Trello },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Team",       href: "/os/team",        icon: Users },
      { label: "Team Pulse", href: "/os/team-pulse",  icon: Radio },
      { label: "Blockers",   href: "/os/blockers",    icon: ShieldAlert },
    ],
  },
  {
    label: "Intel",
    items: [
      { label: "Lantern AI", href: "/os/ai",   icon: Cpu },
      { label: "KPIs",       href: "/os/kpis", icon: BarChart },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Docs",  href: "/os/docs",  icon: FileText },
      { label: "Files", href: "/os/files", icon: Folder },
      { label: "Comms", href: "/os/comms", icon: MessageSquare },
    ],
  },
  {
    label: null,
    items: [
      { label: "Settings", href: "/os/settings", icon: Settings },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TENANT_COLORS = [
  "#D7261E","#10B981","#0EA5E9","#F59E0B","#8B5CF6","#F43F5E","#14B8A6","#F97316",
]

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

// ---------------------------------------------------------------------------
// Single nav item
// ---------------------------------------------------------------------------
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  placeholder,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active: boolean
  collapsed: boolean
  placeholder?: boolean
  onClick?: () => void
}) {
  const inner = (
      <Link
      href={href}
      onClick={(e) => {
        if (placeholder) { e.preventDefault(); return }
        onClick?.()
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-md text-xs transition-colors relative group",
        collapsed ? "justify-center p-2.5" : "px-3 py-1.5",
        active
          ? "bg-[#D7261E]/10 text-white font-medium border-l-2 border-[#D7261E] rounded-l-none pl-[10px]"
          : "text-[#9CA3AF] hover:text-[#9CA3AF] hover:bg-white/5",
        placeholder && !active && "opacity-40 pointer-events-none"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {placeholder && (
            <span className="ml-auto text-[9px] text-[#6B7280] font-medium tracking-widest uppercase">
              Soon
            </span>
          )}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs bg-[#111318] border-[#2A2D35] text-white">
          {label}{placeholder ? " (Soon)" : ""}
        </TooltipContent>
      </Tooltip>
    )
  }

  return inner
}

// ---------------------------------------------------------------------------
// Sidebar content
// ---------------------------------------------------------------------------
function SidebarContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useUser()
  const activeTenant = useActiveTenant()
  const { toggleCollapsed } = useSidebar()
  const isMobile = useIsMobile()



  function isActive(href: string) {
    if (href === "/os/dashboard") {
      return pathname === "/os/dashboard" || pathname === "/" || pathname === "/os"
    }
    // Exact match for short paths that are prefixes of other routes
    if (href === "/os/today") return pathname === "/os/today"
    if (href === "/os/team")  return pathname === "/os/team"
    return pathname.startsWith(href)
  }

  const displayName = currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const displayRole = currentUser?.profile?.role ?? "member"
  const initials = getInitials(displayName)

  
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-[#0D0D0F]">

        {/* Logo */}
        <div className={cn(
          "shrink-0 flex items-center justify-center border-b border-[#2A2D35]/60",
          collapsed ? "h-16 px-2" : "h-24 px-3"
        )}>
          <Link href="/os/dashboard" onClick={onNavClick} className="block">
            <Image
              src="/by-red-logo.png"
              alt="By Red, LLC. – RedLantern Studios"
              width={148}
              height={148}
              className={cn(
                "h-auto object-contain drop-shadow-[0_4px_12px_rgba(200,16,46,0.25)]",
                collapsed ? "w-10" : "w-16"
              )}
              priority
            />
          </Link>
        </div>



        {/* Nav */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-3 space-y-4",
          collapsed ? "px-2" : "px-2"
        )}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? gi}>
              {!collapsed && group.label && (
                <p className="text-[9px] font-semibold tracking-widest text-[#D7261E]/60 uppercase px-3 mb-1 font-condensed">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Blocker alert */}
        {!collapsed && (
          <div className="px-3 py-2">
            <Link
              href="/os/tasks?filter=blocked"
              onClick={onNavClick}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-red-950/40 border border-red-900/30 hover:border-red-800/50 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-[#D7261E] shrink-0" strokeWidth={1.75} />
              <span className="text-[10px] text-red-400">View blockers</span>
            </Link>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        {!isMobile && (
          <div className="px-3 py-2 border-t border-[#2A2D35]/60">
            <button
              onClick={toggleCollapsed}
              className={cn(
                "w-full flex items-center text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/5 rounded-md transition-colors text-xs py-1.5",
                collapsed ? "justify-center px-2" : "gap-2 px-2"
              )}
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* User block */}
        <div className={cn(
          "border-t border-[#2A2D35]/60",
          collapsed ? "p-2" : "p-3"
        )}>
          <Link
            href="/os/settings"
            onClick={onNavClick}
            className={cn(
              "flex items-center rounded-md hover:bg-white/5 transition-colors",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2 py-2"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-[#D7261E]/20 border border-[#D7261E]/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#D7261E]">{initials}</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#9CA3AF] truncate">{displayName}</p>
                <p className="text-[10px] text-[#6B7280] truncate capitalize">{displayRole}</p>
              </div>
            )}
          </Link>
        </div>

      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export function AppSidebar() {
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-[#07080D] border-r border-[#2A2D35]">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent collapsed={false} onNavClick={() => setIsMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      style={{ zIndex: 50, pointerEvents: "auto", isolation: "isolate" }}
      className={cn(
        "shrink-0 flex flex-col h-screen bg-[#0D0D0F] border-r border-white/[0.07] fixed left-0 top-0 transition-all duration-300 overflow-visible",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      <SidebarContent collapsed={isCollapsed} />
    </aside>
  )
}

// Mobile menu trigger (used by topbar)
export function MobileMenuButton() {
  const { toggleMobile } = useSidebar()
  return (
    <button
      onClick={toggleMobile}
      className="w-8 h-8 flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/5 rounded-md transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" strokeWidth={1.75} />
    </button>
  )
}
