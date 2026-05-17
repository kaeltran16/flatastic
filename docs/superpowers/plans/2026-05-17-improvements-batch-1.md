# IMPROVEMENTS Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Batch 1 from the IMPROVEMENTS roadmap — green test suite, plug a real auth hole in `subscribeUser`, and remove a committed debug artifact.

**Architecture:** No new architecture. Three independent surgical changes shipped as one PR: (a) repair four failing test files via per-file fixes, (b) refactor one server action to derive identity from `auth.getUser()` instead of trusting a client parameter, (c) gitignore cleanup.

**Tech Stack:** Next.js 16, TypeScript, Jest, React Testing Library, Supabase, Zod.

---

## Important: Spec discrepancy

The spec (`docs/superpowers/specs/2026-05-17-improvements-roadmap-design.md`) assumed all 11 test failures were in `expense-dialog.test.tsx`. They are not. Actual distribution:

| File | Failures | Root cause |
|---|---|---|
| `__tests__/hooks/use-expense.test.ts` | 1 (whole suite fails to load) | ESM transform error from `isows` (transitive via `@supabase/realtime-js`) |
| `__tests__/hooks/use-balance.test.ts` | 6 | Calculation assertion drift (investigate per test) |
| `__tests__/lib/actions/chore-template.test.ts` | 1 (`deleteChoreTemplate` soft delete) | Supabase mock returns undefined for the profile lookup |
| `__tests__/components/expense/expense-dialog.test.tsx` | 3-4 | "Add Expense" text is ambiguous (matches both trigger and submit button); placeholder text drift |

This plan covers all four files. The spec's claim of a "real component bug in controlled mode" turned out to be wrong — the component already conditionally hides the trigger (`expense-dialog.tsx:172`); the test fails because `queryByText('Add Expense')` also matches the form's submit button when the dialog is open.

---

## Files touched

**Created:**
- `__tests__/app/pwa-nextjs/actions.test.ts` — auth tests for `subscribeUser`
- `lib/validations/push-subscription.ts` — Zod schema for push subscription payload

**Modified:**
- `jest.config.js` — add `transformIgnorePatterns` override for ESM packages
- `__tests__/hooks/use-balance.test.ts` — fix calculation assertions OR fix the hook
- `__tests__/lib/actions/chore-template.test.ts` — fix supabase mock for profile lookup
- `__tests__/components/expense/expense-dialog.test.tsx` — disambiguate selectors
- `app/pwa-nextjs/actions.ts` — remove `userId` param from `subscribeUser`, derive from auth, validate `sub` with Zod
- `components/silent-subscriber.tsx` — drop the `userId` argument at call site
- `hooks/use-push-notification.ts` — drop the `userId` argument at call site
- `app/pwa-nextjs/push-notification-manager.tsx` — drop the `userId` argument at call site
- `.gitignore` — add `tsc_output.txt`

**Deleted:**
- `tsc_output.txt`

---

## Task 1: Fix `use-expense.test.ts` ESM transform error

**Files:**
- Modify: `jest.config.js`

**Background:** The test suite fails before any test runs because `isows/_esm/native.js` uses `import` syntax and Jest does not transform `node_modules` by default. The path of fault: `lib/supabase/server.ts` → `@supabase/ssr` → `@supabase/supabase-js` → `@supabase/realtime-js` → `isows`.

- [ ] **Step 1: Confirm the failure**

Run: `pnpm test --testPathPatterns="use-expense"`
Expected: `SyntaxError: Cannot use import statement outside a module` referencing `isows/_esm/native.js`.

- [ ] **Step 2: Add `transformIgnorePatterns` override to `jest.config.js`**

Replace the `customJestConfig` object with:

```js
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
  ],
  // Transform these ESM packages that ship as native ESM in node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(isows|@supabase/realtime-js|@supabase/.*)/)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};
```

