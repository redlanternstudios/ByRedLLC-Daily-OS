-- Migration: 20260629_os_agent_receipts
-- Durable verified receipts for OS agent learning loops.
-- Execution frameworks stay scoped by agent family; mindset/proof patterns can be universal.

CREATE TABLE IF NOT EXISTS os_agent_receipts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by_user_id    uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  tenant_id             uuid        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  receipt_type          text        NOT NULL CHECK (receipt_type IN ('feature','task','bug','verification','decision','lesson')),
  source_surface        text        NOT NULL CHECK (length(trim(source_surface)) > 0),
  agent_family          text        NOT NULL DEFAULT 'web_app' CHECK (agent_family IN ('web_app','ios','ops','comms','sales','universal')),
  framework_scope       text        NOT NULL DEFAULT 'web_app' CHECK (framework_scope IN ('web_app','ios','ops','comms','sales','mindset_universal')),
  related_task_id       uuid        REFERENCES byred_tasks(id) ON DELETE SET NULL,
  related_project_id    uuid        REFERENCES os_projects(id) ON DELETE SET NULL,
  summary               text        NOT NULL CHECK (length(trim(summary)) > 0),
  lesson                text        NOT NULL CHECK (length(trim(lesson)) > 0),
  proof_url_or_path     text        NOT NULL CHECK (length(trim(proof_url_or_path)) > 0),
  verification_status   text        NOT NULL DEFAULT 'verified' CHECK (verification_status = 'verified')
);

CREATE INDEX IF NOT EXISTS idx_os_agent_receipts_tenant_created
  ON os_agent_receipts(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_agent_receipts_agent_family
  ON os_agent_receipts(agent_family, framework_scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_agent_receipts_related_task
  ON os_agent_receipts(related_task_id) WHERE related_task_id IS NOT NULL;

ALTER TABLE os_agent_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verified receipts in their tenants"
  ON os_agent_receipts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND verification_status = 'verified'
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM byred_user_tenants ut
      JOIN byred_users bu ON bu.id = ut.user_id
      WHERE bu.auth_user_id = auth.uid()
    )
  );

-- Inserts are intentionally handled by trusted server/admin flows.
-- Service-role writes bypass RLS; direct authenticated inserts are blocked.
CREATE POLICY "Block direct client receipt inserts"
  ON os_agent_receipts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block direct client receipt updates"
  ON os_agent_receipts FOR UPDATE
  USING (false);

CREATE POLICY "Block direct client receipt deletes"
  ON os_agent_receipts FOR DELETE
  USING (false);
