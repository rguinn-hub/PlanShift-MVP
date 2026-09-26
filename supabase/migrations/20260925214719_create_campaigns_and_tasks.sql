/*
# Create campaigns and tasks tables

1. New Tables
- `campaigns`
  - id (uuid, primary key)
  - user_id (uuid, owner, defaults to auth.uid())
  - business_name (text, not null)
  - business_brief (text, not null)
  - target_audience (text, not null)
  - goal (text, not null)
  - channels (text[], not null) — array of channel names
  - start_date (date, not null)
  - duration_days (integer, not null)
  - created_at (timestamptz, defaults to now())
- `tasks`
  - id (uuid, primary key)
  - campaign_id (uuid, FK to campaigns, cascade delete)
  - title (text, not null)
  - channel (text, not null)
  - due_date (date, not null)
  - draft_copy (text, nullable — AI-generated draft, user-editable)
  - status (text, not null, default 'todo') — one of: todo, in_progress, done
  - sort_order (integer, not null, default 0)
  - created_at (timestamptz, defaults to now())

2. Security
- Enable RLS on both tables.
- campaigns: owner-scoped CRUD (auth.uid() = user_id).
- tasks: scoped through parent campaign ownership via EXISTS subquery.
- user_id defaults to auth.uid() so client inserts omitting user_id succeed.

3. Indexes
- campaigns(user_id) for listing a user's campaigns.
- tasks(campaign_id) for listing tasks in a campaign.
- tasks(due_date) for calendar ordering.
*/

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_brief text NOT NULL,
  target_audience text NOT NULL,
  goal text NOT NULL,
  channels text[] NOT NULL,
  start_date date NOT NULL,
  duration_days integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns" ON campaigns FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campaigns" ON campaigns;
CREATE POLICY "insert_own_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campaigns" ON campaigns;
CREATE POLICY "update_own_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campaigns" ON campaigns;
CREATE POLICY "delete_own_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel text NOT NULL,
  due_date date NOT NULL,
  draft_copy text,
  status text NOT NULL DEFAULT 'todo',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_tasks_campaign_id ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
