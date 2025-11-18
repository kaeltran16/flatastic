# Recurring Chores Feature

## Overview

The Recurring Chores feature allows households to automatically create and assign chores on a regular schedule (daily, weekly, or monthly). Chores are assigned to household members in rotation based on their availability.

## Features

- **Automatic Chore Creation**: Chores are automatically created based on configured templates
- **Flexible Scheduling**: Support for daily, weekly, and monthly recurring schedules
- **User Rotation**: Automatically assigns chores to available users in a fair rotation
- **Availability Tracking**: Respects user availability settings when assigning chores
- **Template Management**: Create, edit, and manage recurring chore templates
- **Scheduling Control**: Configure start dates and intervals for recurring chores

## Architecture

### Database Schema

The feature extends the `chore_templates` table with the following fields:

```sql
is_recurring BOOLEAN DEFAULT FALSE
recurring_type VARCHAR(20) -- 'daily', 'weekly', or 'monthly'
recurring_interval INTEGER -- Number of days/weeks/months between chores
next_creation_date TIMESTAMP WITH TIME ZONE
last_created_at TIMESTAMP WITH TIME ZONE
auto_assign_rotation BOOLEAN DEFAULT TRUE
recurring_start_date DATE
```

### Components

1. **Database Migration** (`supabase/migrations/20251118_add_recurring_chore_config.sql`)
   - Adds recurring configuration columns to `chore_templates`
   - Creates indexes for efficient querying

2. **Webhook Endpoint** (`/api/webhooks/auto-create-recurring-chores`)
   - Finds templates due for chore creation
   - Creates chores with rotation assignment
   - Updates next creation date

3. **GitHub Actions Cron** (`.github/workflows/cron-job.yaml`)
   - Runs twice daily (1 PM and 3 PM UTC)
   - Triggers the auto-create webhook

4. **UI Components**
   - `/app/recurring-chores/page.tsx` - Main page for managing templates
   - `/components/recurring-chores/recurring-chore-dialog.tsx` - Dialog for creating/editing templates

5. **Server Actions** (`/lib/actions/chore-template.ts`)
   - `createChoreTemplate()` - Create templates with recurring config
   - `updateChoreTemplate()` - Update template settings

6. **Validation** (`/lib/validations/chore-template.ts`)
   - Schema validation for recurring templates
   - Helper functions for date calculations

## How It Works

### 1. Template Creation

Users create a recurring chore template with:
- Template name and description
- Recurring schedule (daily/weekly/monthly)
- Interval (e.g., every 2 weeks)
- Start date
- Rotation assignment preference

### 2. Automatic Scheduling

The GitHub Actions cron job runs twice daily and:
1. Calls the `/api/webhooks/auto-create-recurring-chores` endpoint
2. Webhook queries for templates where `next_creation_date <= NOW()`
3. For each due template:
   - Creates a new chore using `autoCreateChoreFromTemplate()`
   - Assigns to next user in rotation (respecting availability)
   - Calculates and updates `next_creation_date`
   - Updates `last_created_at` timestamp

### 3. User Rotation

Rotation assignment works as follows:
1. Query available users (`is_available = true`)
2. Check `template_assignment_tracker` for last assigned user
3. Assign to next user in circular rotation
4. Update tracker with new assignment

### 4. Availability Tracking

Users can toggle their availability status:
- Available users are included in rotation
- Unavailable users are skipped
- Rotation order adapts to current availability

## Usage

### Creating a Recurring Template

1. Navigate to `/recurring-chores`
2. Click "New Template"
3. Fill in template details:
   - Name (required)
   - Description (optional)
   - Enable "Enable Recurring" toggle
4. Configure recurring schedule:
   - Frequency: Daily, Weekly, or Monthly
   - Interval: How many days/weeks/months between chores
   - Start Date: When to begin creating chores
5. Click "Create Template"

### Editing a Template

1. Go to `/recurring-chores`
2. Click "Edit" on any template
3. Modify settings as needed
4. Click "Update Template"

### Pausing/Resuming Recurring Chores

- Click "Pause" to stop automatic creation (sets `is_recurring = false`)
- Click "Enable" to resume automatic creation

### Deleting a Template

- Click "Delete" on a template
- Confirm deletion (soft delete - sets `is_active = false`)
- Existing chores created from this template remain unchanged

## API Reference

### Webhook Endpoint

**GET** `/api/webhooks/auto-create-recurring-chores`

Headers:
```
x-webhook-secret: YOUR_WEBHOOK_SECRET
```

Response:
```json
{
  "success": true,
  "message": "Processed 5 templates",
  "created_count": 4,
  "failed_count": 1,
  "results": [
    {
      "template_id": "uuid",
      "template_name": "Take out trash",
      "household_id": "uuid",
      "success": true,
      "chore_id": "uuid",
      "assigned_to": "John Doe"
    }
  ],
  "timestamp": "2025-11-18T12:00:00Z"
}
```

**POST** `/api/webhooks/auto-create-recurring-chores`

Manually trigger for specific template:
```json
{
  "template_id": "uuid",
  "household_id": "uuid"
}
```

## Configuration

### Environment Variables

Required in `.env`:
```
SUPABASE_WEBHOOK_SECRET=your-webhook-secret
```

### Cron Schedule

Modify `.github/workflows/cron-job.yaml` to change execution times:
```yaml
schedule:
  - cron: '0 13 * * *'  # 1 PM UTC
  - cron: '0 15 * * *'  # 3 PM UTC
```

## Database Setup

Apply the migration to add recurring configuration:

```bash
# Using Supabase CLI
supabase db push

# Or via SQL Editor in Supabase Dashboard
# Copy contents of supabase/migrations/20251118_add_recurring_chore_config.sql
```

## Testing

### Manual Trigger

You can manually trigger chore creation using workflow dispatch:

1. Go to GitHub Actions
2. Select "Call API routinely" workflow
3. Click "Run workflow"

### Test Individual Template

```bash
curl -X POST https://your-app.vercel.app/api/webhooks/auto-create-recurring-chores \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "YOUR_TEMPLATE_ID"}'
```

## Monitoring

### Logs

- Check GitHub Actions logs for webhook execution
- Server logs show chore creation details
- Failed creations are logged with error messages

### Debugging

Common issues:

1. **No chores created**: Check `next_creation_date` is in the past
2. **Assignment errors**: Verify users have `is_available = true`
3. **Webhook failures**: Check `SUPABASE_WEBHOOK_SECRET` is configured

## Future Enhancements

Potential improvements:

- [ ] Email notifications when chores are created
- [ ] Custom assignment rules (not just rotation)
- [ ] Pause/resume individual templates
- [ ] History of created chores per template
- [ ] Analytics dashboard for recurring chores
- [ ] Timezone-aware scheduling
- [ ] Skip holidays/weekends option

## Troubleshooting

### Chores not being created

1. Verify template has `is_recurring = true` and `is_active = true`
2. Check `next_creation_date` is not null and is in the past
3. Confirm GitHub Actions workflow is running
4. Check webhook secret is correct

### Assignment issues

1. Ensure household has available users (`is_available = true`)
2. Check `template_assignment_tracker` table for tracking data
3. Verify household_id matches between template and users

### Timing issues

1. Cron runs twice daily at 1 PM and 3 PM UTC
2. Adjust cron schedule if different timing needed
3. Consider timezone differences for your users

## Related Documentation

- [Chore Templates](./CHORE_TEMPLATES.md)
- [User Availability](./USER_AVAILABILITY.md)
- [GitHub Actions Workflows](./WORKFLOWS.md)
