-- Fix: Allow expense payer to delete ALL splits for their expense (not just their own)
-- This fixes the edit expense bug where old splits weren't being replaced

-- Drop existing DELETE policies on expense_splits
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'expense_splits'
      AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON expense_splits', pol.policyname);
  END LOOP;
END $$;

-- Create correct DELETE policy: expense payer can delete all splits for their expense
CREATE POLICY "Expense payer can delete splits"
ON expense_splits
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND expenses.paid_by = auth.uid()
  )
);
