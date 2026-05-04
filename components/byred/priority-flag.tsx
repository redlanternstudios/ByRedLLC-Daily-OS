import { cn } from '@/lib/utils'

// Priority colors: red (critical) → orange (high) → yellow (medium) → gray (low)
const PRIORITY_CONFIG: Record<string, { label: string; dotClass: string; textClass: string }> = {
  critical: { label: 'Critical', dotClass: 'bg-red-500',      textClass: 'text-red-400' },
  high:     { label: 'High',     dotClass: 'bg-orange-500',   textClass: 'text-orange-400' },
  medium:   { label: 'Medium',   dotClass: 'bg-yellow-500',   textClass: 'text-yellow-400' },
  low:      { label: 'Low',      dotClass: 'bg-zinc-500',     textClass: 'text-zinc-500' },
}

interface PriorityFlagProps {
  priority: string | null
  className?: string
  showLabel?: boolean
}

export function PriorityFlag({ priority, className, showLabel = false }: PriorityFlagProps) {
  const key = priority?.toLowerCase() ?? 'medium'
  const config = PRIORITY_CONFIG[key] ?? PRIORITY_CONFIG['medium']

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotClass)} />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.textClass)}>{config.label}</span>
      )}
    </span>
  )
}
