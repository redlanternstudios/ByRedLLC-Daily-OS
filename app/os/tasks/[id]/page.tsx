import { notFound } from 'next/navigation'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'
import { TaskDetailClient } from '@/components/os/TaskDetailClient'

type Ctx = { params: Promise<{ id: string }> }

export default async function OsTaskDetailPage({ params }: Ctx) {
  const { id } = await params
  const { tenantIds } = await requireTenantScope()

  const supabase = await createClient()
  const [{ data: task }, { data: directoryRows }] = await Promise.all([
    supabase
      .from('byred_tasks')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('byred_users')
      .select('id,name,avatar_url')
      .eq('active', true)
      .order('name', { ascending: true }),
  ])

  if (!task) notFound()

  const directory = (directoryRows ?? []) as { id: string; name: string; avatar_url: string | null }[]

  return <TaskDetailClient task={task} directory={directory} />
}
