# Flatastic — IMPROVEMENTS.md Roadmap & Batch 1 Spec

**Date:** 2026-05-17
**Status:** Draft, awaiting user review
**Source:** `IMPROVEMENTS.md` (12 items, last updated prior to recent server-action migration)

---

## 0. Why this doc exists

`IMPROVEMENTS.md` lists 12 backlog items prioritised P0–P2 with a suggested
order. Two of its assumptions are now stale and a third is a true security
issue mislabeled as a refactor. This doc:

1. Re-prioritises the 12 items into 5 shippable batches.
2. Calls out which items in the source list are out of date.
3. Provides a detailed implementation spec for **Batch 1** (the first PR).
4. Leaves Batches 2–5 as roadmap entries to be specced individually when
   picked up.

---

## 1. Findings that change the original priorities

### 1.1 Item #1 (P0) is largely already done
Grep across `hooks/` and `components/` for
`supabase.from(...).insert|update|delete|upsert` returns **zero matches**.
The cited files:

- `hooks/use-settlement.ts` — only client-side **reads**. The doc itself
  notes "reads are fine through anon."
- `hooks/use-chore-rotation.ts` — already calls `createChore` server
  action.
- `app/pwa-nextjs/actions.ts` — already `'use server'`.

**Action:** demote #1 from P0 to a residual cleanup item (B3).

### 1.2 A real P0 security bug exists in `app/pwa-nextjs/actions.ts`
`subscribeUser(sub, userAgent, userId)` accepts `userId` as a parameter
from the caller and writes it directly to `push_subscriptions.user_id`
with no auth check. A malicious client can register a push subscription
under any user's ID and receive their notifications.

**Action:** promote this to the new P0, fold into B1.

### 1.3 #4's 11 test failures are concentrated
All failures are in `__tests__/components/expense/expense-dialog.test.tsx`.
At least one (the "controlled mode" test) reflects a real component bug:
`ExpenseDialog` renders its built-in trigger button even when used in
controlled mode (`open`/`onOpenChange` props supplied), instead of
deferring to the parent.

**Action:** treat #4 as both test repair and component fix.

---

## 2. Roadmap — 5 batches

| Batch | Items | Theme |
|---|---|---|
| **B1 — Hygiene & critical fix** | #4, #8, **new: subscribeUser auth** | Green tests + delete debug artifact + plug auth hole |
| **B2 — Lint baseline** | #6 | `next lint` → `eslint .` |
| **B3 — Atomicity & consistency** | #3, #1 residual | Expense RPCs + finish server-action hardening |
| **B4 — Hook hygiene** | #2, #10 | Drop chore polling, dedupe `isX-ing` flags |
| **B5 — Polish & defer** | #5, #7, #9, #11, #12 | Opportunistic; #11+#12 deferred until multi-tenant |

**Execution order:** B1 → B2 → B3 → B4 → B5 (cherry-pick).

**Why this order:**

- B1 first because failing tests camouflage future regressions and the
  auth bug is exploitable today.
- B2 before B3/B5 because type-tightening (#5) and other static-analysis
  wins need a working linter.
- B3 before B4 because atomicity is correctness, polling is performance.
- B5 last and partially deferrable: #11 (webhook HMAC) and #12 (rate
  limiting) are over-engineering for a single-tenant personal app — defer
  until multi-tenant is on the roadmap.

---

## 3. Batch 1 — detailed spec

Three independent changes, one PR. Each is small enough to review in
isolation.

### 3.1 B1.a — Fix 11 failing tests

**File:** `__tests__/components/expense/expense-dialog.test.tsx` and
`components/expense/expense-dialog.tsx`.

**Procedure:**

1. Run `pnpm test -- --testPathPattern="expense-dialog"` and read every
   failure.
2. Classify each failure as:
   - **Test drift** — selector / placeholder / text changed in the
     component. Fix the test to match current markup.
   - **Real regression** — component behaviour is wrong. Fix the
     component, leave the test as the canonical expectation.
3. Known real regression to fix: in controlled mode (when both `open`
   and `onOpenChange` are passed), `ExpenseDialog` must not render its
   own `<DialogTrigger>` button. The parent supplies the trigger.

**Done when:**

- `pnpm test` exits 0.
- No `.skip`, `xit`, or `xfail` added.
- The `controlled mode` test passes without changes (it documents
  intended behaviour).

### 3.2 B1.b — Fix `subscribeUser` auth bug

**File:** `app/pwa-nextjs/actions.ts:12` plus any callers in
`app/pwa-nextjs/`.

**Current signature:**

```ts
export async function subscribeUser(sub: PushSubscription, userAgent?: string, userId?: string)
```

**New signature:**

```ts
export async function subscribeUser(sub: PushSubscription, userAgent?: string)
```

**Changes:**

1. Drop the `userId` parameter.
2. Inside the action, call `supabase.auth.getUser()`. If no user, return
   `{ success: false, error: 'unauthenticated' }`.
3. Use the authenticated `user.id` for the `user_id` column on upsert.
4. Add Zod schema in `lib/validations/` for `PushSubscription`:
   ```ts
   const PushSubscriptionSchema = z.object({
     endpoint: z.string().url(),
     keys: z.object({
       p256dh: z.string().min(1),
       auth: z.string().min(1),
     }),
   });
   ```
   Validate `sub` before touching the DB.