The only addition vs current is the `transformIgnorePatterns` key. `next/jest` defaults to ignoring all of `node_modules`; this re-includes the ESM Supabase packages.

- [ ] **Step 3: Re-run and verify the suite loads**

Run: `pnpm test --testPathPatterns="use-expense"`
Expected: Suite loads. Individual tests may still pass or fail on their own merit, but no more `SyntaxError`. If individual tests now fail, **add them to Task 2/3-style sub-tasks before committing**; do not commit a partial green.

- [ ] **Step 4: Run full suite to confirm no regression in other files**

Run: `pnpm test`
Expected: Same set of failures as before *minus* the `use-expense` suite-load failure. If a previously-passing test now fails because of the broader transform pattern, narrow the regex.

- [ ] **Step 5: Commit**

```bash
git add jest.config.js
git commit -m "fix(test): transform ESM supabase packages so use-expense suite loads"
```

---

## Task 2: Fix `chore-template.test.ts` soft-delete failure

**Files:**
- Modify: `__tests__/lib/actions/chore-template.test.ts`
- Reference (do not modify unless necessary): `lib/actions/chore-template.ts`

**Background:** `deleteChoreTemplate › should soft delete a chore template` throws `TypeError: Cannot destructure property 'data' of '(intermediate value)' as it is undefined` at the `const { data: profile, error: profileError } = await supabase.from('profiles')...` lookup. The mock returns `undefined` instead of `{ data, error }`.

- [ ] **Step 1: Read the test and identify the missing mock**

Read `__tests__/lib/actions/chore-template.test.ts` for the `deleteChoreTemplate › should soft delete` block. Identify which `supabase.from(...)` chains are mocked and which are not. The profile lookup at `lib/actions/chore-template.ts:230` (approx) needs a mock returning `{ data: { household_id: 'h1' }, error: null }`.

- [ ] **Step 2: Add the missing profile-lookup mock**

Inside the test (or its `beforeEach`), wire the mock so that the profile lookup chain (`from('profiles').select(...).eq(...).single()`) resolves to `{ data: { id: 'user-1', household_id: 'household-1' }, error: null }`. Match the pattern already used by other tests in the same file that exercise the same action successfully (look at `createChoreTemplate` or `updateChoreTemplate` tests for the working mock shape).

- [ ] **Step 3: Run the test**

