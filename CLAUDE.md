# CLAUDE.md - Flatastic Codebase Guide for AI Assistants

> **Last Updated**: 2025-11-18
> **Project**: Flatastic - Household Management Application
> **Tech Stack**: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS
> **Production URL**: https://flatastic02.vercel.app

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Architecture Patterns](#architecture-patterns)
5. [Database Schema](#database-schema)
6. [Development Workflows](#development-workflows)
7. [Code Conventions](#code-conventions)
8. [Authentication & Authorization](#authentication--authorization)
9. [Data Fetching & State Management](#data-fetching--state-management)
10. [Testing Guidelines](#testing-guidelines)
11. [Deployment & CI/CD](#deployment--cicd)
12. [Common Tasks & Examples](#common-tasks--examples)
13. [Important Files Reference](#important-files-reference)

---

## Project Overview

**Flatastic** is a full-stack Progressive Web Application (PWA) for household management, enabling roommates to:
- Track and assign chores with recurring schedules
- Split and manage shared expenses
- Settle payments between household members
- Manage penalty funds for missed chores
- Receive push notifications for reminders
- Automate chore rotation and assignment

### Key Characteristics
- **Modern Stack**: Built with Next.js 15 App Router, React 19, and TypeScript
- **Full Type Safety**: End-to-end TypeScript with generated Supabase types
- **PWA-Ready**: Installable, works offline, supports push notifications
- **Production Monitoring**: Sentry error tracking, Vercel Analytics
- **Automated Workflows**: GitHub Actions cron jobs for webhooks
- **Server-First**: Leverages React Server Components and Server Actions

---

## Technology Stack

### Core Framework
- **Next.js 15.5.2** - App Router with Turbopack
- **React 19.1.1** - Server Components, Suspense, Transitions
- **TypeScript 5.9.2** - Strict mode enabled

### Backend & Database
- **Supabase** - PostgreSQL database with PostgREST API
  - `@supabase/supabase-js` (^2.53.0)
  - `@supabase/ssr` (^0.6.1) - Cookie-based auth for SSR
- **PostgreSQL** - 14 tables, 9 RPC functions

### UI & Styling
- **Tailwind CSS 4.1.11** - Utility-first CSS
- **shadcn/ui** - 40+ Radix UI-based components (New York style)
- **Lucide React** (^0.536.0) - Icon library
- **Geist & Geist Mono** - Google Fonts

### State Management
- **TanStack Query v5** (^5.85.5) - Server state, caching, optimistic updates
- **React Hook Form** (^7.62.0) - Form state and validation
- **Zod v4** (^4.0.14) - Runtime schema validation

### PWA & Notifications
- **@ducanh2912/next-pwa** (^10.2.9) - Service worker, offline support
- **web-push** (^3.6.7) - Web Push API with VAPID

### Development Tools
- **pnpm 10.8.0** - Package manager (required)
- **ESLint 9** - Linting with Next.js config
- **Jest 30** - Testing framework
- **@testing-library/react 16** - Component testing

### Monitoring & Analytics
- **Sentry** - Error tracking and performance monitoring
- **Vercel Analytics** - User analytics
- **Vercel Speed Insights** - Performance metrics

---

## Directory Structure

```
/home/user/flatastic/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   ├── dashboard/               # Main dashboard
│   ├── household/               # Household management
│   ├── chores/                  # Chore management
│   ├── expenses/                # Expense tracking
│   ├── payments/                # Payment settlements
│   ├── penalty-fund/            # Penalty fund feature
│   ├── chore-scheduler/         # Chore rotation scheduler
│   ├── profile/                 # User profile
│   ├── auth/                    # Authentication flows
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   ├── update-password/
│   │   ├── callback/
│   │   └── confirm/
│   └── api/                     # API routes
│       └── webhooks/            # Webhook endpoints
│           ├── update-overdue-chore-status/
│           ├── chore-reminder/
│           ├── chore-auto-creator/
│           └── notifications/
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components (40+)
│   ├── dashboard/               # Dashboard components
│   ├── household/               # Household components
│   ├── chore/                   # Chore components
│   ├── chore-scheduler/         # Scheduler components
│   ├── expense/                 # Expense components
│   ├── payment/                 # Payment components
│   └── tutorial/                # Onboarding components
├── lib/                         # Core utilities
│   ├── actions/                 # Server Actions
│   │   ├── chore.ts
│   │   ├── expense.ts
│   │   ├── household.ts
│   │   ├── notification.ts
│   │   ├── user.ts
│   │   └── auth.ts
│   ├── supabase/               # Supabase config
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   ├── middleware.ts       # Auth middleware
│   │   ├── system.ts           # System/admin client
│   │   ├── schema.types.ts     # Generated types (803 lines)
│   │   └── schema.alias.ts     # Type aliases
│   ├── validations/            # Zod schemas
│   │   ├── chore.ts
│   │   └── expense.ts
│   ├── query-provider.tsx      # TanStack Query setup
│   ├── query-keys.ts           # Query key factory
│   ├── push-notification.ts    # Push notification logic
│   └── utils.ts                # Utility functions
├── hooks/                       # Custom React hooks (13 total)
│   ├── use-chore.ts
│   ├── use-expense.ts
│   ├── use-balance.ts
│   ├── use-household.ts
│   └── ...
├── __tests__/                   # Test files
│   ├── integration/
│   ├── components/
│   └── hooks/
├── public/                      # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── *.png                   # App icons
├── worker/                      # Custom service worker logic
├── supabase/                    # Supabase configuration
├── data/                        # Static data files
└── utils/                       # Utility functions
```

---

## Architecture Patterns

### 1. Next.js App Router Patterns

**Server Components by Default**
- All components are Server Components unless marked with `'use client'`
- Server Components can directly query Supabase
- Reduces client-side JavaScript bundle

**Client Components**
- Used for interactivity, hooks, and browser APIs
- Marked with `'use client'` directive
- Examples: forms, dialogs, interactive UI

**Server Actions**
- All data mutations use Server Actions (`'use server'`)
- Located in `/lib/actions/*`
- Pattern: validate → authenticate → authorize → mutate → revalidate

**Route Organization**
- Feature-based routes in `/app/*`
- Grouped auth routes in `/app/auth/*`
- API routes in `/app/api/*`

**Loading & Error States**
- `loading.tsx` - Automatic loading UI
- `error.tsx` - Error boundaries
- `global-error.tsx` - Global error handler

### 2. Component Architecture

**Feature-Based Organization**
```
components/
├── ui/              # Shared UI primitives (buttons, dialogs, etc.)
├── chore/           # Chore-specific components
├── expense/         # Expense-specific components
└── household/       # Household-specific components
```

**Component Patterns**
- **Composition over Inheritance**: Small, reusable components
- **Barrel Exports**: Use `index.ts` for clean imports
- **Controlled Components**: Forms use React Hook Form
- **Optimistic Updates**: TanStack Query for instant feedback

### 3. Data Flow Pattern

```
User Action
    ↓
Client Component (with custom hook)
    ↓
Server Action (lib/actions/*)
    ↓
Zod Validation (lib/validations/*)
    ↓
Authentication Check (Supabase)
    ↓
Authorization Check (household membership)
    ↓
Database Mutation (Supabase)
    ↓
revalidatePath()
    ↓
UI Auto-Updates
```

### 4. Server Action Pattern

All Server Actions follow this structure:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ValidationSchema } from '@/lib/validations/*';

// Custom error class
class ActionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ActionError';
  }
}

// Helper: Get authenticated user with household
async function getAuthenticatedUserWithHousehold() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ActionError('User not authenticated', 'NO_USER');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile.household_id) {
    throw new ActionError('User not in household', 'NO_HOUSEHOLD');
  }

  return { user, userProfile: profile, supabase };
}

// Server action
export async function createResource(formData: FormData) {
  try {
    // 1. Validate input
    const validatedData = ValidationSchema.parse(formData);

    // 2. Authenticate & authorize
    const { user, userProfile, supabase } =
      await getAuthenticatedUserWithHousehold();

    // 3. Verify household membership
    if (userProfile.household_id !== validatedData.household_id) {
      throw new ActionError('Unauthorized', 'UNAUTHORIZED');
    }

    // 4. Mutate database
    const { data, error } = await supabase
      .from('table')
      .insert({ ...validatedData, created_by: user.id });

    if (error) throw error;

    // 5. Revalidate paths
    revalidatePath('/resource');

    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Database Schema

### Core Tables (14 total)

#### 1. `profiles`
User profile information linked to Supabase Auth.

```typescript
{
  id: string              // PK, references auth.users
  email: string
  full_name: string | null
  avatar_url: string | null
  household_id: string | null  // FK to households
  is_available: boolean | null  // For chore rotation
  payment_link: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}
```

#### 2. `households`
Household/flat information.

```typescript
{
  id: string              // PK
  name: string
  admin_id: string        // FK to profiles
  created_by: string      // FK to profiles
  invite_code: string | null
  created_at: string
  updated_at: string
}
```

#### 3. `chores`
Chore assignments and tracking.

```typescript
{
  id: string              // PK
  name: string
  description: string | null
  household_id: string    // FK to households
  assigned_to: string | null  // FK to profiles
  created_by: string      // FK to profiles
  due_date: string | null
  status: 'pending' | 'completed' | 'overdue' | null
  recurring_type: 'daily' | 'weekly' | 'monthly' | 'none' | null
  recurring_interval: number | null
  template_id: string | null  // FK to chore_templates
  created_at: string
  updated_at: string
}
```

#### 4. `chore_templates`
Predefined chore templates for rotation.

```typescript
{
  id: string              // PK
  name: string
  description: string | null
  household_id: string | null  // FK to households
  created_by: string | null    // FK to profiles
  is_active: boolean | null
  is_custom: boolean | null
  created_at: string
  updated_at: string
}
```

#### 5. `template_assignment_tracker`
Tracks chore rotation order.

```typescript
{
  id: string              // PK
  template_id: string     // FK to chore_templates
  household_id: string    // FK to households
  last_assigned_user_id: string  // FK to profiles
  assignment_order: Json  // Array of user IDs in rotation
  created_at: string
  updated_at: string
}
```

#### 6. `expenses`
Shared expense tracking.

```typescript
{
  id: string              // PK
  description: string
  amount: number
  household_id: string    // FK to households
  paid_by: string         // FK to profiles
  date: string
  category: 'groceries' | 'utilities' | 'household' | 'rent' |
            'entertainment' | 'transport' | 'other' | null
  split_type: 'equal' | 'custom' | null
  created_at: string
  updated_at: string
}
```

#### 7. `expense_splits`
Individual expense split tracking.

```typescript
{
  id: string              // PK
  expense_id: string      // FK to expenses
  user_id: string         // FK to profiles
  amount_owed: number
  is_settled: boolean | null
  created_at: string
}
```

#### 8. `payment_notes`
Payment settlements between users.

```typescript
{
  id: string              // PK
  from_user_id: string    // FK to profiles
  to_user_id: string      // FK to profiles
  amount: number
  note: string | null
  created_at: string
  updated_at: string
}
```

#### 9. `fund_penalties`
Penalty fund for missed chores.

```typescript
{
  id: string              // PK
  household_id: string    // FK to households
  user_id: string         // FK to profiles
  chore_id: string | null // FK to chores
  amount: number
  reason: string
  description: string | null
  created_at: string
  updated_at: string
}
```

#### 10. `notifications`
User notifications.

```typescript
{
  id: string              // PK
  user_id: string | null  // FK to profiles
  household_id: string | null  // FK to households
  title: string
  message: string
  type: 'chore_reminder' | 'expense_added' | 'payment_due' | 'system'
  is_read: boolean | null
  is_urgent: boolean | null
  push_sent: boolean | null
  push_sent_at: string | null
  created_at: string
}
```

#### 11. `push_subscriptions`
Web Push subscription endpoints.

```typescript
{
  id: string              // PK
  user_id: string | null  // FK to profiles
  endpoint: string        // Push subscription endpoint
  p256dh: string          // Encryption key
  auth: string            // Auth secret
  user_agent: string | null
  created_at: string
  updated_at: string
}
```

#### 12. `pending_invitations`
Household invitation tracking.

```typescript
{
  id: string              // PK
  household_id: string    // FK to households
  invited_by: string      // FK to profiles
  invited_email: string
  message: string | null
  expires_at: string      // Expiration timestamp
  created_at: string
}
```

### Database Functions (RPCs)

1. **`generate_invite_code()`** - Generates unique household invite codes
2. **`get_user_household_id()`** - Returns current user's household ID
3. **`create_notification_with_push()`** - Creates notification + triggers push
4. **`create_user_notification()`** - Creates user-specific notification
5. **`create_household_notification()`** - Creates household-wide notification
6. **`create_expense_notification()`** - Notifies about new expense
7. **`create_chore_reminder_notification()`** - Sends chore reminder
8. **`notify_expense_added()`** - Triggers expense notification
9. **`cleanup_expired_invitations()`** - Removes expired invites

### Type System

**Generated Types**: `/lib/supabase/schema.types.ts` (803 lines)
- Auto-generated from Supabase schema
- Complete type safety for all tables and functions

**Type Aliases**: `/lib/supabase/schema.alias.ts`
```typescript
export type Chore = Database['public']['Tables']['chores']['Row'];
export type ChoreInsert = Database['public']['Tables']['chores']['Insert'];
export type ChoreUpdate = Database['public']['Tables']['chores']['Update'];
export type ChoreStatus = 'pending' | 'completed' | 'overdue';
export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'none';
```

**Extended Types**:
```typescript
export type ChoreWithProfile = Chore & {
  profiles: Profile | null;
};

export type ExpenseWithSplits = Expense & {
  expense_splits: ExpenseSplit[];
  paid_by_profile: Profile;
};

export type HouseholdWithMembers = Household & {
  members: Profile[];
};
```

---

## Development Workflows

### Setup

```bash
# Clone repository
git clone <repo-url>
cd flatastic

# Install dependencies (pnpm required)
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in Supabase credentials

# Run development server
pnpm dev

# Access at http://localhost:3000
```

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
NEXT_PUBLIC_VAPID_EMAIL=mailto:your-email@example.com

# Webhooks
SUPABASE_WEBHOOK_SECRET=your-webhook-secret

# Optional: Sentry
SENTRY_AUTH_TOKEN=your-sentry-token
```

### Development Commands

```bash
# Development with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Branch Strategy

- **Main branch**: Production-ready code
- **Feature branches**: `claude/claude-md-<session-id>-<identifier>`
- Always create feature branches for new work
- Push to feature branch, then create PR to main

### Commit Message Conventions

Recent commit patterns show:
```
add [feature description]       # New features
fix [bug description]          # Bug fixes
update [change description]    # Updates/improvements
format [format changes]        # Code formatting
```

Examples:
- `add some dashboard stuffs`
- `add remind to pay functionality`
- `fix due date for chore scheduler creation`
- `update cron calling time`

---

## Code Conventions

### TypeScript

**Strict Mode Enabled**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Path Aliases**
```typescript
import { Button } from '@/components/ui/button';
import { createChore } from '@/lib/actions/chore';
import { useChore } from '@/hooks/use-chore';
```

### File Naming

- **Components**: `kebab-case.tsx` (e.g., `chore-dialog.tsx`)
- **Hooks**: `use-*.ts` (e.g., `use-chore.ts`)
- **Actions**: `*.ts` (e.g., `chore.ts` in `/lib/actions/`)
- **Types**: `*.types.ts` or `*.alias.ts`
- **Tests**: `*.test.ts` or `*.test.tsx`

### Component Structure

**Server Component (Default)**
```typescript
// app/chores/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function ChoresPage() {
  const supabase = await createClient();

  // Direct database query
  const { data: chores } = await supabase
    .from('chores')
    .select('*, profiles(*)');

  return (
    <div>
      {/* Render chores */}
    </div>
  );
}
```

**Client Component**
```typescript
// components/chore/chore-dialog.tsx
'use client';

import { useState } from 'react';
import { useChore } from '@/hooks/use-chore';
import { Button } from '@/components/ui/button';

export function ChoreDialog() {
  const [open, setOpen] = useState(false);
  const { createChore } = useChore();

  return (
    // Component JSX
  );
}
```

### Custom Hooks Pattern

```typescript
// hooks/use-chore.ts
'use client';

import { createChore as createChoreAction } from '@/lib/actions/chore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useChore() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createChore = async (data: ChoreFormData) => {
    setIsLoading(true);
    try {
      const result = await createChoreAction(data);
      if (result.success) {
        router.refresh();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return { createChore, isLoading };
}
```

### Validation Pattern

**Define Zod Schema**
```typescript
// lib/validations/chore.ts
import { z } from 'zod';

export const CreateChoreSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  description: z.string().max(500).nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  recurring_type: z.enum(['daily', 'weekly', 'monthly', 'none']),
  recurring_interval: z.number().int().min(1).max(365).nullable().optional(),
  household_id: z.string().uuid(),
}).refine(
  (data) => {
    if (data.recurring_type !== 'none') {
      return data.recurring_interval && data.recurring_interval > 0;
    }
    return true;
  },
  {
    message: 'Recurring interval required for recurring chores',
    path: ['recurring_interval'],
  }
);

export type CreateChoreInput = z.infer<typeof CreateChoreSchema>;
```

**Use in Server Action**
```typescript
// lib/actions/chore.ts
'use server';

import { CreateChoreSchema } from '@/lib/validations/chore';

export async function createChore(formData: ChoreFormData) {
  // Validate
  const validatedData = CreateChoreSchema.parse(formData);

  // Process...
}
```

### Styling Conventions

**Tailwind CSS with cn() utility**
```typescript
import { cn } from '@/lib/utils';

<button
  className={cn(
    'rounded-md px-4 py-2',
    'bg-primary text-primary-foreground',
    'hover:bg-primary/90',
    'disabled:opacity-50 disabled:pointer-events-none',
    className
  )}
>
  {children}
</button>
```

**shadcn/ui Component Usage**
```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Chore</DialogTitle>
    </DialogHeader>
    <form>
      <Label htmlFor="name">Name</Label>
      <Input id="name" {...register('name')} />
      <Button type="submit">Create</Button>
    </form>
  </DialogContent>
</Dialog>
```

---

## Authentication & Authorization

### Authentication Flow

```
1. User visits protected route
2. Middleware checks session (middleware.ts)
3. If no session → redirect to /auth/login
4. User logs in → Supabase Auth sets cookie
5. Middleware refreshes session on each request
6. Server Components access user via createClient()
```

### Middleware Configuration

```typescript
// middleware.ts
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude webhooks, static files, images
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Supabase Client Types

**1. Server Client** (for Server Components & Actions)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Usage in Server Component
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

**2. Browser Client** (for Client Components)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
  );
}

// Usage in Client Component
'use client';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
```

**3. System Client** (for Webhooks with Service Role)
```typescript
// lib/supabase/system.ts
import { createClient } from '@supabase/supabase-js';

export function createSystemClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,  // Service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Usage in webhooks/admin operations
const supabase = createSystemClient();
```

### Authorization Pattern

**Household Membership Check**
```typescript
async function getAuthenticatedUserWithHousehold() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get user's household
  const { data: userProfile, error: profileError } =
    await supabase
      .from('profiles')
      .select('household_id, full_name')
      .eq('id', user.id)
      .single();

  if (profileError || !userProfile.household_id) {
    throw new Error('Not in household');
  }

  return { user, userProfile, supabase };
}

// Use in Server Action
export async function createChore(data: ChoreFormData) {
  const { user, userProfile, supabase } =
    await getAuthenticatedUserWithHousehold();

  // Verify user belongs to household
  if (userProfile.household_id !== data.household_id) {
    throw new Error('Unauthorized');
  }

  // Proceed with operation...
}
```

---

## Data Fetching & State Management

### TanStack Query Setup

**Provider** (`lib/query-provider.tsx`)
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Query Keys Factory** (`lib/query-keys.ts`)
```typescript
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    household: (householdId: string) => ['expenses', householdId] as const,
  },

  balances: {
    all: ['balances'] as const,
    household: (householdId: string) => ['balances', householdId] as const,
  },

  stats: {
    all: ['stats'] as const,
    household: (householdId: string) => ['stats', householdId] as const,
  },

  members: {
    all: ['members'] as const,
    household: (householdId: string) => ['members', householdId] as const,
  },

  profile: {
    all: ['profile'] as const,
    current: () => ['profile', 'current'] as const,
  },
} as const;
```

### Data Fetching Patterns

**1. Server Component (Preferred for initial data)**
```typescript
// app/chores/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function ChoresPage() {
  const supabase = await createClient();

  const { data: chores } = await supabase
    .from('chores')
    .select('*, profiles(*)')
    .order('due_date', { ascending: true });

  return <ChoreList initialChores={chores} />;
}
```

**2. Client Component with TanStack Query**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/client';

export function ExpenseList({ householdId }: { householdId: string }) {
  const { data: expenses, isLoading } = useQuery({
    queryKey: queryKeys.expenses.household(householdId),
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('household_id', householdId);
      return data;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {expenses?.map(expense => (
        <ExpenseCard key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
```

**3. Mutations with Optimistic Updates**
```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createChore } from '@/lib/actions/chore';

export function useChore() {
  const queryClient = useQueryClient();

  const createChoreMutation = useMutation({
    mutationFn: createChore,
    onSuccess: () => {
      // Invalidate and refetch chores
      queryClient.invalidateQueries({
        queryKey: queryKeys.chores.all
      });
    },
    onError: (error) => {
      console.error('Failed to create chore:', error);
    },
  });

  return {
    createChore: createChoreMutation.mutate,
    isCreating: createChoreMutation.isPending,
  };
}
```

### Cache Invalidation

```typescript
import { revalidatePath } from 'next/cache';

// In Server Actions
export async function createChore(data: ChoreFormData) {
  // ... mutation logic

  // Revalidate affected paths
  revalidatePath('/chores');
  revalidatePath('/dashboard');

  return { success: true };
}
```

---

## Testing Guidelines

### Test Setup

**Configuration** (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
  ],
};
```

### Test Types

**1. Component Tests**
```typescript
// __tests__/components/expense/expense-dialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseDialog } from '@/components/expense/expense-dialog';

describe('ExpenseDialog', () => {
  it('renders form fields', () => {
    render(<ExpenseDialog open={true} />);

    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ExpenseDialog open={true} />);

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    expect(await screen.findByText('Description is required'))
      .toBeInTheDocument();
  });
});
```

**2. Hook Tests**
```typescript
// __tests__/hooks/use-balance.test.ts
import { renderHook } from '@testing-library/react';
import { useBalance } from '@/hooks/use-balance';

describe('useBalance', () => {
  it('calculates balances correctly', () => {
    const expenses = [/* mock data */];
    const payments = [/* mock data */];

    const { result } = renderHook(() =>
      useBalance(expenses, payments)
    );

    expect(result.current.balances).toEqual(/* expected */);
  });
});
```

**3. Integration Tests**
```typescript
// __tests__/integration/expense-page.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import ExpensePage from '@/app/expenses/page';

jest.mock('@/lib/supabase/server');

describe('Expense Page Integration', () => {
  it('displays expenses list', async () => {
    render(<ExpensePage />);

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });
  });
});
```

### Testing Best Practices

1. **Mock Supabase**: Always mock Supabase clients in tests
2. **Test User Flows**: Focus on user interactions
3. **Avoid Implementation Details**: Test behavior, not internals
4. **Use Data-testid Sparingly**: Prefer accessible queries
5. **Coverage Goals**: Aim for >80% on critical paths

### Current Test Coverage

Limited tests exist. Focus on:
- Expense functionality
- Balance calculations
- Component rendering
- Hook behavior

**Need More Tests For**:
- Chore operations
- Household management
- Payment settlements
- Notifications

---

## Deployment & CI/CD

### Deployment Platform

**Vercel** (Primary)
- Production URL: `https://flatastic02.vercel.app`
- Auto-deploys from main branch
- Preview deployments for PRs

### Build Process

```bash
# Development (local)
pnpm dev  # Uses Turbopack for fast refresh

# Production build
pnpm build
# - Next.js static optimization
# - PWA asset generation
# - Service worker compilation
# - Sentry source map upload
# - TypeScript type checking

# Production server
pnpm start
```

### CI/CD - GitHub Actions

**Cron Jobs** (`.github/workflows/cron-job.yaml`)

Runs automated tasks on schedule:

```yaml
Schedule:
  - 1:00 PM UTC daily (0 13 * * *)  # Chore reminders
  - 3:00 PM UTC daily (0 15 * * *)  # Chore reminders
  - Manual trigger via workflow_dispatch

Jobs:
  1. Update Overdue Chore Status
     - Endpoint: GET /api/webhooks/update-overdue-chore-status
     - Auth: x-webhook-secret header

  2. Send Chore Reminders
     - Endpoint: GET /api/webhooks/chore-reminder
     - Auth: x-webhook-secret header
```

**Webhook Security**
```typescript
// app/api/webhooks/chore-reminder/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');

  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process webhook...
}
```

### Environment Variables (Production)

Required in Vercel:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_KEY

# VAPID (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_EMAIL

# Security
SUPABASE_WEBHOOK_SECRET

# Monitoring (Optional)
SENTRY_AUTH_TOKEN
```

### Security Headers

Configured in `next.config.ts`:
```typescript
headers: [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval'..."
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      }
    ]
  }
]
```

### Performance Optimizations

1. **Server Components** - Reduced client JS bundle
2. **Image Optimization** - Next.js Image component
3. **Code Splitting** - Automatic route-based splitting
4. **Service Worker Caching** - PWA offline support
5. **Static Generation** - Where possible (landing page)

---

## Common Tasks & Examples

### Task 1: Add a New Feature

**Example: Add a "Shopping List" feature**

1. **Create Database Table**
```sql
-- In Supabase SQL editor
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) not null,
  name text not null,
  quantity integer default 1,
  purchased boolean default false,
  created_by uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table shopping_items enable row level security;

create policy "Users can view household shopping items"
  on shopping_items for select
  using (
    household_id in (
      select household_id from profiles where id = auth.uid()
    )
  );
```

2. **Regenerate Types**
```bash
# In Supabase dashboard, get updated types
# Update lib/supabase/schema.types.ts
```

3. **Create Type Aliases**
```typescript
// lib/supabase/schema.alias.ts
export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row'];
export type ShoppingItemInsert = Database['public']['Tables']['shopping_items']['Insert'];
export type ShoppingItemUpdate = Database['public']['Tables']['shopping_items']['Update'];
```

4. **Create Validation Schema**
```typescript
// lib/validations/shopping.ts
import { z } from 'zod';

export const CreateShoppingItemSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  quantity: z.number().int().min(1).default(1),
  household_id: z.string().uuid(),
});

export type CreateShoppingItemInput = z.infer<typeof CreateShoppingItemSchema>;
```

5. **Create Server Action**
```typescript
// lib/actions/shopping.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { CreateShoppingItemSchema } from '@/lib/validations/shopping';
import { revalidatePath } from 'next/cache';

export async function createShoppingItem(data: CreateShoppingItemInput) {
  try {
    const validated = CreateShoppingItemSchema.parse(data);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: item, error } = await supabase
      .from('shopping_items')
      .insert({
        ...validated,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/shopping');
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

6. **Create Custom Hook**
```typescript
// hooks/use-shopping.ts
'use client';

import { createShoppingItem } from '@/lib/actions/shopping';
import { useState } from 'react';

export function useShopping() {
  const [isLoading, setIsLoading] = useState(false);

  const addItem = async (data: CreateShoppingItemInput) => {
    setIsLoading(true);
    try {
      return await createShoppingItem(data);
    } finally {
      setIsLoading(false);
    }
  };

  return { addItem, isLoading };
}
```

7. **Create Page**
```typescript
// app/shopping/page.tsx
import { createClient } from '@/lib/supabase/server';
import { ShoppingList } from '@/components/shopping/shopping-list';

export default async function ShoppingPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="container py-8">
      <h1>Shopping List</h1>
      <ShoppingList initialItems={items} />
    </div>
  );
}
```

8. **Create Components**
```typescript
// components/shopping/shopping-list.tsx
'use client';

import { ShoppingItem } from '@/lib/supabase/schema.alias';

export function ShoppingList({ initialItems }: { initialItems: ShoppingItem[] }) {
  return (
    <div>
      {initialItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

9. **Add to Navigation**
```typescript
// components/navbar.tsx
// Add shopping link to nav
```

### Task 2: Fix a Bug

**Example: Chore due date not updating**

1. **Identify the Issue**
```typescript
// lib/actions/chore.ts
// Check updateChore function
```

2. **Add Logging**
```typescript
export async function updateChore(id: string, data: UpdateChoreInput) {
  console.log('Updating chore:', id, data);
  // ... existing code
}
```

3. **Verify Validation**
```typescript
// lib/validations/chore.ts
// Check UpdateChoreSchema
due_date: z
  .string()
  .datetime()  // ← Might be the issue
  .nullable()
  .optional()
```

4. **Fix Validation**
```typescript
due_date: z
  .string()
  .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date')
  .nullable()
  .optional()
```

5. **Test Locally**
```bash
pnpm dev
# Test the fix
```

6. **Add Test**
```typescript
// __tests__/actions/chore.test.ts
describe('updateChore', () => {
  it('updates due date correctly', async () => {
    const result = await updateChore('chore-id', {
      due_date: '2025-12-01T00:00:00Z'
    });
    expect(result.success).toBe(true);
  });
});
```

7. **Commit and Push**
```bash
git add .
git commit -m "fix chore due date update validation"
git push -u origin claude/claude-md-<session-id>
```

### Task 3: Add Tests

**Example: Test expense balance calculation**

```typescript
// __tests__/hooks/use-balance.test.ts
import { renderHook } from '@testing-library/react';
import { useBalance } from '@/hooks/use-balance';

describe('useBalance', () => {
  it('calculates simple two-person balance', () => {
    const expenses = [
      {
        id: '1',
        amount: 100,
        paid_by: 'user1',
        expense_splits: [
          { user_id: 'user1', amount_owed: 50 },
          { user_id: 'user2', amount_owed: 50 },
        ],
      },
    ];

    const payments = [];

    const { result } = renderHook(() =>
      useBalance(expenses, payments)
    );

    expect(result.current.balances).toEqual({
      'user2': { owesTo: 'user1', amount: 50 },
    });
  });

  it('accounts for payments', () => {
    const expenses = [
      {
        id: '1',
        amount: 100,
        paid_by: 'user1',
        expense_splits: [
          { user_id: 'user1', amount_owed: 50 },
          { user_id: 'user2', amount_owed: 50 },
        ],
      },
    ];

    const payments = [
      {
        id: 'p1',
        from_user_id: 'user2',
        to_user_id: 'user1',
        amount: 30,
      },
    ];

    const { result } = renderHook(() =>
      useBalance(expenses, payments)
    );

    expect(result.current.balances).toEqual({
      'user2': { owesTo: 'user1', amount: 20 },
    });
  });
});
```

### Task 4: Update Dependencies

```bash
# Check for updates
pnpm outdated

# Update specific package
pnpm update @tanstack/react-query

# Update all packages (be careful!)
pnpm update

# Run tests after update
pnpm test

# Check build
pnpm build
```

---

## Important Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration, PWA setup, security headers |
| `tsconfig.json` | TypeScript configuration, path aliases |
| `tailwind.config.ts` | Tailwind CSS configuration (auto-generated) |
| `postcss.config.mjs` | PostCSS configuration |
| `components.json` | shadcn/ui configuration |
| `jest.config.js` | Jest testing configuration |
| `.eslintrc.json` | ESLint rules |
| `middleware.ts` | Next.js middleware for auth |

### Key Application Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with providers (QueryProvider, Navbar, Analytics) |
| `lib/supabase/server.ts` | Server-side Supabase client |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `lib/supabase/middleware.ts` | Auth middleware logic |
| `lib/supabase/schema.types.ts` | Generated database types (803 lines) |
| `lib/supabase/schema.alias.ts` | Type aliases and extended types |
| `lib/query-keys.ts` | TanStack Query key factory |
| `lib/query-provider.tsx` | TanStack Query provider setup |
| `lib/utils.ts` | Utility functions (cn helper) |

### Action Files

| File | Purpose |
|------|---------|
| `lib/actions/chore.ts` | Chore CRUD operations |
| `lib/actions/expense.ts` | Expense management |
| `lib/actions/household.ts` | Household operations |
| `lib/actions/user.ts` | User profile management |
| `lib/actions/auth.ts` | Authentication actions |
| `lib/actions/notification.ts` | Notification management |

### Validation Files

| File | Purpose |
|------|---------|
| `lib/validations/chore.ts` | Chore Zod schemas (285 lines) |
| `lib/validations/expense.ts` | Expense Zod schemas |

### Hook Files

| File | Purpose |
|------|---------|
| `hooks/use-chore.ts` | Chore operations hook |
| `hooks/use-expense.ts` | Expense operations hook |
| `hooks/use-balance.ts` | Balance calculations hook |
| `hooks/use-household.ts` | Household operations hook |
| `hooks/use-push-notification.ts` | Push notification hook |
| `hooks/use-mobile.ts` | Mobile detection hook |

### Webhook Files

| File | Purpose |
|------|---------|
| `app/api/webhooks/update-overdue-chore-status/route.ts` | Mark chores as overdue |
| `app/api/webhooks/chore-reminder/route.ts` | Send chore reminders |
| `app/api/webhooks/chore-auto-creator/route.ts` | Create recurring chores |
| `app/api/webhooks/notifications/route.ts` | Process push notifications |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project README (Supabase starter template) |
| `TESTING_PLAN.md` | Testing strategy and plan |
| `TESTING_REPORT.md` | Testing report and results |
| `CLAUDE.md` | This file - AI assistant guide |

---

## Quick Reference

### Common Patterns

**Create a Server Action**
```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function myAction(data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ... logic
  revalidatePath('/path');
  return { success: true };
}
```

**Create a Custom Hook**
```typescript
'use client';
import { useState } from 'react';
import { myAction } from '@/lib/actions/my-action';

export function useMyFeature() {
  const [isLoading, setIsLoading] = useState(false);

  const doSomething = async (data: any) => {
    setIsLoading(true);
    try {
      return await myAction(data);
    } finally {
      setIsLoading(false);
    }
  };

  return { doSomething, isLoading };
}
```

**Create a Zod Schema**
```typescript
import { z } from 'zod';

export const MySchema = z.object({
  field: z.string().min(1, 'Required'),
  // ...
});

export type MyInput = z.infer<typeof MySchema>;
```

**Query with TanStack Query**
```typescript
'use client';
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['my-data'],
  queryFn: async () => {
    const res = await fetch('/api/data');
    return res.json();
  },
});
```

### Git Workflow

```bash
# Create feature branch
git checkout -b claude/claude-md-<session-id>-<feature>

# Make changes
git add .
git commit -m "add feature description"

# Push with upstream
git push -u origin claude/claude-md-<session-id>-<feature>

# If push fails, retry with exponential backoff (2s, 4s, 8s, 16s)
```

### Environment Quick Check

```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Check Supabase connection
pnpm dev
# Visit http://localhost:3000 and check auth
```

---

## Troubleshooting

### Common Issues

**Issue: "User not authenticated" error**
- Check if cookies are enabled
- Verify middleware is configured correctly
- Check Supabase session in browser DevTools

**Issue: Type errors after database changes**
- Regenerate types from Supabase dashboard
- Update `lib/supabase/schema.types.ts`
- Update type aliases in `lib/supabase/schema.alias.ts`

**Issue: Push notifications not working**
- Verify VAPID keys are set correctly
- Check service worker is registered
- Verify push subscription in browser
- Check `push_subscriptions` table in database

**Issue: Webhook not triggering**
- Verify webhook secret header matches env var
- Check GitHub Actions workflow is enabled
- Verify webhook endpoint is accessible
- Check webhook logs in database

**Issue: Build fails**
- Check TypeScript errors: `pnpm tsc --noEmit`
- Verify all imports are correct
- Check for missing environment variables
- Clear `.next` folder and rebuild

---

## Resources

### Documentation Links
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Docs](https://zod.dev)

### Internal Documentation
- Testing Plan: `/TESTING_PLAN.md`
- Testing Report: `/TESTING_REPORT.md`
- Main README: `/README.md`

### Production URLs
- **App**: https://flatastic02.vercel.app
- **Supabase Dashboard**: Check env vars for project URL

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-18 | 1.0 | Initial CLAUDE.md creation |

---

**Note to AI Assistants**: This document is comprehensive but may not cover every edge case. When in doubt:
1. Check the actual code implementation
2. Follow established patterns in similar files
3. Prioritize type safety and validation
4. Test thoroughly before committing
5. Ask for clarification if requirements are unclear

**Maintainers**: Update this file when making significant architectural changes or adding new patterns.
