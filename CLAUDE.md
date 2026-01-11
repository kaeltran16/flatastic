# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flatastic is a household management PWA built with Next.js 16, React 19, TypeScript, Supabase, and Tailwind CSS. Features include chore tracking/rotation, expense splitting, payment settlements, penalty funds, and push notifications.

**Production URL:** https://flatastic02.vercel.app

## Commands

```bash
pnpm dev          # Development server with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
pnpm test -- --testPathPattern="expense"  # Run specific test file
```

**Package manager:** pnpm (required, version 10.8.0)

## Architecture

### Data Flow Pattern
```
User Action → Client Component (hook) → Server Action → Zod Validation → Auth Check → Supabase Mutation → revalidatePath() → UI Update
```

### Supabase Clients

Three client types exist in `lib/supabase/`:

- **`server.ts`** - For Server Components and Server Actions. Uses cookies for auth.
- **`client.ts`** - For Client Components. Browser-side client.
- **`system.ts`** - For webhooks. Uses service role key, bypasses RLS.

### Server Actions Pattern

All mutations use Server Actions in `lib/actions/`. Standard structure:

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function getAuthenticatedUserWithHousehold() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Get profile with household_id...
  return { user, userProfile, supabase };
}

export async function createResource(data: FormData) {
  const validated = Schema.parse(data);
  const { user, userProfile, supabase } = await getAuthenticatedUserWithHousehold();
  // Verify household membership, mutate, revalidatePath
}
```

### Key Directories

- **`lib/actions/`** - Server Actions (chore, expense, household, user, notification)
- **`lib/validations/`** - Zod schemas for form validation
- **`lib/supabase/schema.alias.ts`** - Type aliases (Chore, Expense, Profile, etc.)
- **`hooks/`** - Custom React hooks wrapping server actions
- **`components/ui/`** - shadcn/ui components (47 components)
- **`app/api/webhooks/`** - Webhook endpoints for cron jobs

### Database Types

Types are auto-generated in `lib/supabase/schema.types.ts`. Use aliases from `schema.alias.ts`:

```typescript
import { Chore, ChoreInsert, ChoreUpdate, Profile } from '@/lib/supabase/schema.alias';
```

Extended types for joins:
- `ChoreWithProfile` - Chore with assignee/creator profiles
- `ExpenseWithSplits` - Expense with splits and payer
- `HouseholdWithMembers` - Household with member profiles

### Webhooks & Cron Jobs

GitHub Actions runs cron jobs at 1:00 PM and 3:00 PM UTC daily (`.github/workflows/cron-job.yaml`):
- `update-overdue-chore-status` - Marks overdue chores
- `chore-reminder` - Sends expiration notifications
- `auto-create-recurring-chores` - Creates recurring chore instances

Webhooks require `x-webhook-secret` header matching `SUPABASE_WEBHOOK_SECRET`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_KEY                          # Service role for webhooks
SUPABASE_WEBHOOK_SECRET                       # Webhook auth
NEXT_PUBLIC_VAPID_PUBLIC_KEY                  # Web Push
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_EMAIL
```

## Key Patterns

### Authentication Check
Middleware in `lib/supabase/middleware.ts` redirects unauthenticated users to `/auth/login`. Webhooks are excluded from middleware.

### Form Validation
Define Zod schemas in `lib/validations/`, use with React Hook Form:
```typescript
const form = useForm<z.infer<typeof CreateChoreSchema>>({
  resolver: zodResolver(CreateChoreSchema),
});
```

### Client Components
Mark with `'use client'`. Use hooks from `hooks/` for mutations:
```typescript
const { createChore, isLoading } = useChore();
```

### Styling
Use `cn()` from `lib/utils` for conditional classes:
```typescript
className={cn('base-classes', condition && 'conditional-class')}
```

## Database Tables

Core tables: `profiles`, `households`, `chores`, `chore_templates`, `template_assignment_tracker`, `expenses`, `expense_splits`, `payment_notes`, `fund_penalties`, `notifications`, `push_subscriptions`, `pending_invitations`

Key enums:
- `ChoreStatus`: 'pending' | 'completed' | 'overdue'
- `RecurringType`: 'daily' | 'weekly' | 'monthly' | 'none'
- `SplitType`: 'equal' | 'custom' | 'percentage'
