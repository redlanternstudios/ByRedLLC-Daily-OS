"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/lib/context/user-context"
import {
  Home,
  CalendarDays,
  FolderOpen,
  LayoutGrid,
  ListTodo,
  Calendar,
  Users,
  MessageSquare,
  User,
  FileText,
  Files,
  BarChart3,
  Upload,
  Zap,
  Workflow,
  Bell,
  Settings,
  AlertTriangle,
  Flame,
} from "lucide-react"

type NavLink = { kind: "link"; label: string; href: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }> }
type NavSoon = { kind: "soon"; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }> }
type NavEntry = NavLink | NavSoon

const TOP_NAV: NavLink[] = [
  { kind: "link", label: "Home", href: "/os/dashboard", icon: Home },
  { kind: "link", label: "Today", href: "/os/today", icon: CalendarDays },
]

const SECTIONS: { section: string; items: NavEntry[] }[] = [
  {
    section: "Work",
    items: [
      { kind: "link", label: "Projects", href: "/os/projects", icon: FolderOpen },
      { kind: "link", label: "Boards", href: "/os/boards", icon: LayoutGrid },
      { kind: "link", label: "Tasks", href: "/os/tasks", icon: ListTodo },
      { kind: "link", label: "Calendar", href: "/os/calendar", icon: Calendar },
    ],
  },
  {
    section: "Team",
    items: [
      { kind: "link", label: "Team", href: "/os/team", icon: Users },
      { kind: "link", label: "Comms", href: "/os/comms", icon: MessageSquare },
    ],
  },
  {
    section: "Ops",
    items: [
      { kind: "soon", label: "CRM", icon: User },
      { kind: "soon", label: "Docs", icon: FileText },
      { kind: "soon", label: "Files", icon: Files },
      { kind: "soon", label: "Reports", icon: BarChart3 },
      { kind: "link", label: "Import", href: "/os/import", icon: Upload },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { kind: "link", label: "LanternAI", href: "/os/lantern-ai", icon: Flame },
      { kind: "link", label: "Workflows", href: "/os/workflows", icon: Workflow },
      { kind: "link", label: "Triggers", href: "/os/triggers", icon: Bell },
    ],
  },
  {
    section: "Config",
    items: [
      { kind: "link", label: "Settings", href: "/os/settings", icon: Settings },
    ],
  },
]

function SoonItem({ label, icon: Icon }: { label: string; icon: NavSoon["icon"] }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ height: 32, padding: "0 16px", cursor: "not-allowed" }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={12} strokeWidth={1.75} style={{ color: "#3F3F46", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#3F3F46" }}>{label}</span>
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: "#3F3F46",
          textTransform: "uppercase",
          background: "rgba(255,255,255,0.04)",
          padding: "1px 5px",
          borderRadius: 2,
        }}
      >
        Soon
      </span>
    </div>
  )
}

function NavItem({ entry, active }: { entry: NavLink; active: boolean }) {
  const Icon = entry.icon
  return (
    <Link
      href={entry.href}
      className="flex items-center gap-2 transition-colors"
      style={{
        height: 32,
        padding: active ? "0 16px 0 14px" : "0 16px",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "#FAFAFA" : "#71717A",
        background: active ? "rgba(215,38,30,0.08)" : "transparent",
        borderLeft: active ? "2px solid #D7261E" : "2px solid transparent",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.color = "#A1A1AA"
          el.style.background = "rgba(255,255,255,0.04)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.color = "#71717A"
          el.style.background = "transparent"
        }
      }}
    >
      <Icon size={12} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {entry.label}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: "#3F3F46",
        textTransform: "uppercase",
        padding: "14px 16px 4px",
      }}
    >
      {children}
    </p>
  )
}

export function OsSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useUser()

  async function handleTenantSwitch(tenantId: string) {
    try {
      await currentUser.setActiveTenantId(tenantId)
      router.refresh()
    } catch (err) {
      console.error("Failed to switch tenant", err)
    }
  }

  function isActive(href: string) {
    if (href === "/os/dashboard") return pathname === href
    return pathname === href || pathname.startsWith(href + "/")
  }

  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const displayRole = currentUser?.profile?.role ?? "member"
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen z-40"
      style={{
        width: 200,
        minWidth: 200,
        background: "#111112",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2"
        style={{
          height: 52,
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        {/* RedLantern mark */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect width="18" height="18" rx="3" fill="#D7261E" />
          <path d="M9 3L11.5 7H6.5L9 3Z" fill="white" opacity="0.9" />
          <rect x="7" y="7" width="4" height="6" rx="0.5" fill="white" opacity="0.85" />
          <rect x="8.25" y="13" width="1.5" height="2" rx="0.5" fill="white" opacity="0.7" />
        </svg>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 3,
            color: "#FAFAFA",
            textTransform: "uppercase",
          }}
        >
          Daily OS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ paddingTop: 8, scrollbarWidth: "none" }}>
        {/* Top-level items */}
        {TOP_NAV.map((entry) => (
          <NavItem key={entry.href} entry={entry} active={isActive(entry.href)} />
        ))}

        {/* Tenant switcher */}
        {currentUser.tenants.length > 0 && (
          <>
            <SectionLabel>Tenants</SectionLabel>
            {currentUser.tenants.map((tenant) => {
              const active = currentUser.activeTenantId === tenant.id
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => void handleTenantSwitch(tenant.id)}
                  className="flex items-center w-full text-left transition-colors"
                  style={{
                    height: 32,
                    padding: active ? "0 16px 0 14px" : "0 16px",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#FAFAFA" : "#71717A",
                    background: active ? "rgba(215,38,30,0.08)" : "transparent",
                    borderLeft: active ? "2px solid #D7261E" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = "#A1A1AA"
                      el.style.background = "rgba(255,255,255,0.04)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = "#71717A"
                      el.style.background = "transparent"
                    }
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: tenant.color ?? "#D7261E",
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate" style={{ flex: 1 }}>
                    {tenant.name}
                  </span>
                </button>
              )
            })}
          </>
        )}

        {/* Sectioned nav */}
        {SECTIONS.map(({ section, items }) => (
          <div key={section}>
            <SectionLabel>{section}</SectionLabel>
            {items.map((entry) =>
              entry.kind === "link" ? (
                <NavItem key={entry.href} entry={entry} active={isActive(entry.href)} />
              ) : (
                <SoonItem key={entry.label} label={entry.label} icon={entry.icon} />
              )
            )}
          </div>
        ))}
      </nav>

      {/* View blockers */}
      <div style={{ padding: "8px 12px 4px", flexShrink: 0 }}>
        <Link
          href="/os/tasks?filter=blocked"
          className="flex items-center justify-center gap-1.5 w-full transition-opacity"
          style={{
            height: 30,
            background: "rgba(215,38,30,0.15)",
            border: "1px solid rgba(215,38,30,0.3)",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: "#D7261E",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgba(215,38,30,0.22)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgba(215,38,30,0.15)")
          }
        >
          <AlertTriangle size={11} strokeWidth={2} />
          View Blockers
        </Link>
      </div>

      {/* User block */}
      <div
        style={{
          padding: "10px 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#D7261E",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="truncate" style={{ fontSize: 11, fontWeight: 600, color: "#FAFAFA" }}>
            {displayName}
          </p>
          <p className="truncate uppercase" style={{ fontSize: 9, color: "#52525B", letterSpacing: 0.5 }}>
            {displayRole}
          </p>
        </div>
      </div>
    </aside>
  )
}
