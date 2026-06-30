-- Migration: 20260630_byred_tasks_ai_processed_at
-- Marks when the AI executor has acted on a task, so the cron never
-- reprocesses the same AI_EXECUTE / AI_DRAFT task on the next run.

ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;
