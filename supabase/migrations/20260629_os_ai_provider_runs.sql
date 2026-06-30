-- Migration: 20260629_os_ai_provider_runs
-- Enterprise ledger for measuring AI provider efficiency before Codex execution.

CREATE TABLE IF NOT EXISTS os_ai_provider_runs (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  created_by_user_id           uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  tenant_id                    uuid        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  provider                     text        NOT NULL CHECK (provider IN ('groq','gemini','deepseek','glm','anthropic','codex')),
  model                        text        NOT NULL CHECK (length(trim(model)) > 0),
  lane                         text        NOT NULL CHECK (lane IN ('operator','fast_brief','visual_context','code_review','agentic_engineering')),
  purpose                      text        NOT NULL CHECK (purpose IN ('implementation_plan','code_review','bug_hypothesis','test_plan','ux_risk','brief','triage','summary')),
  status                       text        NOT NULL CHECK (status IN ('success','failed','blocked','rejected','verified')),
  mutation_allowed             boolean     NOT NULL DEFAULT false,
  prompt_chars                 integer     NOT NULL DEFAULT 0 CHECK (prompt_chars >= 0),
  context_chars                integer     NOT NULL DEFAULT 0 CHECK (context_chars >= 0),
  prompt_tokens                integer     CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens            integer     CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  total_tokens                 integer     CHECK (total_tokens IS NULL OR total_tokens >= 0),
  estimated_codex_tokens_saved integer     NOT NULL DEFAULT 0 CHECK (estimated_codex_tokens_saved >= 0),
  estimated_codex_minutes_saved numeric(8,2) NOT NULL DEFAULT 0 CHECK (estimated_codex_minutes_saved >= 0),
  verification_status          text        NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','not_required')),
  outcome_summary              text,
  weakness                     text,
  failure_reason               text,
  related_receipt_id           uuid        REFERENCES os_agent_receipts(id) ON DELETE SET NULL,
  metadata                     jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_ai_provider_runs_tenant_created
  ON os_ai_provider_runs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_ai_provider_runs_provider_created
  ON os_ai_provider_runs(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_ai_provider_runs_status_created
  ON os_ai_provider_runs(status, created_at DESC);

ALTER TABLE os_ai_provider_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI provider runs in their tenants"
  ON os_ai_provider_runs FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT ut.tenant_id
      FROM byred_user_tenants ut
      JOIN byred_users bu ON bu.id = ut.user_id
      WHERE bu.auth_user_id = auth.uid()
    )
  );

-- Writes are server/admin controlled so model output cannot create trusted metrics directly.
CREATE POLICY "Block direct client AI provider run inserts"
  ON os_ai_provider_runs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block direct client AI provider run updates"
  ON os_ai_provider_runs FOR UPDATE
  USING (false);

CREATE POLICY "Block direct client AI provider run deletes"
  ON os_ai_provider_runs FOR DELETE
  USING (false);
