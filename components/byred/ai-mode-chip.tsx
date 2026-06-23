import { cn } from '@/lib/utils'

const AI_MODE_CONFIG: Record<string, { label: string; classes: string }> = {
  HUMAN_ONLY: { label: 'Human',   classes: 'bg-[#1A1D24] text-[#9CA3AF]' },
  AI_ASSIST:  { label: 'Assist',  classes: 'bg-sky-500/10 text-sky-400' },
  AI_DRAFT:   { label: 'Draft',   classes: 'bg-amber-500/10 text-amber-400' },
  AI_EXECUTE: { label: 'Execute', classes: 'bg-emerald-500/10 text-emerald-400' },
}

interface AiModeChipProps {
  mode: string | null
  className?: string
}

export function AiModeChip({ mode, className }: AiModeChipProps) {
  if (!mode) return null
  const config = AI_MODE_CONFIG[mode] ?? { label: mode, classes: 'bg-[#1A1D24] text-[#9CA3AF]' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium font-mono',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
