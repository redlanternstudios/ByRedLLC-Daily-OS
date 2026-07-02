-- Migration: 20260701_os_integration_secrets
-- Encrypted secrets vault for project/tenant integrations.
-- Values are encrypted APP-SIDE (AES-256-GCM, key from SECRETS_ENCRYPTION_KEY) —
-- the DB never holds plaintext or the key. Ciphertext is useless without the key.
-- The AI never sees raw secrets: tools reference a secret by id/name; a server-only
-- resolver decrypts inside trusted actions only.

CREATE TABLE IF NOT EXISTS os_integration_secrets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  project_id   uuid        REFERENCES os_projects(id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (length(trim(name)) > 0),   -- handle, e.g. GITHUB_TOKEN
  provider     text,                                                  -- github | supabase | vercel | ...
  ciphertext   text        NOT NULL,
  iv           text        NOT NULL,
  auth_tag     text        NOT NULL,
  created_by   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_os_integration_secrets_scope ON os_integration_secrets(tenant_id, project_id);

ALTER TABLE os_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Members may read METADATA of secrets in their tenants (the API never returns
-- ciphertext/iv/tag). Writes + decryption go through the service role only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_integration_secrets' AND policyname='Members can view secret metadata in their tenants') THEN
    CREATE POLICY "Members can view secret metadata in their tenants" ON os_integration_secrets FOR SELECT
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
  -- No client INSERT/UPDATE/DELETE policies: only the service role (server) can write.
END $$;
