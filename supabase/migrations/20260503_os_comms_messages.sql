-- os_channels: Slack-style channels for internal team messaging
CREATE TABLE os_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES byred_tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  is_dm       boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES byred_users(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- os_messages: Messages sent in a channel, with optional reply threading
CREATE TABLE os_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   uuid NOT NULL REFERENCES os_channels(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES byred_tenants(id),
  user_id      uuid NOT NULL REFERENCES byred_users(id),
  body         text NOT NULL CHECK (char_length(trim(body)) > 0),
  reply_to_id  uuid REFERENCES os_messages(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index for efficient channel message queries and realtime
CREATE INDEX os_messages_channel_created ON os_messages(channel_id, created_at);

-- RLS
ALTER TABLE os_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read channels"
  ON os_channels FOR SELECT
  USING (byred_is_member_of_tenant(tenant_id));

CREATE POLICY "tenant members create channels"
  ON os_channels FOR INSERT
  WITH CHECK (byred_is_member_of_tenant(tenant_id));

CREATE POLICY "tenant members read messages"
  ON os_messages FOR SELECT
  USING (byred_is_member_of_tenant(tenant_id));

CREATE POLICY "tenant members send messages"
  ON os_messages FOR INSERT
  WITH CHECK (
    byred_is_member_of_tenant(tenant_id)
    AND user_id = byred_current_user_id()
  );

CREATE POLICY "author updates own message"
  ON os_messages FOR UPDATE
  USING (user_id = byred_current_user_id());

-- Seed default channels for every existing tenant
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM byred_tenants LOOP
    INSERT INTO os_channels (tenant_id, name, description)
    VALUES
      (rec.id, 'general',       'Company-wide conversation'),
      (rec.id, 'announcements', 'Important updates for the team')
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END LOOP;
END $$;
