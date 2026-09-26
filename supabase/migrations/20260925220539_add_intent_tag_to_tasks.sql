/*
# Add intent_tag column to tasks

1. Modified Tables
- `tasks`
  - Added `intent_tag` (text, nullable) — the marketing intent of the task.
    Values: AWARENESS, ENGAGEMENT, CONVERSION, RETENTION.
    Used for display on task cards and for campaign phase grouping.

2. Security
- No RLS policy changes. The new column inherits existing task ownership policies.

3. Notes
- Column is nullable so existing tasks won't break.
- The edge function populates this on new task generation.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS intent_tag text;
