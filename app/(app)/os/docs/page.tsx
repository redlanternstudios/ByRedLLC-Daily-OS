"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, FileText, Clock, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Doc = {
  id: string
  title: string
  doc_type: string | null
  status: string | null
  created_at: string
  updated_at: string
  linked_task_id: string | null
}

type DocFull = Doc & { content: string | null }

const DOC_TYPE_CLASSES: Record<string, string> = {
  note: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30",
  sop: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
  spec: "bg-violet-500/10 text-violet-400 border border-violet-500/30",
  brief: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function typeTag(type: string | null) {
  const t = type ?? "note"
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider", DOC_TYPE_CLASSES[t] ?? DOC_TYPE_CLASSES.note)}>
      {t}
    </span>
  )
}

export default function OSDocsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<DocFull | null>(null)
  const [editContent, setEditContent] = useState("")
  const [savingContent, setSavingContent] = useState(false)

  // new doc form
  const [title, setTitle] = useState("")
  const [docType, setDocType] = useState("note")
  const [creating, setCreating] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/os/docs")
      .then(r => r.json())
      .then(d => setDocs(d.docs ?? []))
      .catch(() => toast.error("Failed to load docs"))
      .finally(() => setLoading(false))
  }, [])

  async function createDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/os/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), doc_type: docType, status: "draft" }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      setDocs(prev => [data, ...prev])
      setTitle(""); setDocType("note"); setShowNew(false)
      // open the new doc
      setSelected({ ...data, content: null })
      setEditContent("")
      toast.success("Doc created")
    } catch { toast.error("Failed") } finally { setCreating(false) }
  }

  function autoSave(content: string) {
    setEditContent(content)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (!selected) return
      setSavingContent(true)
      fetch("/api/os/docs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, content }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.error) return
          setDocs(prev => prev.map(doc => doc.id === selected.id ? { ...doc, updated_at: d.updated_at } : doc))
        })
        .catch(() => {})
        .finally(() => setSavingContent(false))
    }, 1200)
  }

  if (selected) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> All docs
          </button>
          {savingContent && <span className="text-[10px] text-zinc-600">Saving…</span>}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{selected.title}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            {typeTag(selected.doc_type)}
            <span className="text-[10px] text-zinc-600">Updated {formatDate(selected.updated_at)}</span>
          </div>
        </div>

        <textarea
          value={editContent}
          onChange={e => autoSave(e.target.value)}
          placeholder="Start writing… markdown-style. Use headers, bullets, code blocks."
          className="w-full min-h-[480px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-zinc-700 leading-relaxed font-mono"
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-white tracking-tight">Docs</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{docs.length} {docs.length === 1 ? "document" : "documents"}</p>
        </div>
        <Button size="sm" className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs" onClick={() => setShowNew(v => !v)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New doc
        </Button>
      </div>

      {showNew && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">New document</p>
          <form onSubmit={createDoc} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-zinc-500">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm" placeholder="Q2 SOPs, Project Brief, Meeting Notes…" />
            </div>
            <div className="w-36 space-y-1">
              <Label className="text-xs text-zinc-500">Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {["note", "sop", "spec", "brief"].map(t => (
                    <SelectItem key={t} value={t} className="text-zinc-300 uppercase text-xs tracking-wide">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit" size="sm" disabled={creating} className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs">
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-zinc-500 text-xs" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="text-xs text-zinc-600 py-8 text-center">Loading…</p>}

      {!loading && docs.length === 0 && (
        <p className="text-xs text-zinc-600 py-8 text-center">No documents yet. Create your first SOP, note, or spec above.</p>
      )}

      {!loading && docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <button
              type="button"
              key={doc.id}
              onClick={() => { setSelected(doc as DocFull); setEditContent("") }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-colors text-left group"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{doc.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-zinc-700" />
                  <span className="text-xs text-zinc-600">Updated {formatDate(doc.updated_at)}</span>
                </div>
              </div>
              {typeTag(doc.doc_type)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
