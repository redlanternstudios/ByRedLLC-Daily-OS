-- Migration: 20260630_byred_tasks_parent_task_id
-- Self-referential parent link so byred_tasks can have subtasks.
-- The subtasks API (app/api/tasks/[id]/subtasks) already reads/writes this column.

ALTER TABLE byred_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES byred_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_byred_tasks_parent
  ON byred_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
