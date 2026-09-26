/*
# Fix RLS: Replace unrestricted anon policies with authenticated ownership checks

## Problem
The campaigns and tasks tables had unrestricted anon policies (USING (true), WITH CHECK (true))
that allowed anyone — including unauthenticated users — to read, create, update, and delete
all campaign and task data. This is a critical security vulnerability.

## Changes
1. Drop all existing anon policies on campaigns and tasks
2. Create authenticated-only, owner-scoped policies:
   - Campaigns: auth.uid() = user_id for all CRUD
   - Tasks: ownership through parent campaign (EXISTS check)
3. Add DEFAULT auth.uid() to campaigns.user_id so inserts work without explicit user_id
4. Tasks.user_id is nullable for legacy demo data; new inserts from authenticated users
   will have user_id set by the client. The task policies check campaign ownership instead.

## Important Notes
- Existing ownerless demo campaigns and tasks will become invisible to authenticated users
  because they have no matching user_id. This is correct behavior — demo data loaded
  without a session should use localStorage, not the shared database.
- The campaigns table already has user_id; we add DEFAULT auth.uid() so frontend inserts
  that omit user_id still succeed.
- Task access is scoped through campaign ownership: a user can only see/modify tasks
  belonging to campaigns they own.
- Service-role credentials are never exposed to the frontend.
*/

-- Fix campaigns policies
ALTER TABLE campaigns ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;

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

-- Fix tasks policies (ownership through parent campaign)
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;

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
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tasks.campaign_id AND campaigns.user_id = auth.uid())
  );
