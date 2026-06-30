-- Migration: 20260630_byred_users_slack_id
-- Identity mapping so Lantern can DM teammates on Slack.
-- Holds each user's Slack member ID (e.g. U012ABCDEF). Nullable — users without
-- a mapping simply can't be DM'd via Slack until one is set.

ALTER TABLE byred_users ADD COLUMN IF NOT EXISTS slack_user_id text;
