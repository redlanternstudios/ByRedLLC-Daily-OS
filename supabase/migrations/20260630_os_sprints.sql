-- Migration: 20260630_os_sprints
-- Jira-style per-project sprints + backlog. tenant_id is text (see schema note).

CREATE TABLE IF NOT EXISTS os_sprints (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  project_id         uuid        REFERENCES os_projects(id) ON DELETE CASCADE,
  name               text        NOT NULL CHECK (length(trim(name)) > 0),
  goal               text,
  status             text        NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  start_date         date,
  end_date           date,
  created_by_user_id uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_os_sprints_project ON os_sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_os_sprints_tenant ON os_sprints(tenant_id);

ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES os_sprints(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_byred_tasks_sprint ON byred_tasks(sprint_id) WHERE sprint_id IS NOT NULL;

ALTER TABLE os_sprints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_sprints' AND policyname='Users can view sprints in their tenants') THEN
    CREATE POLICY "Users can view sprints in their tenants" ON os_sprints FOR SELECT
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_sprints' AND policyname='Users can manage sprints in their tenants') THEN
    CREATE POLICY "Users can manage sprints in their tenants" ON os_sprints FOR ALL
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
END $$;
