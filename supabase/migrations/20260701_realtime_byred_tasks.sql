-- Migration: 20260701_realtime_byred_tasks
-- Add byred_tasks to the Supabase Realtime publication so boards/tables update
-- live for all viewers when anyone changes a task.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='byred_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE byred_tasks;
  END IF;
END $$;
