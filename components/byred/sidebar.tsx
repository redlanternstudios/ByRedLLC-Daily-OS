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
import { setActiveTenantAction } from "@/lib/actions/tenant"
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
          ? "bg-white/10 text-white font-medium"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
        placeholder && !active && "opacity-40 pointer-events-none"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {placeholder && (
            <span className="ml-auto text-[9px] text-zinc-700 font-medium tracking-widest uppercase">
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
        <TooltipContent side="right" className="text-xs bg-zinc-900 border-zinc-700 text-zinc-200">
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

  async function handleTenantSwitch() {
    const tenants = currentUser?.tenants ?? []
    if (tenants.length < 2) return
    const idx = tenants.findIndex((t) => t.id === currentUser?.activeTenantId)
    const next = tenants[(idx + 1) % tenants.length]
    // Optimistic UI update
    currentUser?.setActiveTenantId(next.id)
    // Persist to cookie so server routes pick it up
    await setActiveTenantAction(next.id)
    // Re-run all server components on the current page
    router.refresh()
  }

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

  // Active tenant color dot
  const tenantIdx = (currentUser?.tenants ?? []).findIndex(
    (t) => t.id === currentUser?.activeTenantId
  )
  const tenantColor = TENANT_COLORS[Math.max(tenantIdx, 0) % TENANT_COLORS.length]
  const tenantName = activeTenant?.name ?? "No tenant"

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-[var(--surface)]">

        {/* Logo */}
        <div className={cn(
          "border-b border-zinc-800/60 flex items-center shrink-0 bg-zinc-900",
          collapsed ? "h-14 justify-center px-2" : "h-20 px-2"
        )}>
          <Link href="/os/dashboard" onClick={onNavClick} className="flex items-center min-w-0 w-full">
            {collapsed ? (
              <Image
                src="/logo-byred.png"
                alt="By Red OS"
                width={38}
                height={38}
                className="object-contain"
                priority
              />
            ) : (
              <Image
                src="/logo-byred.png"
                alt="By Red, LLC. OS"
                width={160}
                height={72}
                className="w-full h-16 object-contain object-left"
                priority
              />
            )}
          </Link>
        </div>

        {/* Active tenant pill */}
        {!collapsed && (currentUser?.tenants?.length ?? 0) > 0 && (
          <div className="px-4 py-2 border-b border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: tenantColor }}
              />
              <span className="text-[10px] text-zinc-500 truncate">{tenantName}</span>
              {(currentUser?.tenants?.length ?? 0) > 1 && (
                <button
                  className="ml-auto text-[9px] text-zinc-700 hover:text-zinc-400 transition-colors"
                  onClick={handleTenantSwitch}
                >
                  Switch
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-3 space-y-4",
          collapsed ? "px-2" : "px-2"
        )}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? gi}>
              {!collapsed && group.label && (
                <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase px-3 mb-1">
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
          <div className="px-3 py-2 border-t border-zinc-800/60">
            <button
              onClick={toggleCollapsed}
              className={cn(
                "w-full flex items-center text-zinc-600 hover:text-zinc-400 hover:bg-white/5 rounded-md transition-colors text-xs py-1.5",
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
          "border-t border-zinc-800/60",
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
                <p className="text-xs font-medium text-zinc-300 truncate">{displayName}</p>
                <p className="text-[10px] text-zinc-600 truncate capitalize">{displayRole}</p>
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
        <SheetContent side="left" className="w-60 p-0 bg-zinc-950 border-r border-zinc-800">
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
        "shrink-0 flex flex-col h-screen bg-[var(--surface)] border-r border-[var(--border-default)] fixed left-0 top-0 transition-all duration-300",
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
      className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" strokeWidth={1.75} />
    </button>
  )
}
