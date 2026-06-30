-- Migration: 20260429_byred_os_thin_core
-- Adds OS-layer tables: os_projects, os_boards, os_phases, os_tasks, os_comments
-- These are the OS's own project management entities, separate from byred_tasks.
-- byred_tasks remains the source of truth for Monday-synced tasks.
-- os_tasks can reference byred_tasks via monday_item_id for cross-linking.

-- ─── os_projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS os_projects (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  name                 text        NOT NULL CHECK (length(trim(name)) > 0),
  description          text,
  status               text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','paused','completed','archived')),
  priority             text        NOT NULL DEFAULT 'medium'
                                   CHECK (priority IN ('critical','high','medium','low')),
  owner_user_id        uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  start_date           date,
  due_date             date,
  created_by_user_id   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_projects_tenant ON os_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_os_projects_owner  ON os_projects(owner_user_id);

ALTER TABLE os_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON os_projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert projects"
  ON os_projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update projects"
  ON os_projects FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ─── os_boards ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS os_boards (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid        REFERENCES os_projects(id) ON DELETE CASCADE,
  tenant_id            text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  name                 text        NOT NULL CHECK (length(trim(name)) > 0),
  description          text,
  board_type           text        NOT NULL DEFAULT 'kanban'
                                   CHECK (board_type IN ('kanban','list','timeline')),
  status               text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','archived')),
  created_by_user_id   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_boards_project ON os_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_os_boards_tenant  ON os_boards(tenant_id);

ALTER TABLE os_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view boards"
  ON os_boards FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert boards"
  ON os_boards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update boards"
  ON os_boards FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ─── os_phases ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS os_phases (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    uuid    NOT NULL REFERENCES os_boards(id) ON DELETE CASCADE,
  name        text    NOT NULL CHECK (length(trim(name)) > 0),
  order_index integer NOT NULL DEFAULT 0,
  color       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_phases_board ON os_phases(board_id, order_index);

ALTER TABLE os_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view phases"
  ON os_phases FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage phases"
  ON os_phases FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── os_tasks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS os_tasks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id             uuid        REFERENCES os_boards(id) ON DELETE SET NULL,
  phase_id             uuid        REFERENCES os_phases(id) ON DELETE SET NULL,
  project_id           uuid        REFERENCES os_projects(id) ON DELETE SET NULL,
  tenant_id            text        NOT NULL REFERENCES byred_tenants(id) ON DELETE RESTRICT,
  title                text        NOT NULL CHECK (length(trim(title)) > 0),
  description          text,
  status               text        NOT NULL DEFAULT 'not_started'
                                   CHECK (status IN ('not_started','in_progress','blocked','done')),
  priority             text        NOT NULL DEFAULT 'medium'
                                   CHECK (priority IN ('critical','high','medium','low')),
  owner_user_id        uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  due_date             date,
  start_date           date,
  estimated_minutes    integer,
  blocker_flag         boolean     NOT NULL DEFAULT false,
  blocker_reason       text,
  monday_item_id       text        UNIQUE,
  definition_of_done   text,
  order_index          integer     NOT NULL DEFAULT 0,
  created_by_user_id   uuid        REFERENCES byred_users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_tasks_board    ON os_tasks(board_id, phase_id, order_index);
CREATE INDEX IF NOT EXISTS idx_os_tasks_project  ON os_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_os_tasks_tenant   ON os_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_os_tasks_owner    ON os_tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_os_tasks_due_date ON os_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_tasks_monday_item_id
  ON os_tasks(monday_item_id) WHERE monday_item_id IS NOT NULL;

ALTER TABLE os_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
  ON os_tasks FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tasks"
  ON os_tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks"
  ON os_tasks FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tasks"
  ON os_tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- ─── os_comments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS os_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text        NOT NULL CHECK (entity_type IN ('task','project','board')),
  entity_id   uuid        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES byred_users(id) ON DELETE RESTRICT,
  body        text        NOT NULL CHECK (length(trim(body)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_comments_entity ON os_comments(entity_type, entity_id, created_at ASC);

ALTER TABLE os_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON os_comments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own comments"
  ON os_comments FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own comments"
  ON os_comments FOR DELETE
  USING (user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid()));
