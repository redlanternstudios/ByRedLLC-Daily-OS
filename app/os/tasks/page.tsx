import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'
import { mapTaskFromDb, type Task } from '@/types/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type SearchParams = Promise<{
  tenant_id?: string
  status?: string
  view?: string
  owner_id?: string
}>

type ActiveUser = { id: string; name: string; avatar_url: string | null }
type TenantRow = { id: string; name: string; color: string | null }

// ─── Priority ────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  not_started: { bg: 'rgba(255,255,255,0.06)', color: '#71717A' },
  in_progress:  { bg: 'rgba(56,189,248,0.10)', color: '#38BDF8' },
  done:         { bg: 'rgba(34,197,94,0.10)',  color: '#22C55E' },
  blocked:      { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  cancelled:    { bg: 'rgba(255,255,255,0.04)', color: '#3F3F46' },
  overdue:      { bg: 'rgba(215,38,30,0.12)',  color: '#D7261E' },
}

// ─── Weekly bucket logic ──────────────────────────────────────────────────────

type Bucket = {
  key: string
  label: string
  sublabel: string
  tasks: Task[]
  isOverdue: boolean
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDateStr(s: string): Date {
  // parse YYYY-MM-DD in local time (avoid UTC offset shifting the day)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function buildWeeklyBuckets(tasks: Task[]): Bucket[] {
  const now = new Date()
  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()
  const today = new Date(todayY, todayM, todayD)

  const todayStr = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  // Days remaining in this week after tomorrow (up to 6 days ahead total)
  const weekDays: { date: Date; str: string }[] = []
  for (let i = 2; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    weekDays.push({ date: d, str })
  }

  const bucketMap: Record<string, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
    no_date: [],
  }
  for (const wd of weekDays) {
    bucketMap[wd.str] = []
  }

  for (const task of tasks) {
    const due = task.due_date
    const done = task.status === 'done' || task.status === 'cancelled'

    if (!due) {
      bucketMap['no_date'].push(task)
    } else if (due < todayStr && !done) {
      bucketMap['overdue'].push(task)
    } else if (due < todayStr && done) {
      // done tasks past due go to no_date rather than overdue
      bucketMap['no_date'].push(task)
    } else if (due === todayStr) {
      bucketMap['today'].push(task)
    } else if (due === tomorrowStr) {
      bucketMap['tomorrow'].push(task)
    } else {
      const weekDay = weekDays.find((wd) => wd.str === due)
      if (weekDay) {
        bucketMap[due].push(task)
      } else {
        bucketMap['later'].push(task)
      }
    }
  }

  const result: Bucket[] = []

  if (bucketMap['overdue'].length > 0) {
    result.push({ key: 'overdue', label: 'Overdue', sublabel: '', tasks: bucketMap['overdue'], isOverdue: true })
  }

  if (bucketMap['today'].length > 0) {
    result.push({ key: 'today', label: 'Today', sublabel: fmtShort(today), tasks: bucketMap['today'], isOverdue: false })
  }

  if (bucketMap['tomorrow'].length > 0) {
    result.push({ key: 'tomorrow', label: 'Tomorrow', sublabel: fmtShort(tomorrow), tasks: bucketMap['tomorrow'], isOverdue: false })
  }

  for (const wd of weekDays) {
    const t = bucketMap[wd.str]
    if (t.length > 0) {
      result.push({ key: wd.str, label: WEEKDAYS[wd.date.getDay()], sublabel: fmtShort(wd.date), tasks: t, isOverdue: false })
    }
  }

  if (bucketMap['later'].length > 0) {
    result.push({ key: 'later', label: 'Later', sublabel: '', tasks: bucketMap['later'], isOverdue: false })
  }

  if (bucketMap['no_date'].length > 0) {
    result.push({ key: 'no_date', label: 'No Date', sublabel: '', tasks: bucketMap['no_date'], isOverdue: false })
  }

  return result
}

// ─── Initials helper ─────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Sub-components (server) ──────────────────────────────────────────────────

function StatusPill({ status }: { status: string | null }) {
  const s = status ?? 'not_started'
  const style = STATUS_STYLE[s] ?? STATUS_STYLE['not_started']
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 3,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {STATUS_LABEL[s] ?? s}
    </span>
  )
}