Run: `pnpm test --testPathPatterns="chore-template"`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/lib/actions/chore-template.test.ts
git commit -m "fix(test): provide profile-lookup mock for deleteChoreTemplate test"
```

---

## Task 3: Fix `use-balance.test.ts` six failing calculations

**Files:**
- Modify: `__tests__/hooks/use-balance.test.ts` **or** `hooks/use-balance.ts` (depending on root cause)

**Background:** Six calculation tests failing — names suggest balance-computation drift. Could be test assertions out of date (e.g., rounding rule changed in recent expense-splits refactor) or a real regression in `calculateBalances`. Determine which by reading the failure diff.

- [ ] **Step 1: Run the suite to capture exact assertion diffs**

Run: `pnpm test --testPathPatterns="use-balance"`
Expected: Read each `Expected` / `Received` pair and the call site in the test. Note them down before doing anything else.

- [ ] **Step 2: Classify each failure**

For each failure decide:
- **Test drift** (the calculation rule legitimately changed — e.g., 2-decimal rounding was added; this is consistent with commit `f33408e` "Fix expense split rounding"). Update the assertion.
- **Real regression** (the test expectation was correct, the hook has a bug). Fix the hook.

The recent commit `f33408e Fix expense split rounding, edit rollback, and filter total` is a strong signal that test drift is likely — those tests were probably written before that fix.

- [ ] **Step 3: Apply fixes**

For each of the 6 tests, update the expected value (if test drift) or modify `hooks/use-balance.ts` (if regression). Show the exact `Expected:` numbers — do not paper over with `expect.closeTo` unless rounding genuinely requires it.

- [ ] **Step 4: Run the suite**

Run: `pnpm test --testPathPatterns="use-balance"`
Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

If only the test file changed:
```bash
git add __tests__/hooks/use-balance.test.ts
git commit -m "fix(test): align use-balance assertions with rounded split amounts"
```

If the hook also changed, name the hook fix in the message:
```bash
git add hooks/use-balance.ts __tests__/hooks/use-balance.test.ts
git commit -m "fix(use-balance): <describe the bug>"
```

---

## Task 4: Fix `expense-dialog.test.tsx` failures

**Files:**
- Modify: `__tests__/components/expense/expense-dialog.test.tsx`

**Background:** Four failing tests. Component is fine — failures stem from ambiguous text selectors. Specifically:

- `Controlled Mode › should work in controlled mode` (line 347): `queryByText('Add Expense')` matches both the (correctly-suppressed) trigger button *and* the form's submit button which is visible once the dialog is open.
- `Form Submission › should call onSubmit ...` and `should handle submission errors gracefully` (line 225): `getByPlaceholderText(/description/i)` fails — the actual placeholder is `"e.g., Weekly groceries, Internet bill"` (`components/expense/expense-form.tsx:431`), which does not contain "description".
- `Edit Mode › should handle custom split in edit mode` (line 321): click on edit trigger throws an `AggregateError` — likely a cascading consequence of the same selector / setup issues. Re-run after fixing the above and see if it persists; if so, treat as a separate sub-step.

- [ ] **Step 1: Fix the controlled-mode selector**

In `__tests__/components/expense/expense-dialog.test.tsx`, replace lines 343-348 with:

```tsx
      // Dialog should be open
      expect(screen.getByText('Add New Expense')).toBeInTheDocument();

      // No trigger button should be rendered in controlled mode.
      // Use role+name so we don't match the form's submit button.
      expect(
        screen.queryByRole('button', { name: 'Add Expense', expanded: false })
      ).not.toBeInTheDocument();
    });
```

The `expanded: false` filter targets the Radix `DialogTrigger` (which has `aria-expanded`), not the plain submit button.

- [ ] **Step 2: Fix the description placeholder selector**

In `__tests__/components/expense/expense-dialog.test.tsx`, replace both occurrences of:

```tsx
      const descriptionInput = screen.getByPlaceholderText(/description/i);
```

with:

```tsx
      const descriptionInput = screen.getByPlaceholderText(/weekly groceries/i);
```

(One occurrence is around line 185, another around line 225 — fix both.)

- [ ] **Step 3: Run the two known-broken submission tests**

Run: `pnpm test --testPathPatterns="expense-dialog" -t "Form Submission"`
Expected: Both pass.

- [ ] **Step 4: Run the controlled-mode test**

Run: `pnpm test --testPathPatterns="expense-dialog" -t "Controlled Mode"`
Expected: Pass.

- [ ] **Step 5: Run the edit-mode custom-split test**

Run: `pnpm test --testPathPatterns="expense-dialog" -t "custom split"`
Expected: Pass. If it still fails with an `AggregateError`, the click is hitting an element that fires an unrelated handler — log `screen.debug()` and identify which element. Either fix the test by selecting a more specific trigger (`screen.getByRole('button', { name: 'Edit' })`) or fix the underlying handler. Do not commit until this test is green.

- [ ] **Step 6: Run the full file**

Run: `pnpm test --testPathPatterns="expense-dialog"`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add __tests__/components/expense/expense-dialog.test.tsx
git commit -m "fix(test): disambiguate expense-dialog selectors against current markup"
```

---

## Task 5: Verify full suite is green before moving on

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: `Tests: 0 failed, ... passed`. Exit code 0.

If any test fails, do not proceed. Diagnose and either add a follow-up task here or fix inline and re-commit on the appropriate task above.

---

## Task 6: Add Zod schema for `PushSubscription`

