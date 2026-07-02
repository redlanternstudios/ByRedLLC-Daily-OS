-- Migration: 20260630_project_enrichment
-- Phase 1 of the Monday × Jira × Confluence enrichment.
-- Richer issue model on byred_tasks + a markdown project brief on os_projects.

ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS issue_type text NOT NULL DEFAULT 'task'
  CHECK (issue_type IN ('epic', 'story', 'task', 'subtask', 'bug'));
ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS story_points integer;
ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE byred_tasks ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}';

ALTER TABLE os_projects ADD COLUMN IF NOT EXISTS overview text;
