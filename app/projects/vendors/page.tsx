import Link from "next/link"

const sections = [
  {
    title: "Vendor States",
    items: ["Proposed", "Verified", "Active", "Degraded", "Quarantined", "Paused", "Removed"],
  },
  {
    title: "Source Channels",
    items: ["Telegram", "Email", "RSS", "Direct web capture", "Partner submission", "Manual operator curation"],
  },
  {
    title: "Required Vendor Fields",
    items: [
      "Provider name",
      "Channel type",
      "Primary contact",
      "Source URLs",
      "Trust score",
      "Last verified time",
      "Failure reason",
      "Approval owner",
    ],
  },
  {
    title: "Gate Rules",
    items: [
      "No hallucinated items",
      "Reachable source required",
      "Deduplication required",
      "Manual review for weak evidence",
      "Halal or haram stamp required",
      "Bundle approval required",
    ],
  },
]

export default function VendorsPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">By Red OS</p>
            <h1 className="mt-2 text-4xl font-semibold">Sourcing vendors and channels</h1>
            <p className="mt-2 max-w-3xl text-zinc-400">
              The Lantern Daily intake layer for trusted providers, channels, and the gates required before any item can
              become part of the next release bundle.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
              Task board
            </Link>
            <Link href="/projects/plan" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
              Project plan
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {section.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
