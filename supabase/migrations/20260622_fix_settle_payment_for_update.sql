-- Fix settle_payment: "FOR UPDATE is not allowed with aggregate functions"
--
-- The original 20260517 migration locked the affected splits with
-- `SELECT SUM(...) ... FOR UPDATE`, which Postgres rejects at runtime — a row
-- locking clause cannot be combined with an aggregate. The function therefore
-- threw on its very first statement on every call, so settlement never worked.
--
-- Fix: take the row locks in a separate non-aggregate `PERFORM ... FOR UPDATE`
-- pass (covering both debt directions), then compute the directional totals
-- with plain aggregate reads. The locks acquired by PERFORM are held for the
-- rest of the transaction, so concurrent settlements still serialize.
--
-- Only the lock/sum section changed; the rest of the body is identical to the
-- original migration.

CREATE OR REPLACE FUNCTION settle_payment(
  p_from_user uuid,
  p_to_user uuid,
  p_amount numeric,
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_household uuid;
  v_other_household uuid;
  v_forward_total numeric;
  v_reverse_total numeric;
  v_net numeric;
  v_net_from uuid;
  v_net_to uuid;
  v_remaining numeric;
  v_split record;
  v_payment_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_from_user = p_to_user THEN
    RAISE EXCEPTION 'cannot settle with self';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF v_caller <> p_from_user AND v_caller <> p_to_user THEN
    RAISE EXCEPTION 'caller must be one of the parties to the settlement';
  END IF;

  SELECT household_id INTO v_caller_household FROM profiles WHERE id = v_caller;
  IF v_caller_household IS NULL THEN
    RAISE EXCEPTION 'caller has no household';
  END IF;

  SELECT household_id INTO v_other_household
  FROM profiles
  WHERE id = CASE WHEN v_caller = p_from_user THEN p_to_user ELSE p_from_user END;
  IF v_other_household IS DISTINCT FROM v_caller_household THEN
    RAISE EXCEPTION 'both parties must be in the same household';
  END IF;

  -- Lock all unsettled splits between the two users (both directions) so
  -- concurrent settlements serialize. A plain (non-aggregate) SELECT can carry
  -- FOR UPDATE; the directional totals below are then read without it.
  PERFORM es.id
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.household_id = v_caller_household
    AND es.is_settled = false
    AND (
      (es.user_id = p_from_user AND e.paid_by = p_to_user) OR
      (es.user_id = p_to_user AND e.paid_by = p_from_user)
    )
  FOR UPDATE OF es;

  -- Forward = from_user owes to_user (to_user paid, from_user is in the split).
  SELECT COALESCE(SUM(es.amount_owed), 0) INTO v_forward_total
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_from_user
    AND e.paid_by = p_to_user
    AND e.household_id = v_caller_household
    AND es.is_settled = false;

  SELECT COALESCE(SUM(es.amount_owed), 0) INTO v_reverse_total
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_to_user
    AND e.paid_by = p_from_user
    AND e.household_id = v_caller_household
    AND es.is_settled = false;

  v_net := v_forward_total - v_reverse_total;
  IF v_net >= 0 THEN
    v_net_from := p_from_user;
    v_net_to := p_to_user;
  ELSE
    v_net_from := p_to_user;
    v_net_to := p_from_user;
    v_net := -v_net;
  END IF;

  -- The caller is paying along (p_from_user -> p_to_user). If that's the
  -- opposite of the net direction, the payment doesn't make sense.
  IF p_from_user <> v_net_from AND v_net > 0.01 THEN
    RAISE EXCEPTION 'no debt owed in this direction (net is % owed the other way)', v_net;
  END IF;

  IF p_amount > v_net + 0.01 THEN
    RAISE EXCEPTION 'amount % exceeds outstanding balance %', p_amount, v_net;
  END IF;

  -- Full settlement (within 1 cent): clear BOTH directions so no orphan
  -- splits remain. Partial: chip away at the net direction only; the
  -- reverse-direction splits stay and continue to offset future totals.
  IF p_amount >= v_net - 0.01 THEN
    UPDATE expense_splits SET is_settled = true
    WHERE id IN (
      SELECT es.id FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.household_id = v_caller_household
        AND es.is_settled = false
        AND (
          (es.user_id = p_from_user AND e.paid_by = p_to_user) OR
          (es.user_id = p_to_user AND e.paid_by = p_from_user)
        )
    );
  ELSE
    v_remaining := p_amount;
    FOR v_split IN
      SELECT es.id, es.amount_owed
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.household_id = v_caller_household
        AND es.is_settled = false
        AND es.user_id = v_net_from
        AND e.paid_by = v_net_to
      ORDER BY es.amount_owed DESC, es.id
    LOOP
      EXIT WHEN v_remaining <= 0.005;
      IF v_remaining >= v_split.amount_owed - 0.005 THEN
        UPDATE expense_splits SET is_settled = true WHERE id = v_split.id;
        v_remaining := v_remaining - v_split.amount_owed;
      ELSE
        UPDATE expense_splits
        SET amount_owed = round((v_split.amount_owed - v_remaining)::numeric, 2)
        WHERE id = v_split.id;
        v_remaining := 0;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO payment_notes (from_user_id, to_user_id, amount, note)
  VALUES (p_from_user, p_to_user, p_amount, COALESCE(p_note, ''))
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_note_id', v_payment_id,
    'amount', p_amount,
    'net_before', v_net,
    'fully_settled', p_amount >= v_net - 0.01
  );
END;
$$;
