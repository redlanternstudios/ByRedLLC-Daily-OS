-- Migration: 20260701_os_project_templates
-- Reusable playbooks the Planner can start from. tenant_id NULL = curated/global.
-- guidance is fed into the plan prompt so the AI builds along a proven blueprint.

CREATE TABLE IF NOT EXISTS os_project_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text        REFERENCES byred_tenants(id) ON DELETE CASCADE,   -- NULL = global
  name         text        NOT NULL CHECK (length(trim(name)) > 0),
  description  text,
  category     text,
  guidance     text        NOT NULL,
  created_by   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_os_project_templates_tenant ON os_project_templates(tenant_id);

ALTER TABLE os_project_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_project_templates' AND policyname='View global + own-tenant templates') THEN
    CREATE POLICY "View global + own-tenant templates" ON os_project_templates FOR SELECT
      USING (auth.uid() IS NOT NULL AND (tenant_id IS NULL OR tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid()))); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='os_project_templates' AND policyname='Manage own-tenant templates') THEN
    CREATE POLICY "Manage own-tenant templates" ON os_project_templates FOR ALL
      USING (auth.uid() IS NOT NULL AND tenant_id IN (
        SELECT ut.tenant_id FROM byred_user_tenants ut JOIN byred_users bu ON bu.id = ut.user_id WHERE bu.auth_user_id = auth.uid())); END IF;
END $$;

-- Curated starter playbooks (global).
INSERT INTO os_project_templates (tenant_id, name, description, category, guidance)
SELECT * FROM (VALUES
  (NULL::text, 'Landing Page Launch', 'Ship a conversion-focused landing page with a lead capture.', 'marketing',
   'Blueprint: (1) Define offer + primary CTA and success metric. (2) Copy + hero + social proof. (3) Build responsive page. (4) Lead capture form wired to storage/notification. (5) Analytics + SEO/OG tags. (6) QA on mobile + launch. Keep it to one page; measure conversion. Assign copy to a writer, build to a developer.'),
  (NULL, 'Client Onboarding', 'Onboard a new client from signed to active.', 'operations',
   'Blueprint: (1) Kickoff + confirm scope/timeline. (2) Collect assets/access (accounts, brand, credentials — human-entered). (3) Set up workspace/tools. (4) Draft SOW/expectations doc. (5) First deliverable milestone. (6) Feedback loop + recurring check-in. Flag anything requiring accounts/payments/legal as human_only.'),
  (NULL, 'Product Launch', 'Take a feature/product from ready to launched.', 'product',
   'Blueprint: (1) Launch brief + goals/metrics. (2) Positioning + messaging. (3) Assets (page, demo, email, social). (4) QA + release checklist. (5) Announcement + distribution. (6) Post-launch monitoring + iterate. Sequence dependencies: assets depend on messaging; announcement depends on assets + QA.')
) AS v(tenant_id, name, description, category, guidance)
WHERE NOT EXISTS (SELECT 1 FROM os_project_templates WHERE tenant_id IS NULL);