function OwnerAvatar({ userId, directory }: { userId: string | null; directory: ActiveUser[] }) {
  if (!userId) return <span style={{ width: 20 }} />
  const user = directory.find((u) => u.id === userId)
  if (!user) return <span style={{ width: 20 }} />
  return (
    <span
      title={user.name}
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#3F3F46',
        color: '#A1A1AA',
        fontSize: 8,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials(user.name)}
    </span>
  )
}

function TaskRow({ task, directory }: { task: Task; directory: ActiveUser[] }) {
  const dot = PRIORITY_DOT[task.priority ?? ''] ?? '#3F3F46'
  return (
    <Link
      href={`/os/tasks/${task.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="os-task-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '8px 1fr auto auto 20px',
          alignItems: 'center',
          gap: 10,
          padding: '9px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer',
        }}
      >
        {/* Priority dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
        {/* Title */}
        <span
          style={{
            fontSize: 12,
            color: task.status === 'done' ? '#52525B' : '#D4D4D8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
        {/* Status */}
        <StatusPill status={task.status} />
        {/* Owner */}
        <OwnerAvatar userId={task.owner_user_id} directory={directory} />
        {/* Arrow */}
        <span style={{ fontSize: 10, color: '#3F3F46' }}>›</span>
      </div>
    </Link>
  )
}

function BucketSection({
  bucket,
  directory,
}: {
  bucket: Bucket
  directory: ActiveUser[]
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Day header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          paddingLeft: 2,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: bucket.isOverdue ? '#D7261E' : '#52525B',
          }}
        >
          {bucket.label}
        </span>
        {bucket.sublabel && (
          <span style={{ fontSize: 10, color: '#3F3F46' }}>· {bucket.sublabel}</span>
        )}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 99,
            background: bucket.isOverdue ? 'rgba(215,38,30,0.12)' : 'rgba(255,255,255,0.06)',
            color: bucket.isOverdue ? '#D7261E' : '#52525B',
            marginLeft: 2,
          }}
        >
          {bucket.tasks.length}
        </span>
      </div>

      {/* Task rows */}
      <div
        style={{
          background: '#18181B',
          border: `1px solid ${bucket.isOverdue ? 'rgba(215,38,30,0.2)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {bucket.tasks.map((task) => (
          <TaskRow key={task.id} task={task} directory={directory} />
        ))}
      </div>
    </div>
  )
}

// ─── Filter link helpers ──────────────────────────────────────────────────────

