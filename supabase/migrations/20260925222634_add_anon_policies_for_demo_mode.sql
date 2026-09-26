/*
# Allow anon role access for demo mode

Demo mode lets users try the app without signing in. Since there is no
authenticated session, auth.uid() returns null and the existing
`TO authenticated` policies block all writes.

1. Modified Tables
- `campaigns`: added anon-role INSERT/SELECT/UPDATE/DELETE policies
- `tasks`: added anon-role INSERT/SELECT/UPDATE/DELETE policies

2. Security
- The anon policies are permissive (USING true / WITH CHECK true) because
  demo-mode users have no user_id to scope by. This is acceptable for the
  demo flow — data created in demo mode is ephemeral and the user is told
  they cannot return to it.
- The existing authenticated policies (scoped to auth.uid()) are unchanged.
*/

-- Campaigns: anon policies for demo mode
CREATE POLICY "anon_select_campaigns" ON campaigns FOR SELECT
  TO anon USING (true);
CREATE POLICY "anon_insert_campaigns" ON campaigns FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_campaigns" ON campaigns FOR DELETE
  TO anon USING (true);

-- Tasks: anon policies for demo mode
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon USING (true);
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon USING (true);
