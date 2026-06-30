-- Migration: 20260630_os_task_dependencies
-- Task dependency edges (task X is blocked by / depends on task Y).
-- The dependencies API (app/api/tasks/[id]/dependencies) already reads/writes this.
-- tenant_id is text to match byred_tenants.id (see byred-os-schema note).

CREATE TABLE IF NOT EXISTS os_task_dependencies (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid        NOT NULL REFERENCES byred_tasks(id) ON DELETE CASCADE,
  depends_on_task_id  uuid        NOT NULL REFERENCES byred_tasks(id) ON DELETE CASCADE,
  tenant_id           text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT os_task_dependencies_no_self CHECK (task_id <> depends_on_task_id),
  CONSTRAINT os_task_dependencies_uniq UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_os_task_dependencies_task ON os_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_os_task_dependencies_depends_on ON os_task_dependencies(depends_on_task_id);

ALTER TABLE os_task_dependencies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_task_dependencies' AND policyname='Users can view dependencies in their tenants') THEN
    CREATE POLICY "Users can view dependencies in their tenants" ON os_task_dependencies FOR SELECT
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_task_dependencies' AND policyname='Users can manage dependencies in their tenants') THEN
    CREATE POLICY "Users can manage dependencies in their tenants" ON os_task_dependencies FOR ALL
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
END $$;
