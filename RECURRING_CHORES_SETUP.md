# Recurring Chores - Setup Guide

## Quick Start

This guide will help you set up the automatic recurring chores feature for your Flatastic household.

## Prerequisites

- Supabase project set up
- GitHub repository with Actions enabled
- Environment variables configured

## Setup Steps

### 1. Apply Database Migration

Run the migration to add recurring chore configuration to your database:

**Option A: Using Supabase CLI**
```bash
cd /path/to/flatastic
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and run the contents of `supabase/migrations/20251118_add_recurring_chore_config.sql`

### 2. Verify Environment Variables

Ensure your `.env.local` has:
```env
SUPABASE_WEBHOOK_SECRET=your-secret-key-here
```

This secret is used to authenticate webhook calls from GitHub Actions.

### 3. Configure GitHub Secrets

In your GitHub repository:

1. Go to Settings > Secrets and variables > Actions
2. Ensure `WEBHOOK_SECRET` is set (should match `SUPABASE_WEBHOOK_SECRET`)

### 4. Test the Feature

#### Create a Recurring Template

1. Navigate to `https://your-app.com/recurring-chores`
2. Click "New Template"
3. Fill in:
   - Name: "Test Chore"
   - Enable Recurring: ON
   - Frequency: Daily
   - Interval: 1
   - Start Date: Today
4. Click "Create Template"

#### Manual Test

Manually trigger the workflow:

1. Go to GitHub > Actions tab
2. Select "Call API routinely" workflow
3. Click "Run workflow" > "Run workflow"
4. Check the logs for successful execution

#### Verify Results

1. Check the "Chores" page in your app
2. A new chore should be created and assigned to a user
3. The template's "Next Creation" date should be updated

## How It Works

### Scheduling

- GitHub Actions cron runs **twice daily** at:
  - 1:00 PM UTC (8:00 PM GMT+7)
  - 3:00 PM UTC (10:00 PM GMT+7)

- The cron job calls three webhooks:
  1. Update overdue chore status
  2. Send chore reminders
  3. **Auto-create recurring chores** ← New!

### Chore Creation Logic

When the webhook runs:

1. Queries all active recurring templates where `next_creation_date <= NOW()`
2. For each template:
   - Creates a new chore using the template
   - Assigns to next available user in rotation
   - Calculates due date based on recurring settings
   - Updates `last_created_at` and `next_creation_date`

### User Rotation

- Users are assigned in a circular rotation
- Only **available** users are included (where `is_available = true`)
- Assignment order is tracked in `template_assignment_tracker` table
- Rotation continues from the last assigned user

## User Guide

### Managing User Availability

Users can toggle their availability:

1. Go to Settings or Chore Scheduler
2. Toggle "Available" switch
3. When unavailable, they won't be assigned new recurring chores

### Creating Recurring Templates

Templates can be configured with:

- **Daily**: Every N days (1-365)
- **Weekly**: Every N weeks (1-52)
- **Monthly**: Every N months (1-12)

Example configurations:

- Take out trash: Every 3 days
- Clean kitchen: Every 1 week
- Deep clean: Every 2 weeks
- Pay rent: Every 1 month

### Pausing Templates

To temporarily stop a recurring template:

1. Go to `/recurring-chores`
2. Click "Pause" on the template
3. Chores will not be created until you click "Enable" again

## Customization

### Change Cron Schedule

Edit `.github/workflows/cron-job.yaml`:

```yaml
schedule:
  # Run every 6 hours
  - cron: '0 */6 * * *'

  # Run at 9 AM UTC every day
  - cron: '0 9 * * *'

  # Run at midnight UTC every day
  - cron: '0 0 * * *'
```

### Adjust Rotation Logic

Modify `lib/actions/chore-webhooks.ts` > `getNextUserInRotation()` to:

- Change sorting order
- Add priority users
- Implement custom assignment rules
- Weight assignments based on chore completion rate

### Customize Due Dates

Edit `app/api/webhooks/auto-create-recurring-chores/route.ts` to:

- Calculate due dates differently
- Add buffer time
- Set specific times (not just dates)
- Skip weekends or holidays

## Monitoring

### View Execution Logs

1. Go to GitHub > Actions
2. Click on latest "Call API routinely" run
3. Expand "Call auto-create-recurring-chores" step
4. Review JSON response for created chores

### Check Template Status

In the app at `/recurring-chores`:

- **Next**: Shows when the next chore will be created
- **Last created**: Shows when a chore was last created
- **Overdue**: Next creation date is in the past (will create on next cron run)

## Troubleshooting

### No chores are being created

**Check:**
- [ ] Template has `is_recurring = true`
- [ ] Template has `is_active = true`
- [ ] `next_creation_date` is in the past or null
- [ ] At least one user has `is_available = true`
- [ ] GitHub Actions workflow is enabled
- [ ] Webhook secret matches in GitHub and Supabase

**Debug:**
```bash
# Manually trigger webhook
curl -X GET https://your-app.vercel.app/api/webhooks/auto-create-recurring-chores \
  -H "x-webhook-secret: YOUR_SECRET"
```

### Chores assigned to same user

**Possible causes:**
- Only one user is available
- `template_assignment_tracker` is not updating
- Multiple users became unavailable

**Fix:**
- Ensure multiple users have `is_available = true`
- Check database `template_assignment_tracker` table
- Reset tracker by deleting the record for that template

### Wrong schedule

**Check:**
- Template `recurring_type` and `recurring_interval` values
- `next_creation_date` calculation logic
- Timezone settings

## Support

For issues or questions:

1. Check the detailed documentation: `docs/RECURRING_CHORES.md`
2. Review server logs for error messages
3. Check GitHub Actions logs for webhook execution
4. Verify database records in Supabase dashboard

## Next Steps

After setup:

1. Create templates for common recurring chores
2. Ask household members to set their availability
3. Monitor the first few automated creations
4. Adjust schedules based on household needs
5. Consider setting up notifications for new chores

---

**Happy Automating!** 🎉
