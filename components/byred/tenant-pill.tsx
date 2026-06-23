import { cn } from '@/lib/utils'
import { TENANT_COLORS, TENANT_NAMES } from '@/lib/tenant-colors'

interface TenantPillProps {
  tenantId: string
  className?: string
}

export function TenantPill({ tenantId, className }: TenantPillProps) {
  const colors = TENANT_COLORS[tenantId] ?? {
    bg: 'bg-[#1A1D24]',
    text: 'text-[#9CA3AF]',
    dot: 'bg-zinc-400',
  }
  const name = TENANT_NAMES[tenantId] ?? tenantId

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} />
      {name}
    </span>
  )
}
