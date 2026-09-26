/*
# Add est_minutes column to tasks

1. Modified Tables
- `tasks`
  - Added `est_minutes` (integer, nullable) — estimated time to complete the task in minutes.
    Used for display in the UI and for Focus mode prioritization.

2. Security
- No RLS policy changes. The new column inherits the existing task ownership policies.

3. Notes
- Column is nullable so existing tasks (if any) won't break.
- The edge function populates this on new task generation.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS est_minutes integer;
