import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { GitBranch, Link2, MessageSquare, User } from 'lucide-react'
import { TenantPill } from './tenant-pill'
import type { Activity } from '@/types/db'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  stage_change: GitBranch,
  lead_link: Link2,
  note: MessageSquare,
  reassign: User,
}

interface ActivityItemProps {
  activity: Activity
  showObject?: boolean
}

export function ActivityItem({ activity, showObject = true }: ActivityItemProps) {
  const Icon = TYPE_ICONS[activity.type] ?? MessageSquare
  const relativeTime = formatDistanceToNow(parseISO(activity.created_at ?? new Date().toISOString()), { addSuffix: true })

  const objectHref = activity.object_type === 'task'
    ? `/tasks/${activity.object_id}`
    : `/leads/${activity.object_id}`

  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <TenantPill tenantId={activity.tenant_id} />
          <span className="text-xs text-[#9CA3AF] font-mono">{activity.type}</span>
        </div>
        {activity.summary && (
          <p className="text-sm text-[#6B7280] mt-1">{activity.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#9CA3AF]">{relativeTime}</span>
          {showObject && (
            <Link href={objectHref} className="text-xs text-[#9CA3AF] hover:text-[#6B7280] underline-offset-2 hover:underline">
              View {activity.object_type}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
