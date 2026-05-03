import { format } from 'date-fns'
import { Flame, DollarSign, Zap, Calendar, Brain, AlertTriangle } from 'lucide-react'
import { getTasksForToday } from '@/lib/data/tasks'
import { getDailyBriefForSession } from '@/lib/data/daily-briefs'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import Link from 'next/link'
import type { Task } from '@/types/db'

const BUCKETS: {
  key: string
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>
  color: string
  filter: (t: Task) => boolean
}[] = [
  {
    key: 'critical_now',
    label: 'Critical Now',
    icon: Flame,
    color: '#D7261E',
    filter: (t) =>
      t.priority === 'critical' &&
      (t.status === 'in_progress' || t.status === 'overdue'),
  },
  {
    key: 'money_moves',
    label: 'Money Moves',
    icon: DollarSign,
    color: '#22C55E',
    filter: (t) => t.revenue_impact_score >= 7,
  },
  {
    key: 'quick_wins',
    label: 'Quick Wins',
    icon: Zap,
    color: '#38BDF8',
    filter: (t) => t.estimated_minutes <= 30,
  },
  {
    key: 'coming_up',
    label: 'Coming Up',
    icon: Calendar,
    color: '#A1A1AA',
    filter: (t) => {
      const today = new Date().toISOString().split('T')[0]
      return !!(t.due_date && t.due_date > today)
    },
  },
  {
    key: 'deep_work',
    label: 'Deep Work',
    icon: Brain,
    color: '#F59E0B',
    filter: (t) => t.estimated_minutes >= 60,
  },
]

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 6,
        background: '#111112',
        border: '1px solid rgba(255,255,255,0.07)',
        marginBottom: 6,
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#FAFAFA',
          lineHeight: 1.45,
          marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.title}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, color: '#71717A', fontFamily: 'monospace' }}>
          {formatMinutes(task.estimated_minutes)}
        </span>
        <Link
          href={`/os/tasks/${task.id}`}
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#D7261E',
            textDecoration: 'none',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          Do now →
        </Link>
      </div>
    </div>
  )
}

export default async function OsTodayPage() {
  const { profileId } = await requireTenantScope()
  const [tasks, brief] = await Promise.all([
    getTasksForToday({ ownerId: profileId }),
    getDailyBriefForSession(),
  ])

  const todayStr = format(new Date(), 'EEEE, MMMM d')

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#FAFAFA',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          Today{' '}
          <span style={{ fontWeight: 400, color: '#52525B', fontSize: 18 }}>
            · {todayStr}
          </span>
        </h1>
        <p style={{ fontSize: 12, color: '#71717A' }}>{brief.summary.headline}</p>
      </div>

      {/* Daily Brief card */}
      <div
        style={{
          background: '#18181B',
          border: '1px solid rgba(215,38,30,0.2)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#52525B',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Daily Brief
        </p>

        {brief.summary.top_3.length > 0 ? (
          <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
            {brief.summary.top_3.map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 13,
                  color: '#D4D4D8',
                  marginBottom: 6,
                }}
              >
                <span style={{ color: '#D7261E', fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                {typeof item === 'string' ? item : item.title}
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ fontSize: 13, color: '#52525B', marginBottom: 12 }}>
            No priority tasks identified yet.
          </p>
        )}

        {brief.summary.warnings.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {brief.summary.warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <AlertTriangle
                  style={{ width: 13, height: 13, color: '#F59E0B', flexShrink: 0, marginTop: 1 }}
                  strokeWidth={1.75}
                />
                <p style={{ fontSize: 11, color: '#D97706' }}>{w}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 2,
              color: '#52525B',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Next Action
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>
            {brief.summary.next_action}
          </p>
        </div>
      </div>

      {/* 5-bucket grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
        }}
      >
        {BUCKETS.map(({ key, label, icon: Icon, color, filter }) => {
          const bucketTasks = tasks.filter(filter)
          return (
            <div
              key={key}
              style={{
                background: '#18181B',
                border: `1px solid ${color}22`,
                borderRadius: 8,
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon style={{ width: 13, height: 13, color }} strokeWidth={1.75} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      color,
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#52525B', fontFamily: 'monospace' }}>
                  {bucketTasks.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 500 }}>
                {bucketTasks.length === 0 ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#3F3F46',
                      textAlign: 'center',
                      paddingTop: 24,
                    }}
                  >
                    None.
                  </p>
                ) : (
                  bucketTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
