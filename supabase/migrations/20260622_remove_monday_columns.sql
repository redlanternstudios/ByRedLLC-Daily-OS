-- Migration: Remove Monday.com columns
-- Date: 2026-06-22
-- Removes all Monday.com integration columns from the database schema

-- Drop unique index on monday_item_id in byred_tasks if it exists
DROP INDEX IF EXISTS byred_tasks_monday_item_id_key;

-- Drop monday_item_id from byred_tasks
ALTER TABLE byred_tasks DROP COLUMN IF EXISTS monday_item_id;

-- Drop monday_item_id from os_tasks if that table exists
ALTER TABLE os_tasks DROP COLUMN IF EXISTS monday_item_id;

-- Drop monday columns from byred_tenants if they exist
ALTER TABLE byred_tenants DROP COLUMN IF EXISTS monday_board_id;
ALTER TABLE byred_tenants DROP COLUMN IF EXISTS monday_group_id;

-- Drop monday_user_id from byred_users if it exists
ALTER TABLE byred_users DROP COLUMN IF EXISTS monday_user_id;
