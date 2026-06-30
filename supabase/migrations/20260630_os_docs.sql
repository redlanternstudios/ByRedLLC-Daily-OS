-- Migration: 20260630_os_docs
-- Confluence-style docs/wiki. Powers /os/docs AND project-scoped docs (project_id).
-- tenant_id is text (see schema note). doc_type covers notes, decisions, specs, etc.

CREATE TABLE IF NOT EXISTS os_docs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  project_id     uuid        REFERENCES os_projects(id) ON DELETE CASCADE,
  title          text        NOT NULL CHECK (length(trim(title)) > 0),
  content        text,
  doc_type       text        NOT NULL DEFAULT 'note' CHECK (doc_type IN ('note', 'decision', 'spec', 'prd', 'meeting', 'wiki')),
  status         text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  linked_task_id uuid        REFERENCES byred_tasks(id) ON DELETE SET NULL,
  created_by     uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_os_docs_tenant ON os_docs(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_docs_project ON os_docs(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE os_docs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_docs' AND policyname='Users can view docs in their tenants') THEN
    CREATE POLICY "Users can view docs in their tenants" ON os_docs FOR SELECT
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_docs' AND policyname='Users can manage docs in their tenants') THEN
    CREATE POLICY "Users can manage docs in their tenants" ON os_docs FOR ALL
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
END $$;
