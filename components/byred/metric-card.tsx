import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  count: number
  icon: LucideIcon
  iconColor: string
  href?: string
  className?: string
}

export function MetricCard({ label, count, icon: Icon, iconColor, href, className }: MetricCardProps) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-md bg-[#111318] border border-[#2A2D35] transition-colors shadow-sm',
        href && 'hover:border-[#2A2D35]/80 hover:bg-[#1A1D24] cursor-pointer',
        className
      )}
    >
      <div className={cn('p-2 rounded-md bg-[#1A1D24]', iconColor)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-condensed font-bold text-white leading-none">{count}</p>
        <p className="text-xs text-[#9CA3AF] mt-1">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}
