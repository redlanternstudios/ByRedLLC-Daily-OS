"use client"

import { useState, useEffect } from "react"
import { Plus, Building2, User, Phone, Mail, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Company = {
  id: string
  name: string
  industry: string | null
  website: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type Contact = {
  id: string
  company_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  status: string | null
  created_at: string
  os_companies: { name: string } | null
}

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border border-green-500/30",
  prospect: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
  inactive: "bg-zinc-500/10 text-[#9CA3AF] border border-zinc-500/30",
  churned: "bg-[#D7261E]/10 text-[#D7261E] border border-[#D7261E]/30",
}

function statusBadge(status: string | null) {
  const s = status ?? "active"
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded capitalize", STATUS_CLASSES[s] ?? STATUS_CLASSES.inactive)}>
      {s}
    </span>
  )
}

export default function OSCRMPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [tab, setTab] = useState<"companies" | "contacts">("companies")
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [loading, setLoading] = useState(true)

  // company form
  const [cName, setCName] = useState("")
  const [cIndustry, setCIndustry] = useState("")
  const [cWebsite, setCWebsite] = useState("")
  const [cStatus, setCStatus] = useState("active")
  const [cSaving, setCSaving] = useState(false)

  // contact form
  const [ctName, setCtName] = useState("")
  const [ctEmail, setCtEmail] = useState("")
  const [ctPhone, setCtPhone] = useState("")
  const [ctRole, setCtRole] = useState("")
  const [ctCompany, setCtCompany] = useState("")
  const [ctStatus, setCtStatus] = useState("active")
  const [ctSaving, setCtSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/os/crm/companies").then(r => r.json()),
      fetch("/api/os/crm/contacts").then(r => r.json()),
    ]).then(([cd, ct]) => {
      setCompanies(cd.companies ?? [])
      setContacts(ct.contacts ?? [])
    }).catch(() => toast.error("Failed to load CRM data")).finally(() => setLoading(false))
  }, [])

  async function addCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!cName.trim()) return
    setCSaving(true)
    try {
      const res = await fetch("/api/os/crm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName.trim(), industry: cIndustry || null, website: cWebsite || null, status: cStatus }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      setCompanies(prev => [data, ...prev])
      setCName(""); setCIndustry(""); setCWebsite(""); setCStatus("active")
      setShowAddCompany(false)
      toast.success("Company added")
    } catch { toast.error("Failed") } finally { setCSaving(false) }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!ctName.trim()) return
    setCtSaving(true)
    try {
      const res = await fetch("/api/os/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ctName.trim(), email: ctEmail || null, phone: ctPhone || null,
          role: ctRole || null, company_id: ctCompany || null, status: ctStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      // re-fetch contacts to get joined company name
      const ct = await fetch("/api/os/crm/contacts").then(r => r.json())
      setContacts(ct.contacts ?? [])
      setCtName(""); setCtEmail(""); setCtPhone(""); setCtRole(""); setCtCompany(""); setCtStatus("active")
      setShowAddContact(false)
      toast.success("Contact added")
    } catch { toast.error("Failed") } finally { setCtSaving(false) }
  }

  const visibleContacts = selectedCompany
    ? contacts.filter(c => c.company_id === selectedCompany.id)
    : contacts

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-white tracking-tight">CRM</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {companies.length} {companies.length === 1 ? "company" : "companies"} · {contacts.length} contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:border-[#2A2D35] text-xs" onClick={() => { setShowAddContact(true); setShowAddCompany(false) }}>
            <User className="w-3.5 h-3.5 mr-1.5" /> Add contact
          </Button>
          <Button size="sm" className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs" onClick={() => { setShowAddCompany(true); setShowAddContact(false) }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add company
          </Button>
        </div>
      </div>

      {/* Add company form */}
      {showAddCompany && (
        <div className="bg-[#111318] border border-[#2A2D35] rounded-lg p-4">
          <p className="text-xs font-semibold text-[#9CA3AF] mb-3 uppercase tracking-wider">New company</p>
          <form onSubmit={addCompany} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Name *</Label>
              <Input value={cName} onChange={e => setCName(e.target.value)} required className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="Acme Corp" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Industry</Label>
              <Input value={cIndustry} onChange={e => setCIndustry(e.target.value)} className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="Technology" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Website</Label>
              <Input value={cWebsite} onChange={e => setCWebsite(e.target.value)} className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="https://acme.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Status</Label>
              <Select value={cStatus} onValueChange={setCStatus}>
                <SelectTrigger className="bg-[#1A1D24] border-[#2A2D35] text-[#9CA3AF] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111318] border-[#2A2D35]">
                  {["active", "prospect", "inactive", "churned"].map(s => (
                    <SelectItem key={s} value={s} className="text-[#9CA3AF] capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={cSaving} className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs">
                {cSaving ? "Saving…" : "Save company"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-[#9CA3AF] text-xs" onClick={() => setShowAddCompany(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Add contact form */}
      {showAddContact && (
        <div className="bg-[#111318] border border-[#2A2D35] rounded-lg p-4">
          <p className="text-xs font-semibold text-[#9CA3AF] mb-3 uppercase tracking-wider">New contact</p>
          <form onSubmit={addContact} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Name *</Label>
              <Input value={ctName} onChange={e => setCtName(e.target.value)} required className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="Jane Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Email</Label>
              <Input type="email" value={ctEmail} onChange={e => setCtEmail(e.target.value)} className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="jane@acme.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Phone</Label>
              <Input value={ctPhone} onChange={e => setCtPhone(e.target.value)} className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="+1 555 0100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Role</Label>
              <Input value={ctRole} onChange={e => setCtRole(e.target.value)} className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="CEO" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Company</Label>
              <Select value={ctCompany} onValueChange={setCtCompany}>
                <SelectTrigger className="bg-[#1A1D24] border-[#2A2D35] text-[#9CA3AF] text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-[#111318] border-[#2A2D35]">
                  <SelectItem value="" className="text-[#9CA3AF]">None</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-[#9CA3AF]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Status</Label>
              <Select value={ctStatus} onValueChange={setCtStatus}>
                <SelectTrigger className="bg-[#1A1D24] border-[#2A2D35] text-[#9CA3AF] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111318] border-[#2A2D35]">
                  {["active", "prospect", "inactive"].map(s => (
                    <SelectItem key={s} value={s} className="text-[#9CA3AF] capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={ctSaving} className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs">
                {ctSaving ? "Saving…" : "Save contact"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-[#9CA3AF] text-xs" onClick={() => setShowAddContact(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2D35] pb-0">
        {(["companies", "contacts"] as const).map(t => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "text-xs font-medium px-3 py-2 capitalize border-b-2 -mb-px transition-colors",
              tab === t ? "border-[#D7261E] text-white" : "border-transparent text-[#9CA3AF] hover:text-[#9CA3AF]"
            )}
          >
            {t} {t === "companies" ? `(${companies.length})` : `(${contacts.length})`}
          </button>
        ))}
        {selectedCompany && tab === "contacts" && (
          <span className="ml-auto flex items-center gap-1 text-xs text-[#9CA3AF] pb-2">
            <span className="text-[#9CA3AF]">{selectedCompany.name}</span>
            <button type="button" onClick={() => setSelectedCompany(null)} className="text-[#6B7280] hover:text-[#9CA3AF] ml-1">✕</button>
          </span>
        )}
      </div>

      {loading && <p className="text-xs text-[#6B7280] py-8 text-center">Loading…</p>}

      {/* Companies list */}
      {!loading && tab === "companies" && (
        <div className="space-y-1.5">
          {companies.length === 0 && (
            <p className="text-xs text-[#6B7280] py-8 text-center">No companies yet. Add your first client above.</p>
          )}
          {companies.map(co => (
            <div
              key={co.id}
              className="bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#2A2D35] transition-colors cursor-pointer group"
              onClick={() => { setSelectedCompany(co); setTab("contacts") }}
            >
              <div className="w-7 h-7 rounded-md bg-[#1A1D24] flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{co.name}</p>
                <p className="text-xs text-[#6B7280] truncate">{co.industry ?? "—"}{co.website ? ` · ${co.website}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(co.status)}
                <ChevronRight className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contacts list */}
      {!loading && tab === "contacts" && (
        <div className="space-y-1.5">
          {visibleContacts.length === 0 && (
            <p className="text-xs text-[#6B7280] py-8 text-center">
              {selectedCompany ? `No contacts for ${selectedCompany.name}.` : "No contacts yet."}
            </p>
          )}
          {visibleContacts.map(ct => (
            <div key={ct.id} className="bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#2A2D35] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#D7261E]/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#D7261E]">
                {ct.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{ct.name}</p>
                  {ct.role && <span className="text-[10px] text-[#6B7280]">{ct.role}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {ct.email && (
                    <a href={`mailto:${ct.email}`} className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#9CA3AF] transition-colors">
                      <Mail className="w-3 h-3" />{ct.email}
                    </a>
                  )}
                  {ct.phone && (
                    <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                      <Phone className="w-3 h-3" />{ct.phone}
                    </span>
                  )}
                  {ct.os_companies && (
                    <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                      <Building2 className="w-3 h-3" />{ct.os_companies.name}
                    </span>
                  )}
                </div>
              </div>
              {statusBadge(ct.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
