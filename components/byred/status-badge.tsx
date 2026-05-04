import { cn } from '@/lib/utils'

// Status — street light: gray (not started) → yellow (in progress/caution) → red (blocked/overdue) → green (done)
const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  not_started:  { label: 'Not Started', classes: 'bg-zinc-800 text-zinc-400 border border-zinc-700' },
  in_progress:  { label: 'In Progress', classes: 'bg-yellow-950 text-yellow-300 border border-yellow-800' },
  overdue:      { label: 'Overdue',     classes: 'bg-red-950 text-red-300 border border-red-800' },
  done:         { label: 'Done',        classes: 'bg-green-950 text-green-300 border border-green-800' },
  blocked:      { label: 'Blocked',     classes: 'bg-red-950 text-red-300 border border-red-800' },
  cancelled:    { label: 'Cancelled',   classes: 'bg-zinc-900 text-zinc-500 border border-zinc-800 line-through' },
}

interface StatusBadgeProps {
  status: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase() ?? 'not_started'
  const config = STATUS_CONFIG[key] ?? { label: status ?? '—', classes: 'bg-zinc-100 text-zinc-500' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
