"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, DollarSign } from "lucide-react"
import { isBefore, parseISO, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { TenantPill } from "@/components/byred/tenant-pill"
import type { Lead } from "@/types/db"
import { cn } from "@/lib/utils"

const STAGES: { key: Lead["stage"]; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "QUOTED", label: "Quoted" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
]

function formatCurrency(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  const d = parseISO(dateStr)
  return isValid(d) && isBefore(d, new Date())
}

function LeadCard({ lead }: { lead: Lead }) {
  const overdue = isOverdue(lead.next_follow_up_at)
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="p-3 rounded-md bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer">
        <h3 className="text-xs font-semibold text-[#6B7280] leading-snug mb-2">
          {lead.name}
        </h3>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <TenantPill tenantId={lead.tenant_id} />
          {lead.source && (
            <span className="text-[10px] text-[#9CA3AF] bg-zinc-100 px-1.5 py-0.5 rounded-sm">
              {lead.source}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-mono text-emerald-400">
            <DollarSign className="w-3 h-3" strokeWidth={1.75} />
            {formatCurrency(lead.revenue_potential)}
          </div>
          {lead.next_follow_up_at && (
            <span
              className={cn(
                "text-[10px] font-mono",
                overdue ? "text-byred-red" : "text-[#9CA3AF]"
              )}
            >
              {overdue ? "Overdue" : "Follow up"}{" "}
              {new Date(lead.next_follow_up_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

interface LeadsKanbanProps {
  initialLeads: Lead[]
}

export function LeadsKanban({ initialLeads }: LeadsKanbanProps) {
  const router = useRouter()
  const [leads] = useState<Lead[]>(initialLeads)

  const totalPipeline = leads
    .filter((l) => ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"].includes(l.stage))
    .reduce((sum, l) => sum + (l.revenue_potential ?? 0), 0)

  const wonLeads = leads.filter((l) => l.stage === "WON").length
  const totalClosed = leads.filter((l) =>
    ["WON", "LOST"].includes(l.stage)
  ).length
  const conversionRate =
    totalClosed > 0 ? Math.round((wonLeads / totalClosed) * 100) : 0

  const overdueFollowUps = leads.filter(
    (l) =>
      l.next_follow_up_at &&
      isOverdue(l.next_follow_up_at) &&
      l.stage !== "WON" &&
      l.stage !== "LOST"
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
            Leads
          </h1>
        </div>
        <Button
          className="bg-byred-red hover:bg-byred-red-hot text-white gap-2"
          onClick={() => router.push("/leads/new")}
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          New lead
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p className="text-2xl font-condensed font-bold text-emerald-600">
            {formatCurrency(totalPipeline)}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">Total pipeline</p>
        </div>
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p className="text-2xl font-condensed font-bold text-zinc-800">
            {conversionRate}%
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">Conversion rate</p>
        </div>
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p
            className={cn(
              "text-2xl font-condensed font-bold",
              overdueFollowUps > 0 ? "text-byred-red" : "text-zinc-100"
            )}
          >
            {overdueFollowUps}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">Overdue follow-ups</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex gap-4"
          style={{ minWidth: `${STAGES.length * 296}px` }}
        >
          {STAGES.map(({ key, label }) => {
            const stageLeads = leads.filter((l) => l.stage === key)
            return (
              <div
                key={key}
                className="flex flex-col"
                style={{ minWidth: "280px" }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-condensed font-semibold uppercase tracking-wide text-[#6B7280]">
                      {label}
                    </h3>
                    <span className="text-xs text-[#9CA3AF] font-mono bg-zinc-100 px-1.5 py-0.5 rounded-sm">
                      {stageLeads.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-[#9CA3AF] hover:text-[#6B7280]"
                    onClick={() => router.push("/leads/new")}
                    aria-label={`Add lead to ${label}`}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </Button>
                </div>

                {/* Cards */}
                <div
                  className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 p-2 space-y-2 min-h-[200px]"
                  role="region"
                  aria-label={`${label} column`}
                >
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] text-center py-8">
                      No {label.toLowerCase()} leads.
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
