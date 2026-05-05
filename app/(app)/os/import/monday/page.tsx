"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ImportBatch = {
  id: string
  source: "monday" | "csv" | "notion"
  status: "pending" | "processing" | "completed" | "failed"
  total_rows: number
  imported_rows: number
  failed_rows: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_ICONS = {
  completed: CheckCircle2,
  failed: XCircle,
  processing: Loader2,
  pending: Clock,
}

// Status colors: gray (pending) → yellow (processing) → red (failed) → green (completed)
const STATUS_COLORS = {
  completed: "text-green-400",
  failed: "text-red-400",
  processing: "text-yellow-400",
  pending: "text-zinc-400",
}

export default function OSImportMondayPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const { data, mutate } = useSWR<{ batches: ImportBatch[] }>(
    "/api/os/import/batches",
    fetcher,
    { refreshInterval: isSyncing ? 2000 : 0 }
  )
  const batches = data?.batches ?? []
  const latest = batches[0]

  async function handleSync() {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch("/api/sync/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const json = await res.json()
      if (res.ok) {
        setLastSynced(new Date().toLocaleTimeString())
        mutate()
      } else {
        setSyncError(json.error ?? "Sync failed")
      }
    } catch {
      setSyncError("Network error. Try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">
            Monday.com Import
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sync tasks from Monday.com boards into By Red OS
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isSyncing
              ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
              : "bg-[#D7261E] text-white hover:bg-[#B51E18]"
          )}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          ) : (
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
          )}
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {lastSynced && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-950/40 border border-green-800/40">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" strokeWidth={2} />
          <span className="text-sm text-green-300">Sync completed at {lastSynced}</span>
        </div>
      )}

      {syncError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" strokeWidth={2} />
          <span className="text-sm text-red-300">{syncError}</span>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Last Batch", value: latest?.total_rows ?? 0, suffix: "items" },
          { label: "Imported",   value: latest?.imported_rows ?? 0, suffix: "success" },
          { label: "Failed",     value: latest?.failed_rows ?? 0, suffix: "errors" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-2xl font-bold text-white font-condensed">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-zinc-700 mt-0.5">{stat.suffix}</p>
          </div>
        ))}
      </div>

      {/* Import batches */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
          <Upload className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-white">Import History</span>
          <span className="ml-auto text-[11px] text-zinc-600">{batches.length} records</span>
        </div>

        {batches.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-600">
            No import history yet. Run a sync to get started.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {batches.map((batch) => {
              const Icon = STATUS_ICONS[batch.status] ?? Clock
              const colorClass = STATUS_COLORS[batch.status] ?? "text-zinc-400"
              const pct = batch.total_rows > 0
                ? Math.round((batch.imported_rows / batch.total_rows) * 100)
                : 0

              return (
                <div key={batch.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn("w-4 h-4 shrink-0", colorClass, batch.status === "processing" && "animate-spin")}
                        strokeWidth={1.75}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 capitalize">
                            {batch.source}
                          </span>
                          <span className={cn("text-[10px] font-medium capitalize", colorClass)}>
                            {batch.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          Started {new Date(batch.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-zinc-300">
                        {batch.imported_rows}/{batch.total_rows}
                      </p>
                      {batch.failed_rows > 0 && (
                        <p className="text-xs text-red-400 flex items-center gap-1 justify-end">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          {batch.failed_rows} failed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          batch.status === "completed" ? "bg-green-500" :
                          batch.status === "failed" ? "bg-red-500" : "bg-yellow-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {batch.error_message && (
                    <p className="mt-2 text-[11px] text-red-400 bg-red-950/30 rounded px-2 py-1 truncate">
                      {batch.error_message}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Info footer */}
        <div className="px-5 py-3 bg-black/20 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            Webhook at <span className="font-mono text-zinc-500">/api/webhooks/monday</span>
          </p>
          <a
            href="/api/sync/monday"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            target="_blank"
          >
            API endpoint <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
