# Flatastic — Improvement Backlog

Working list of issues + cleanups I'd recommend tackling one at a time. Each
entry has a short rationale, the rough scope, and a "definition of done" so
the work doesn't sprawl.

Priority key: **P0** = correctness/security, **P1** = noticeable UX or
maintenance pain, **P2** = polish.

---

## 1. [P0] Move remaining client-direct Supabase mutations to Server Actions

CLAUDE.md mandates Server Actions + Zod + auth checks for mutations, but a
few hooks still write directly from the browser using the anon key. Same
class of bug we just fixed for settlement (no atomicity, no server-side
validation, RLS does all the work).

**Locations to convert:**
- `hooks/use-settlement.ts` — `loadBalances` / `loadCompletedSettlements`
  reads (lower risk; reads are fine through anon, but moving them lets us
  cache server-side and avoid the waterfall on mount).
- `hooks/use-chore-rotation.ts` — verify whether rotation order updates go
  through a server action.
- `app/pwa-nextjs/actions.ts` — check the push-subscription mutations.

**Done when:**
- No `supabase.from(...).insert/update/delete/upsert(...)` calls remain in
  `hooks/` or client components.
- New server actions follow the `getAuthenticatedUserWithHousehold` +
  `revalidateTag` pattern in `lib/actions/expense.ts`.

---

## 2. [P1] Replace 30s chore polling with Realtime or focus-only refetch

`hooks/use-chore.ts:136` sets `refetchInterval: 30000`. With
`refetchOnWindowFocus: true` already on (line 135), the polling is mostly
duplicate work — wasted DB reads and mobile battery.

**Options:**
- **A.** Drop `refetchInterval`; rely on focus refetch + react-query
  staleness. Cheapest.
- **B.** Subscribe to `chores` table changes via Supabase Realtime; on
  insert/update/delete, call `queryClient.invalidateQueries`. Most correct,
  cross-tab updates included.

**Done when:**
- `refetchInterval` removed from chore queries.
- If going realtime, the subscription cleans up on unmount and doesn't
  re-subscribe on every render.

---

## 3. [P1] Wrap expense create/edit/delete in a Postgres RPC

`addExpenseAction` / `editExpenseAction` / `deleteExpenseAction` do N
separate inserts/updates today. If any single statement fails mid-way the
DB ends up half-applied (expense row created, splits missing, etc.). Same
fix shape as `settle_payment`: one transactional RPC per operation.

**Scope:**
- Write `create_expense(p_input jsonb)` + `update_expense(p_id, p_input)` +
  `delete_expense(p_id)` Postgres functions.
- Have server actions call them via `supabase.rpc`.
- Tests for partial-failure rollback.

**Done when:**
- Killing the Node process mid-action leaves no orphan splits / expenses.
- Existing UI flows still pass `pnpm test`.

---

## 4. [P1] Fix the 11 pre-existing test failures

`pnpm test` on `main` shows 11 failures (all in `__tests__/components/expense/
expense-dialog.test.tsx` and a handful in hook tests). They're not introduced
by recent work — but as long as they're red they camouflage future
regressions. Either fix or delete.

**Done when:** `pnpm test` exits 0.

---

## 5. [P2] Drop the `any` shotgun in `lib/actions/expense.ts`

Line 251 and a few siblings: `(split: any) => split.user_id !== user.id &&
split.is_settled`. The codebase has proper types in `schema.alias.ts` —
using them would have caught the orphan-split logic bug we found in
settlement before it shipped.

**Scope:** ~40 `any` usages across `hooks/`, `lib/`, `components/`. Most are
trivial (`Tables<'foo'>`). The scraping/LLM code is harder — leave for now.

**Done when:**
- `(split: any)` patterns in expense/chore actions are gone.
- `tsc` still clean.

---

## 6. [P2] Fix `next lint` for Next 16

`pnpm lint` is broken because `next lint` was removed in Next 16. Repo
currently has no working lint command.

**Options:**
- Migrate to `eslint .` directly (Next's recommended path) — requires an
  `eslint.config.mjs` and dev-dep updates.
- Adopt `biome` (faster, single tool for lint + format).

**Done when:** `pnpm lint` runs and either passes or surfaces real findings.

---

## 7. [P2] Resolve the dangling `// TODO: Show toast notification`s

Three silent failures in the invitation flow:
- `lib/actions/household.ts:502`
- `components/household/invite-code-card.tsx:24`
- `components/household/invite-member-dialog.tsx:44`

**Done when:** every TODO either has a toast, is implemented, or is deleted
along with the dead code.

---

## 8. [P2] `tsc_output.txt` is committed at repo root

Looks like a debug artifact. Should be `.gitignore`d (and the existing file
deleted from history if it's noisy).

**Done when:** file removed, gitignore updated.

---

## 9. [P2] SSR/streaming for `/payments` initial paint

`app/payments/page.tsx` shows `<LoadingSpinner />` over the whole page until
`useSettlements` finishes ~3 sequential Supabase calls (auth → profile →
members → balances+notes). First paint could include the static shell + a
skeleton; balances could stream in via React Server Components.

**Done when:** Lighthouse FCP on `/payments` improves measurably, no
fullscreen spinner on first load.

---

## 10. [P2] Deduplicate loading flags in `useExpenses`

`isAddingExpense`, `isEditingExpense`, `isDeletingExpense`, `isSettlingExpense`
all duplicate what `useMutation().isPending` already tracks. Refactor to
react-query mutations and drop the local `useState`s. Same drift exists in
other hooks worth a sweep.

**Done when:** no `useState<boolean>` for `isX-ing` flags remain in hooks
that already use react-query mutations.

---

## 11. [P2] Webhook auth: shared secret → signed payload

`SUPABASE_WEBHOOK_SECRET` is fine for personal use but trivially leaks if
the env var is exposed. If this ever goes multi-tenant, switch to HMAC over
body (or signed JWT) so an attacker can't replay an intercepted header.

**Done when:** webhook routes verify a signature derived from request body
+ timestamp, not just a static header.

---

## 12. [P2] Rate-limit user-triggered server actions

Settlement and expense creation have no rate limit. A misbehaving client
(or a stuck retry loop) can hammer the DB. Cheapest fix: an in-memory or
Upstash-Redis bucket keyed on `user_id`.

**Done when:** rapid identical settlement requests get a 429 instead of
multiple `payment_notes` rows.

---

## Suggested order

1. #4 (clean test baseline first — unblocks every other change)
2. #1 (consistency / security)
3. #3 (atomicity for expenses)
4. #2 (perf / battery)
5. Everything else as it bothers you.
