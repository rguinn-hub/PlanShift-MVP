/*
# Add campaign_phase column to tasks

1. Modified Tables
- `tasks`
  - Added `campaign_phase` (text, nullable) — stores the phase name
    (Tease, Build-Up, Launch, Momentum) for each task.

2. Security
- No RLS policy changes. The new column inherits existing task ownership policies.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS campaign_phase text;
