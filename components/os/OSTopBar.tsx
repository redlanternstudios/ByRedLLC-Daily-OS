"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, FileText, Sun } from "lucide-react"
import { useUser } from "@/lib/context/user-context"
import { BackButton } from "./BackButton"

const ROUTE_META: Record<string, { title: string; parent?: string }> = {
  "/os/dashboard":  { title: "Home" },
  "/os/today":      { title: "Today",         parent: "Home" },
  "/os/projects":   { title: "Projects",      parent: "Home" },
  "/os/boards":     { title: "Boards",        parent: "Projects" },
  "/os/tasks":      { title: "Tasks",         parent: "Home" },
  "/os/calendar":   { title: "Calendar",      parent: "Home" },
  "/os/team":       { title: "Team",          parent: "Home" },
  "/os/import":     { title: "Import",        parent: "Home" },
  "/os/lantern-ai": { title: "LanternAI",     parent: "Home" },
  "/os/ai":         { title: "LanternAI",     parent: "Home" },
  "/os/workflows":  { title: "Workflows",     parent: "Home" },
  "/os/triggers":   { title: "Triggers",      parent: "Home" },
  "/os/settings":   { title: "Settings",      parent: "Home" },
  "/os/comms":      { title: "Comms",         parent: "Home" },
  "/os/crm":        { title: "CRM",           parent: "Home" },
  "/os/docs":       { title: "Docs",          parent: "Home" },
  "/os/files":      { title: "Files",         parent: "Home" },
  "/os/reports":    { title: "Reports",       parent: "Home" },
}

function getMetaForPath(pathname: string) {
  const exact = ROUTE_META[pathname]
  if (exact) return exact
  const match = Object.entries(ROUTE_META)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname.startsWith(path + "/"))
  return match?.[1] ?? { title: "Daily OS" }
}

export function OSTopBar() {
  const pathname = usePathname()
  const { profile } = useUser()
  const meta = getMetaForPath(pathname)

  const initials = (profile?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header
      className="fixed z-30 flex items-center justify-between"
      style={{
        left: 200,
        top: 0,
        right: 0,
        height: 52,
        padding: "0 24px",
        background: "#111112",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#52525B" }}>
          {meta.parent && (
            <>
              <Link
                href="/os/dashboard"
                style={{ color: "#52525B", textDecoration: "none", fontSize: 12 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#A1A1AA")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525B")}
              >
                {meta.parent}
              </Link>
              <span style={{ color: "#3F3F46" }}>/</span>
            </>
          )}
          <span style={{ color: "#FAFAFA", fontWeight: 600 }}>{meta.title}</span>
        </div>
      </div>

      {/* Right: icon actions + avatar */}
      <div className="flex items-center gap-2">
        <Link
          href="/os/tasks?filter=blocked"
          title="View Blockers"
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#D7261E",
            textDecoration: "none",
            padding: "3px 8px",
            border: "1px solid rgba(215,38,30,0.3)",
            borderRadius: 3,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          Blockers
        </Link>

        <IconLink href="/os/today" title="Daily Brief">
          <FileText size={13} strokeWidth={1.75} />
        </IconLink>

        <IconLink href="/os/today" title="Today">
          <Sun size={13} strokeWidth={1.75} />
        </IconLink>

        <IconLink href="/os/notifications" title="Notifications">
          <Bell size={13} strokeWidth={1.75} />
        </IconLink>

        {/* Avatar */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#D7261E",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "default",
            flexShrink: 0,
          }}
          title={profile?.name ?? ""}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}

function IconLink({ href, children, title }: { href: string; children: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4,
        color: "#71717A",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.color = "#FAFAFA"
        el.style.borderColor = "rgba(255,255,255,0.18)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.color = "#71717A"
        el.style.borderColor = "rgba(255,255,255,0.08)"
      }}
    >
      {children}
    </Link>
  )
}