**Files:**
- Create: `lib/validations/push-subscription.ts`

- [ ] **Step 1: Create the schema file**

Write `lib/validations/push-subscription.ts`:

```ts
import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No new type errors. (Pre-existing errors are out of scope.)

- [ ] **Step 3: Commit**

```bash
git add lib/validations/push-subscription.ts
git commit -m "feat(validation): add Zod schema for push subscription payload"
```

---

## Task 7: Write failing tests for the new `subscribeUser` contract

**Files:**
- Create: `__tests__/app/pwa-nextjs/actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/app/pwa-nextjs/actions.test.ts`:

```ts
import { subscribeUser } from '@/app/pwa-nextjs/actions';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

const validSub = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
} as const;

function buildSupabaseMock(opts: {
  user: { id: string } | null;
  upsert?: jest.Mock;
}) {
  const upsert = opts.upsert ?? jest.fn().mockReturnValue({
    select: () => ({ single: () => Promise.resolve({ data: { id: 'sub-1' }, error: null }) }),
  });
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.user ? null : { message: 'no session' },
      }),
    },
    from: jest.fn().mockReturnValue({ upsert }),
    __upsert: upsert,
  } as any;
}

describe('subscribeUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects when unauthenticated', async () => {
    mockedCreateClient.mockResolvedValue(buildSupabaseMock({ user: null }));
    const result = await subscribeUser(validSub, 'UA');
    expect(result).toEqual({ success: false, error: 'unauthenticated' });
  });

  it('uses the authenticated user id, not any client-supplied value', async () => {
    const supabase = buildSupabaseMock({ user: { id: 'real-user' } });
    mockedCreateClient.mockResolvedValue(supabase);

    await subscribeUser(validSub, 'UA');

    expect(supabase.__upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'real-user', endpoint: validSub.endpoint }),
      expect.objectContaining({ onConflict: 'endpoint' })
    );
  });

  it('rejects malformed subscription payloads', async () => {
    mockedCreateClient.mockResolvedValue(buildSupabaseMock({ user: { id: 'real-user' } }));
    const bad = { endpoint: 'not-a-url', keys: { p256dh: '', auth: '' } } as any;
    const result = await subscribeUser(bad, 'UA');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid|validation/i);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test --testPathPatterns="pwa-nextjs/actions"`
Expected: All three fail — `subscribeUser` currently has a 3rd `userId` arg and no auth/validation logic, so behaviour does not match.

- [ ] **Step 3: Commit the failing tests**

```bash
git add __tests__/app/pwa-nextjs/actions.test.ts
git commit -m "test(push): add failing tests for authenticated subscribeUser contract"
```

---

## Task 8: Make `subscribeUser` derive identity from auth + validate input

**Files:**
- Modify: `app/pwa-nextjs/actions.ts`

- [ ] **Step 1: Replace `subscribeUser` implementation**

In `app/pwa-nextjs/actions.ts`, replace the entire `subscribeUser` function (lines 12–47) with:

```ts
import { PushSubscriptionSchema } from '@/lib/validations/push-subscription';

export async function subscribeUser(
  sub: PushSubscription,
  userAgent?: string
) {
  const parsed = PushSubscriptionSchema.safeParse(sub);
  if (!parsed.success) {
    return { success: false, error: 'invalid subscription payload' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'unauthenticated' };
  }

  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          user_agent: userAgent || 'Unknown',
          user_id: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error storing subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in subscribeUser:', err);
    return { success: false, error: 'Failed to store subscription' };
  }
}
```

Make sure the import for `PushSubscriptionSchema` is added at the top of the file (group with existing imports).

- [ ] **Step 2: Run the action tests**

Run: `pnpm test --testPathPatterns="pwa-nextjs/actions"`
Expected: All three tests pass.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: `subscribeUser` callers will now error on the third argument. That's the next task — leave them for now.

- [ ] **Step 4: Commit**

```bash
git add app/pwa-nextjs/actions.ts
git commit -m "fix(push): derive user_id from auth instead of trusting client"
```

---

## Task 9: Update all `subscribeUser` callers to drop `userId`

**Files:**
- Modify: `components/silent-subscriber.tsx`
- Modify: `hooks/use-push-notification.ts`
- Modify: `app/pwa-nextjs/push-notification-manager.tsx`

- [ ] **Step 1: Find all callers (for completeness)**

Run: `grep -rn "subscribeUser(" app/ components/ hooks/`
Expected: Three call sites — the three files listed above.

- [ ] **Step 2: Update `components/silent-subscriber.tsx` (around line 87)**

Find the `subscribeUser(...)` call. Remove the third argument (`userId`). The call must end up with at most two arguments: the subscription object and an optional user-agent string.

If the surrounding code was deriving `userId` purely to pass it in (e.g., a `supabase.auth.getUser()` call whose only consumer was this argument), delete that code too — the server action handles it now.

- [ ] **Step 3: Update `hooks/use-push-notification.ts` (around line 312)**

Same treatment: drop the third argument. Delete any now-dead client-side user lookup.

- [ ] **Step 4: Update `app/pwa-nextjs/push-notification-manager.tsx` (around line 325)**

Same treatment.

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors from the three modified files.

- [ ] **Step 6: Full test run**

Run: `pnpm test`
Expected: 0 failures.

- [ ] **Step 7: Commit**

```bash
git add components/silent-subscriber.tsx hooks/use-push-notification.ts app/pwa-nextjs/push-notification-manager.tsx
git commit -m "refactor(push): drop client-supplied userId from subscribeUser callers"
```

---

## Task 10: Manual verification of push subscription

Done in the browser; not test-automatable end-to-end without a real push service.

- [ ] **Step 1: Boot the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Log in as a known user (note the user.id from `profiles`)**

In a browser, sign in. In a separate terminal, query Supabase:
```sql
select id, email from profiles order by created_at desc limit 5;
```
Note the logged-in user's id.

- [ ] **Step 3: Enable push notifications in the UI**

Navigate to whatever UI triggers `subscribeUser` (push-notification-manager). Allow notifications.

- [ ] **Step 4: Verify the row's `user_id`**

```sql
select endpoint, user_id from push_subscriptions order by updated_at desc limit 5;
```
Expected: the newest row's `user_id` equals the logged-in user's id from Step 2.

- [ ] **Step 5: Stop the dev server.** No commit needed — verification only.

---

## Task 11: Delete `tsc_output.txt` and gitignore it

**Files:**
- Delete: `tsc_output.txt`
- Modify: `.gitignore`

- [ ] **Step 1: Add `tsc_output.txt` to `.gitignore`**

In `.gitignore`, find the `# typescript` block (already contains `*.tsbuildinfo` and `next-env.d.ts`) and append a line:

```
tsc_output.txt
```

So the block reads:
```
# typescript
*.tsbuildinfo
next-env.d.ts
tsc_output.txt
```

- [ ] **Step 2: Delete the file**

```bash
git rm tsc_output.txt
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore and remove tsc_output.txt debug artifact"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test run**

Run: `pnpm test`
Expected: `Tests: 0 failed`, exit code 0.

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: No new errors introduced by this batch. Pre-existing errors documented elsewhere are out of scope.

- [ ] **Step 3: Working tree clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 4: Confirm commit log**

Run: `git log --oneline -12`
Expected: One commit per task (≈8 commits), all on `main` (or your working branch), all with clear messages.

---

## Out of scope for Batch 1

- Batch 2 (lint), Batch 3 (atomicity / settlement reads to server), Batch 4 (hook polling), Batch 5 (polish). Each gets its own spec + plan when picked up.
- Pre-existing `tsc` errors unrelated to the files touched here.
- Any rate limiting, HMAC webhook signing, or multi-tenant hardening.
