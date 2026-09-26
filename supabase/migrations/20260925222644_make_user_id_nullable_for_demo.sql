/*
# Make campaigns.user_id nullable for demo mode

In demo mode there is no authenticated session, so auth.uid() returns
null. The user_id column was NOT NULL with a default of auth.uid(),
which blocks inserts from anon users.

1. Modified Tables
- `campaigns`: user_id changed from NOT NULL to nullable

2. Security
- The authenticated RLS policies still scope by auth.uid() = user_id,
  so signed-in users only see their own campaigns.
- Demo-mode campaigns have null user_id and are only accessible via the
  anon policies added in the previous migration.
*/

ALTER TABLE campaigns ALTER COLUMN user_id DROP NOT NULL;
