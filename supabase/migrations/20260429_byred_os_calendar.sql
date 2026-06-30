-- Migration: 20260429_byred_os_calendar
-- Creates os_calendar_events table.
-- Events are the canonical calendar layer — standalone meetings, milestones,
-- reminders, and task_due events. task_due events can reference os_tasks or
-- byred_tasks via related_entity_type + related_entity_id.

CREATE TABLE IF NOT EXISTS os_calendar_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  project_id           uuid        REFERENCES os_projects(id) ON DELETE SET NULL,
  board_id             uuid        REFERENCES os_boards(id) ON DELETE SET NULL,
  task_id              uuid        REFERENCES os_tasks(id) ON DELETE SET NULL,
  title                text        NOT NULL CHECK (length(trim(title)) > 0),
  description          text,
  event_type           text        NOT NULL DEFAULT 'meeting'
                                   CHECK (event_type IN
                                     ('task_due','milestone','meeting','deadline','reminder')),
  status               text        NOT NULL DEFAULT 'upcoming'
                                   CHECK (status IN ('upcoming','in_progress','done','cancelled')),
  start_at             timestamptz NOT NULL,
  end_at               timestamptz,
  all_day              boolean     NOT NULL DEFAULT false,
  owner_user_id        uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  -- attendees stored as array of byred_users.id
  attendee_user_ids    uuid[]      NOT NULL DEFAULT '{}',
  calendar_color       text,
  calendar_label       text,
  -- loose reference to any entity (project, board, task from either table)
  related_entity_type  text,
  related_entity_id    text,
  created_by_user_id   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_os_calendar_events_tenant_start
  ON os_calendar_events(tenant_id, start_at);

CREATE INDEX IF NOT EXISTS idx_os_calendar_events_owner
  ON os_calendar_events(owner_user_id, start_at);

CREATE INDEX IF NOT EXISTS idx_os_calendar_events_start_at
  ON os_calendar_events(start_at);

CREATE INDEX IF NOT EXISTS idx_os_calendar_events_task
  ON os_calendar_events(task_id) WHERE task_id IS NOT NULL;

-- GIN index for attendee array queries (user can see events they attend)
CREATE INDEX IF NOT EXISTS idx_os_calendar_events_attendees
  ON os_calendar_events USING GIN (attendee_user_ids);

ALTER TABLE os_calendar_events ENABLE ROW LEVEL SECURITY;

-- SELECT: user can see events for any tenant they belong to,
-- OR events where they are the owner or an attendee.
CREATE POLICY "Users can view events in their tenants"
  ON os_calendar_events FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      tenant_id IN (
        SELECT ut.tenant_id
        FROM byred_user_tenants ut
        JOIN byred_users bu ON bu.id = ut.user_id
        WHERE bu.auth_user_id = auth.uid()
      )
      OR owner_user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid())
      OR (SELECT id FROM byred_users WHERE auth_user_id = auth.uid()) = ANY(attendee_user_ids)
    )
  );

-- INSERT: must be authenticated, owner_user_id must be self or null
CREATE POLICY "Users can create events"
  ON os_calendar_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: owner or admin can update
CREATE POLICY "Owners and admins can update events"
  ON os_calendar_events FOR UPDATE
  USING (
    owner_user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid())
    OR (SELECT role FROM byred_users WHERE auth_user_id = auth.uid()) = 'admin'
  );

-- DELETE: owner or admin can delete
CREATE POLICY "Owners and admins can delete events"
  ON os_calendar_events FOR DELETE
  USING (
    owner_user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid())
    OR (SELECT role FROM byred_users WHERE auth_user_id = auth.uid()) = 'admin'
  );

-- ─── Helper view: calendar_events_with_user ──────────────────────────────────
-- Used by the API to enrich events with owner name without a join in application code.
CREATE OR REPLACE VIEW os_calendar_events_enriched AS
SELECT
  e.*,
  u.name  AS owner_name,
  u.email AS owner_email,
  t.name  AS tenant_name,
  t.color AS tenant_color
FROM os_calendar_events e
LEFT JOIN byred_users u ON u.id = e.owner_user_id
LEFT JOIN byred_tenants t ON t.id = e.tenant_id;
