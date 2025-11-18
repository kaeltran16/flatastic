# Database Migrations

This directory contains SQL migration files for the Flatastic database.

## Applying Migrations

### Option 1: Using Supabase CLI

```bash
# Make sure you're logged in to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all pending migrations
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Execute the SQL

### Option 3: Using psql

```bash
psql YOUR_DATABASE_URL -f supabase/migrations/MIGRATION_FILE.sql
```

## Migration Files

- `20251118_add_recurring_chore_config.sql` - Adds recurring chore configuration to chore_templates table
  - Adds fields for auto-creating chores on daily/weekly/monthly schedules
  - Adds rotation and scheduling capabilities
  - Adds tracking for last/next creation dates