function buildHref(base: Record<string, string | undefined>, override: Record<string, string | undefined>): string {
  const merged = { ...base, ...override }
  const params = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&')
  return `/os/tasks${params ? `?${params}` : ''}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OsTasksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const selectedTenantId = params.tenant_id?.trim() || undefined
  const statusParam = params.status?.trim() || undefined
  const viewParam = params.view?.trim() || undefined
  const ownerIdParam = params.owner_id?.trim() || undefined

  const { tenantIds, profileId } = await requireTenantScope()
  if (selectedTenantId && !tenantIds.includes(selectedTenantId)) notFound()
  if (tenantIds.length === 0) {
    return (
      <div style={{ padding: '80px 28px', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
        No tenant access.
      </div>
    )
  }

  const supabase = await createClient()

  // Resolve owner filter
  const resolvedOwnerId =
    viewParam === 'mine' && profileId
      ? profileId
      : ownerIdParam || undefined

  // Fetch tasks + users + tenants in parallel
  const [tasksResult, usersResult, tenantsResult] = await Promise.all([
    (async () => {
      let q = supabase
        .from('byred_tasks')
        .select('*')
        .in('tenant_id', selectedTenantId ? [selectedTenantId] : tenantIds)
        .is('archived_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('revenue_impact_score', { ascending: false })
        .order('urgency_score', { ascending: false })
        .limit(300)

      if (resolvedOwnerId) q = q.eq('owner_user_id', resolvedOwnerId)
      if (statusParam && statusParam !== 'all') q = q.eq('status', statusParam)

      return q
    })(),
    supabase
      .from('byred_users')
      .select('id,name,avatar_url')
      .eq('active', true)
      .order('name', { ascending: true }),
    tenantIds.length > 1
      ? supabase
          .from('byred_tenants')
          .select('id,name,color')
          .in('id', tenantIds)
          .eq('active', true)
          .order('name', { ascending: true })
      : Promise.resolve({ data: [] as TenantRow[] }),
  ])

  const tasks: Task[] = (tasksResult.data ?? []).map(mapTaskFromDb)
  const directory: ActiveUser[] = (usersResult.data ?? []) as ActiveUser[]
  const tenantTabs: TenantRow[] = (tenantsResult.data ?? []) as TenantRow[]

  const buckets = buildWeeklyBuckets(tasks)

  // Active filter state helpers
  const baseParams = {
    tenant_id: selectedTenantId,
    status: statusParam,
    view: viewParam,
    owner_id: ownerIdParam,
  }

  const isMine = viewParam === 'mine'
  const isOwner = (uid: string) => ownerIdParam === uid && !isMine
  const isAllOwner = !isMine && !ownerIdParam

  const STATUSES = [
    { key: undefined, label: 'All' },
    { key: 'not_started', label: 'Not Started' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div style={{ padding: '28px 28px 64px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
            Tasks
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {isMine ? ' · My tasks' : ownerIdParam ? ` · ${directory.find(u => u.id === ownerIdParam)?.name ?? 'Filtered'}` : ' · All team'}
            {selectedTenantId ? ` · ${tenantTabs.find(t => t.id === selectedTenantId)?.name ?? ''}` : ''}
          </p>
        </div>
        <Link
          href="/os/tasks/new"
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            color: '#FAFAFA', background: '#D7261E', padding: '0 16px', height: 32,
            display: 'inline-flex', alignItems: 'center', borderRadius: 4, textDecoration: 'none', gap: 5,
          }}
        >
          + New Task
        </Link>
      </div>

      {/* ── Tenant tabs ── */}
      {tenantTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link
            href={buildHref(baseParams, { tenant_id: undefined })}
            style={{
              fontSize: 11, fontWeight: !selectedTenantId ? 700 : 400,
              color: !selectedTenantId ? '#FAFAFA' : '#71717A',
              padding: '6px 12px',
              borderBottom: !selectedTenantId ? '2px solid #D7261E' : '2px solid transparent',
              textDecoration: 'none',
            }}
          >
            All
          </Link>
          {tenantTabs.map((t) => (
            <Link
              key={t.id}
              href={buildHref(baseParams, { tenant_id: t.id })}
              style={{
                fontSize: 11, fontWeight: selectedTenantId === t.id ? 700 : 400,
                color: selectedTenantId === t.id ? '#FAFAFA' : '#71717A',
                padding: '6px 12px',
                borderBottom: selectedTenantId === t.id ? `2px solid ${t.color ?? '#D7261E'}` : '2px solid transparent',
                textDecoration: 'none',
              }}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── Filter row ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>

        {/* Owner filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>
            Who
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <Link
              href={buildHref(baseParams, { view: undefined, owner_id: undefined })}
              style={filterPillStyle(isAllOwner)}
            >
              All
            </Link>
            <Link
              href={buildHref(baseParams, { view: 'mine', owner_id: undefined })}
              style={filterPillStyle(isMine)}
            >
              Mine
            </Link>
            {directory.slice(0, 5).map((u) => (
              <Link
                key={u.id}
                href={buildHref(baseParams, { view: undefined, owner_id: u.id })}
                title={u.name}
                style={{
                  ...filterPillStyle(isOwner(u.id)),
                  padding: '3px 8px',
                }}
              >
                {initials(u.name)}
              </Link>
            ))}
            {directory.length > 5 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#52525B',
                  whiteSpace: 'nowrap',
                }}
                title={directory.slice(5).map((u) => u.name).join(', ')}
              >
                +{directory.length - 5}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>
            Status
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {STATUSES.map((s) => {
              const isActive = (s.key === undefined && (!statusParam || statusParam === 'all')) ||
                s.key === statusParam
              return (
                <Link
                  key={s.label}
                  href={buildHref(baseParams, { status: s.key })}
                  style={filterPillStyle(isActive)}
                >
                  {s.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Weekly view ── */}
      {tasks.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#3F3F46', fontSize: 13 }}>
          {isMine ? 'No tasks assigned to you.' : 'No tasks found.'}
        </div>
      ) : (
        <div>
          {buckets.map((bucket) => (
            <BucketSection key={bucket.key} bucket={bucket} directory={directory} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Filter pill style helper ─────────────────────────────────────────────────

function filterPillStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: active ? 700 : 500,
    padding: '3px 10px',
    borderRadius: 99,
    border: `1px solid ${active ? '#D7261E' : 'rgba(255,255,255,0.10)'}`,
    background: active ? 'rgba(215,38,30,0.12)' : 'transparent',
    color: active ? '#D7261E' : '#71717A',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
  }
}
