import type { LucideIcon } from "lucide-react"

export function OSPlaceholderPage({
  icon: Icon,
  title,
  description,
  eta,
}: {
  icon: LucideIcon
  title: string
  description: string
  eta?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#9CA3AF]" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white font-condensed">{title}</h1>
        <p className="text-sm text-[#9CA3AF] mt-1 max-w-sm">{description}</p>
      </div>
      {eta && (
        <span className="text-[11px] font-medium text-[#6B7280] bg-[#1A1D24] border border-[#2A2D35] px-3 py-1.5 rounded-full uppercase tracking-widest">
          Coming Soon
        </span>
      )}
    </div>
  )
}
