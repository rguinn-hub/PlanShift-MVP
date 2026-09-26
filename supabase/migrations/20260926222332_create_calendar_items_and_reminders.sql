/*
# Create calendar items, reminders, and add scheduling to notes

1. New Tables
- `calendar_items`: General-purpose calendar items (general tasks, appointments) not tied to a campaign.
- `reminders`: In-app reminders for any schedulable item.

2. Modified Tables
- `notes`: Add scheduled_date, scheduled_time, reminder_offset columns.

3. Security
- RLS enabled on calendar_items and reminders with owner-scoped CRUD.
- Notes already has owner-scoped RLS; new nullable columns are covered.

4. Important Notes
- All new tables default user_id to auth.uid().
- Existing notes and data are unaffected.
*/

-- Add scheduling columns to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS scheduled_time time;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS reminder_offset text;

-- Create calendar_items table
CREATE TABLE IF NOT EXISTS calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('general_task', 'appointment')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  start_time time,
  end_time time,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  meeting_link text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calendar_items" ON calendar_items;
CREATE POLICY "select_own_calendar_items" ON calendar_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_calendar_items" ON calendar_items;
CREATE POLICY "insert_own_calendar_items" ON calendar_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_calendar_items" ON calendar_items;
CREATE POLICY "update_own_calendar_items" ON calendar_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_calendar_items" ON calendar_items;
CREATE POLICY "delete_own_calendar_items" ON calendar_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('campaign_task', 'general_task', 'note', 'appointment')),
  item_id uuid NOT NULL,
  item_title text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  reminder_offset text,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reminders" ON reminders;
CREATE POLICY "select_own_reminders" ON reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reminders" ON reminders;
CREATE POLICY "insert_own_reminders" ON reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reminders" ON reminders;
CREATE POLICY "update_own_reminders" ON reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reminders" ON reminders;
CREATE POLICY "delete_own_reminders" ON reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_items_user_date ON calendar_items(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_scheduled ON reminders(user_id, scheduled_for) WHERE dismissed = false;
CREATE INDEX IF NOT EXISTS idx_notes_user_scheduled ON notes(user_id, scheduled_date) WHERE scheduled_date IS NOT NULL;
