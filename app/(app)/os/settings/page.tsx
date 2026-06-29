"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CheckCircle, XCircle, LogOut, AlertTriangle, User, Cpu, Plug, Building2,
  Camera, Trash2,
} from "lucide-react"
import { useUser, useActiveTenant } from "@/lib/context/user-context"
import {
  removeProfilePhotoAction,
  signOutAction,
  updateProfileAction,
  updateProfilePhotoAction,
} from "@/app/(app)/settings/actions"
import { cn } from "@/lib/utils"

const AI_MODES = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"] as const

const INTEGRATIONS = [
  { name: "Claude (AI layer)", connected: true },
  { name: "Supabase", connected: true },
  { name: "Notion", connected: true },
  { name: "Google Drive", connected: false },
]

const TENANT_COLORS = [
  "#D7261E","#10B981","#0EA5E9","#F59E0B","#8B5CF6","#F43F5E","#14B8A6","#F97316",
]

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">{title}</p>
      </div>
      <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2D35] last:border-0">
      <span className="text-xs text-[#9CA3AF]">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

export default function OSSettingsPage() {
  const router = useRouter()
  const currentUser = useUser()
  const activeTenant = useActiveTenant()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [fullName, setFullName] = useState(currentUser?.profile?.name ?? "")
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.profile?.avatar_url ?? null)
  const [aiMode, setAiMode] = useState<string>("HUMAN_ONLY")
  const [saving, setSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [photoPending, startPhotoTransition] = useTransition()

  const userEmail = currentUser?.profile?.email ?? currentUser?.authUser?.email ?? ""
  const userRole = currentUser?.profile?.role ?? "member"
  const tenants = currentUser?.tenants ?? []
  const initials = (fullName || userEmail || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleSaveName() {
    setSaving(true)
    const fd = new FormData()
    fd.append("fullName", fullName)
    const result = await updateProfileAction(fd)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Name updated.")
      setEditingName(false)
      router.refresh()
    }
  }

  function handlePhotoSelected(file: File | undefined) {
    if (!file) return

    const fd = new FormData()
    fd.append("avatar", file)

    startPhotoTransition(async () => {
      const result = await updateProfilePhotoAction(fd)
      if (result.error) {
        toast.error(result.error)
        return
      }

      setAvatarUrl(result.avatarUrl ?? null)
      toast.success("Profile picture updated.")
      router.refresh()
    })
  }

  function handleRemovePhoto() {
    startPhotoTransition(async () => {
      const result = await removeProfilePhotoAction()
      if (result.error) {
        toast.error(result.error)
        return
      }

      setAvatarUrl(null)
      toast.success("Profile picture removed.")
      router.refresh()
    })
  }

  async function handleSignOut() {
    await signOutAction()
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-condensed">Settings</h1>
        <p className="text-xs text-[#6B7280] mt-1">Profile, preferences, tenants, and integrations.</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#2A2D35]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#D7261E]/20 border border-[#D7261E]/30 overflow-hidden flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-[#D7261E]">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{fullName || userEmail}</p>
              <p className="text-[11px] text-[#6B7280]">JPG, PNG, or WebP · 5 MB max</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoPending}
              className="w-8 h-8 rounded-lg border border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:border-[#9CA3AF]/60 disabled:opacity-50 flex items-center justify-center transition-colors"
              aria-label="Upload profile picture"
              title="Upload profile picture"
            >
              <Camera className="w-4 h-4" strokeWidth={1.75} />
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={photoPending}
                className="w-8 h-8 rounded-lg border border-[#2A2D35] text-[#9CA3AF] hover:text-red-300 hover:border-red-900/60 disabled:opacity-50 flex items-center justify-center transition-colors"
                aria-label="Remove profile picture"
                title="Remove profile picture"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
        <Row label="Full name">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="w-44 bg-[#1A1D24] border border-[#2A2D35] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="text-[11px] text-[#D7261E] hover:text-red-400 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditingName(false); setFullName(currentUser?.profile?.name ?? "") }}
                className="text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#9CA3AF]">{fullName || "—"}</span>
              <button
                onClick={() => setEditingName(true)}
                className="text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </Row>
        <Row label="Email">
          <span className="text-xs text-[#9CA3AF]">{userEmail}</span>
        </Row>
        <Row label="Role">
          <span className="text-xs text-[#9CA3AF] capitalize">{userRole}</span>
        </Row>
      </Section>

      {/* Tenants */}
      <Section icon={Building2} title="Workspaces">
        {tenants.length === 0 ? (
          <div className="px-5 py-4 text-xs text-[#6B7280]">No workspaces found.</div>
        ) : (
          tenants.map((tenant, idx) => {
            const color = TENANT_COLORS[idx % TENANT_COLORS.length]
            const isActive = tenant.id === currentUser?.activeTenantId
            return (
              <div
                key={tenant.id}
                className={cn(
                  "flex items-center justify-between px-5 py-3.5 border-b border-[#2A2D35] last:border-0"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-xs font-medium text-white">{tenant.name}</p>
                    <p className="text-[10px] text-[#6B7280] capitalize">{tenant.type} · {tenant.role}</p>
                  </div>
                </div>
                {isActive ? (
                  <span className="text-[10px] text-[#D7261E] font-medium">Active</span>
                ) : (
                  <button
                    onClick={() => currentUser?.setActiveTenantId(tenant.id)}
                    className="text-[10px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
                  >
                    Switch
                  </button>
                )}
              </div>
            )
          })
        )}
      </Section>

      {/* AI Mode */}
      <Section icon={Cpu} title="AI Defaults">
        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-[#6B7280] mb-2">Default AI mode for new tasks</p>
          {AI_MODES.map((mode) => (
            <label key={mode} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="ai-mode"
                value={mode}
                checked={aiMode === mode}
                onChange={() => setAiMode(mode)}
                className="mt-0.5 accent-[#D7261E]"
              />
              <div>
                <p className="text-xs text-[#9CA3AF] font-mono">{mode}</p>
                {mode === "AI_EXECUTE" && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-yellow-950/40 border border-yellow-900/40">
                    <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" strokeWidth={1.75} />
                    <p className="text-[10px] text-yellow-500">Runs without confirmation. Use with caution.</p>
                  </div>
                )}
              </div>
            </label>
          ))}
          <button
            onClick={() => toast.success("Defaults saved.")}
            className="mt-2 px-3 py-1.5 rounded-lg bg-[#D7261E] hover:bg-red-600 text-white text-xs font-medium transition-colors"
          >
            Save defaults
          </button>
        </div>
      </Section>

      {/* Integrations */}
      <Section icon={Plug} title="Integrations">
        {INTEGRATIONS.map((int) => (
          <Row key={int.name} label={int.name}>
            <span className={cn(
              "flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border",
              int.connected
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
                : "bg-[#1A1D24] text-[#6B7280] border-[#2A2D35]"
            )}>
              {int.connected
                ? <CheckCircle className="w-3 h-3" strokeWidth={1.75} />
                : <XCircle className="w-3 h-3" strokeWidth={1.75} />
              }
              {int.connected ? "Connected" : "Not connected"}
            </span>
          </Row>
        ))}
      </Section>

      {/* Sign out */}
      <Section icon={LogOut} title="Account">
        <div className="px-5 py-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:border-[#9CA3AF]/60 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}
