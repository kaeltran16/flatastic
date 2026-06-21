-- Allow the expense payer to settle (update) splits on their own expense.
--
-- The only UPDATE policy on expense_splits was "Split users can update their
-- splits" (user_id = auth.uid()), so a user could only settle their own split.
-- The payer's "Mark as Paid" action (settleExpenseAction's payer branch) marks
-- every debtor's split settled — none of which the payer owns — so under RLS it
-- silently updated zero rows while the UI reported success.
--
-- This policy mirrors the existing "Expense payer can delete splits" DELETE
-- policy: the payer of an expense may update its splits. Settlement only flips
-- is_settled, and the payer already controls the expense (edit/delete), so this
-- grants no capability beyond what they already have.

CREATE POLICY "Expense payer can update splits"
ON expense_splits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
  )
);