5. Update all callers to stop passing `userId`. Search:
   `grep -rn "subscribeUser(" app/ components/ hooks/`.

**Done when:**

- `subscribeUser` no longer accepts a `userId` parameter.
- Unauthenticated calls return the `unauthenticated` error and write
  nothing.
- Zod rejection on a malformed `sub` returns a validation error and
  writes nothing.
- All callers updated, `tsc` clean.

### 3.3 B1.c — Delete `tsc_output.txt` + gitignore

**Changes:**

1. `git rm tsc_output.txt`.
2. Add to `.gitignore`:
   ```
   tsc_output.txt
   *.tsbuildinfo
   ```

**Done when:** file removed, gitignore updated, `git status` clean.

### 3.4 Combined test plan for B1

- `pnpm test` → 0 failures (covers 3.1).
- New unit test for 3.2: stub `auth.getUser()` to return null → expect
  `unauthenticated`; stub it to return user A → call with sub →
  inserted row has `user_id = A`.
- Manual smoke: enable push in browser as user A, inspect
  `push_subscriptions` row — `user_id` matches.

### 3.5 Risks

- Fixing the controlled-mode `ExpenseDialog` may break other consumers
  that rely on the auto-rendered trigger. Mitigate by grepping for
  `<ExpenseDialog` usages and adding an explicit `<DialogTrigger>`
  wrapper where needed. The test suite will surface anything missed.
- The `userId`-drop in `subscribeUser` is a breaking signature change.
  Caller search is mandatory; do not commit if any caller still passes
  three arguments.

---

## 4. Batches 2–5 — roadmap entries (no implementation detail here)

Each entry lists scope, "done when," and any sequencing constraint. A
detailed spec will be written when the batch is picked up.

### B2 — Lint baseline (item #6)
- Migrate `pnpm lint` from `next lint` (removed in Next 16) to
  `eslint .` with an `eslint.config.mjs`.
- Done when: `pnpm lint` runs to completion (pass or surface findings).
- Sequencing: must come before B5's #5 (type-tightening) so we can lean
  on the linter while sweeping `any`s.

### B3 — Atomicity & consistency (items #3, #1 residual)
- #3: write `create_expense` / `update_expense` / `delete_expense`
  Postgres functions (same shape as `settle_payment`), have server
  actions call them via `supabase.rpc`. Add partial-failure tests.
- #1 residual:
  - Move `loadBalances` / `loadCompletedSettlements` reads in
    `hooks/use-settlement.ts` to a server action with `revalidateTag`
    (eliminates client-side waterfall on mount).
  - The auth fix for push subscriptions ships in B1; nothing left for #1
    once that lands.
- Done when: killing the Node process mid-action leaves no orphan
  expense/splits; `/payments` no longer makes three sequential client
  Supabase calls on mount.

### B4 — Hook hygiene (items #2, #10)
- #2: remove `refetchInterval: 30000` from chore queries; rely on
  `refetchOnWindowFocus` + react-query staleness.
- #10: replace `isAddingExpense` / `isEditingExpense` / etc. local
  `useState<boolean>` flags with `useMutation().isPending`.
- Done when: no `refetchInterval` in chore queries; no `useState<boolean>`
  `isX-ing` flags in hooks that already use react-query mutations.

### B5 — Polish (items #5, #7, #9, #11, #12)
Opportunistic. Each is independent.

- **#5** — Replace `(split: any)` and ~40 similar `any` shotguns in
  `hooks/`, `lib/`, `components/` with `Tables<'foo'>` / aliases from
  `schema.alias.ts`. Skip scraping/LLM code.
- **#7** — Resolve three `// TODO: Show toast notification`s in the
  invitation flow (`lib/actions/household.ts:502`,
  `components/household/invite-code-card.tsx:24`,
  `components/household/invite-member-dialog.tsx:44`).
- **#9** — SSR/streaming for `/payments` initial paint. Static shell +
  skeleton, balances stream in via RSC. Measure Lighthouse FCP.
- **#11 — DEFERRED.** HMAC-signed webhook payloads. Only matters when
  going multi-tenant; current `SUPABASE_WEBHOOK_SECRET` is acceptable for
  a personal-use app.
- **#12 — DEFERRED.** Per-user rate limiting on server actions. Same
  reasoning as #11. Re-evaluate if abuse is observed.

---

## 5. Open questions / decisions captured

- **Q:** Should B1 also tackle the optional `loadBalances` move-to-server
  cleanup from #1 residual?
  **A:** No. Keep B1 small. That work goes in B3 alongside the expense
  RPCs (same area).

- **Q:** Migrate to Biome instead of ESLint in B2?
  **A:** Leave the choice to B2's own spec. Default = ESLint (lower
  blast radius, matches Next.js ecosystem).

---

## 6. Out of scope for this roadmap

- The chore-rotation refactor mentioned in recent commits — already
  shipped (`42af672`).
- Anything not in `IMPROVEMENTS.md` (e.g., new features). This doc is
  strictly a cleanup roadmap.
