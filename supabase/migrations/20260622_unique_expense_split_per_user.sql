-- Prevent duplicate splits: one row per (expense, user).
--
-- Duplicate expense_splits accumulated when an edit re-inserted splits without
-- removing the originals (the delete step could silently affect zero rows under
-- RLS, leaving stale splits behind). That produced phantom unsettled debt and
-- inflated expense totals -- e.g. an Internet bill showing 8 splits / $446.25
-- for a $255 expense, double-charging one member.
--
-- This constraint is the durable backstop: a duplicate (expense_id, user_id)
-- becomes impossible regardless of code path, retry, or RLS behavior. Existing
-- duplicates were de-duped before applying.

ALTER TABLE expense_splits
  ADD CONSTRAINT expense_splits_expense_user_unique UNIQUE (expense_id, user_id);
