"use client"

import { useState, useEffect } from "react"
import { FolderOpen, FileText, Image, FileCode, Download, Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type OsFile = {
  id: string
  file_name: string
  file_type: string | null
  mime_type: string | null
  storage_provider: string | null
  external_url: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
  byred_users: { name: string } | null
}

function fileIcon(mimeType: string | null) {
  if (!mimeType) return <FileText className="w-4 h-4 text-zinc-500" />
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-sky-400" />
  if (mimeType.includes("pdf")) return <FileText className="w-4 h-4 text-[#D7261E]" />
  if (mimeType.includes("code") || mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript")) {
    return <FileCode className="w-4 h-4 text-violet-400" />
  }
  return <FileText className="w-4 h-4 text-zinc-500" />
}

function formatBytes(type: string | null) {
  if (!type) return ""
  return type.split("/").pop()?.toUpperCase() ?? ""
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const ENTITY_LABEL: Record<string, string> = {
  task: "Tasks",
  company: "Companies",
  contact: "Contacts",
  doc: "Docs",
  message: "Messages",
}

export default function OSFilesPage() {
  const [files, setFiles] = useState<OsFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/os/files")
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .catch(() => toast.error("Failed to load files"))
      .finally(() => setLoading(false))
  }, [])

  const entityTypes = ["all", ...Array.from(new Set(files.map(f => f.entity_type ?? "other")))]

  const filtered = files.filter(f => {
    const matchSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase())
    const matchEntity = entityFilter === "all" || f.entity_type === entityFilter
    return matchSearch && matchEntity
  })

  const grouped = filtered.reduce<Record<string, OsFile[]>>((acc, f) => {
    const key = f.entity_type ?? "other"
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-white tracking-tight">Files</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{files.length} {files.length === 1 ? "file" : "files"} across all projects</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm pl-8 placeholder:text-zinc-700"
          />
        </div>
        <div className="flex gap-1">
          {entityTypes.map(et => (
            <button
              type="button"
              key={et}
              onClick={() => setEntityFilter(et)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-colors",
                entityFilter === et
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {et === "all" ? "All" : (ENTITY_LABEL[et] ?? et)}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-xs text-zinc-600 py-8 text-center">Loading…</p>}

      {!loading && files.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">No files yet</p>
            <p className="text-xs text-zinc-600 mt-1">Files attached to tasks, contacts, and docs will appear here.</p>
          </div>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([entity, entityFiles]) => (
        <div key={entity} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-1">
            {ENTITY_LABEL[entity] ?? entity} ({entityFiles.length})
          </p>
          {entityFiles.map(f => (
            <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-colors">
              <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                {fileIcon(f.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{f.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {f.mime_type && <span className="text-[10px] text-zinc-600">{formatBytes(f.mime_type)}</span>}
                  <span className="text-[10px] text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-600">{formatDate(f.created_at)}</span>
                  {f.byred_users && <span className="text-[10px] text-zinc-700">· {f.byred_users.name}</span>}
                </div>
              </div>
              {f.external_url && (
                <a
                  href={f.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                </a>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
