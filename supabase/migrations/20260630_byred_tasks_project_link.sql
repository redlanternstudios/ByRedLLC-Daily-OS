-- Migration: 20260630_byred_tasks_project_link
-- Link byred_tasks (the single source of truth) to a real project + epic group,
-- so the Planner can build structured, Monday-style projects without forking the
-- task store. project_id → os_projects; epic = group label; order_index = column order.

ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES os_projects(id) ON DELETE SET NULL;
ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS epic text;
ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_byred_tasks_project ON byred_tasks(project_id) WHERE project_id IS NOT NULL;
