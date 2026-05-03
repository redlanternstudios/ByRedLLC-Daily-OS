-- Add status_mapping to os_phases so each column can be bound to a task status.
-- status_mapping is optional (NULL = manual-only column).
-- Constraint: at most one phase per board may claim any given status.

ALTER TABLE os_phases
  ADD COLUMN IF NOT EXISTS status_mapping text
    CHECK (
      status_mapping IN (
        'not_started',
        'in_progress',
        'blocked',
        'overdue',
        'done',
        'cancelled'
      )
    );

-- Unique partial index: board_id + status_mapping, ignoring NULLs
CREATE UNIQUE INDEX IF NOT EXISTS os_phases_board_status_mapping_uniq
  ON os_phases (board_id, status_mapping)
  WHERE status_mapping IS NOT NULL;
