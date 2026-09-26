/*
# Add micro_steps column to tasks

1. Modified Tables
- `tasks`
  - Added `micro_steps` (jsonb, nullable, default '[]') — array of
    { text: string, done: boolean } objects representing sub-steps of a task.
    Used by the "Split into steps" feature and Focus Mode.

2. Security
- No RLS policy changes. The new column inherits existing task ownership policies.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS micro_steps jsonb DEFAULT '[]';
