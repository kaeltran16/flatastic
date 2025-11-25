import { autoCreateChoreFromTemplate } from '@/lib/actions/chore-webhooks';
import { createSystemClient } from '@/lib/supabase/system';
import { calculateNextCreationDate } from '@/lib/validations/chore-template';
import { TZDate } from '@date-fns/tz';
import { endOfDay, startOfDay } from 'date-fns';
import { NextResponse } from 'next/server';

interface RecurringTemplate {
  id: string;
  name: string;
  description: string | null;
  household_id: string;
  recurring_type: 'daily' | 'weekly' | 'monthly';
  recurring_interval: number;
  recurring_start_date: string;
  last_created_at: string | null;
  next_creation_date: string | null;
  auto_assign_rotation: boolean;
}

interface ChoreCreationResult {
  template_id: string;
  template_name: string;
  household_id: string;
  success: boolean;
  chore_id?: string;
  assigned_to?: string;
  error?: string;
}

/**
 * Webhook endpoint to auto-create chores from recurring templates
 * Called by GitHub Actions cron job or manually triggered
 */
export async function GET(request: Request) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret');

    if (
      !webhookSecret ||
      webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSystemClient();
    const now = new Date();
    const results: ChoreCreationResult[] = [];

    // Find all active recurring templates that are due for chore creation
    const { data: recurringTemplates, error: templatesError } = await supabase
      .from('chore_templates')
      .select(
        `
        id,
        name,
        description,
        household_id,
        recurring_type,
        recurring_interval,
        recurring_start_date,
        last_created_at,
        next_creation_date,
        auto_assign_rotation
      `
      )
      .eq('is_active', true)
      .eq('is_recurring', true)
      .not('household_id', 'is', null) // Only household-specific templates
      .or(`next_creation_date.is.null,next_creation_date.lte.${now.toISOString()}`);

    if (templatesError) {
      console.error('Error fetching recurring templates:', templatesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recurring templates',
          details: templatesError.message,
        },
        { status: 500 }
      );
    }

    if (!recurringTemplates || recurringTemplates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recurring templates due for chore creation',
        created_count: 0,
        results: [],
      });
    }

    console.log(
      `Found ${recurringTemplates.length} recurring templates to process`
    );

    // Process each template
    for (const template of recurringTemplates as RecurringTemplate[]) {
      try {
        // Validate template has required fields
        if (!template.household_id) {
          results.push({
            template_id: template.id,
            template_name: template.name,
            household_id: template.household_id || 'unknown',
            success: false,
            error: 'Template missing household_id',
          });
          continue;
        }

        if (!template.recurring_type || !template.recurring_interval) {
          results.push({
            template_id: template.id,
            template_name: template.name,
            household_id: template.household_id,
            success: false,
            error: 'Template missing recurring configuration',
          });
          continue;
        }

        // Calculate due date for the new chore with smart logic:
        // 1. If there's a chore with the same template today (in GMT+7) -> tomorrow at 23:59:59 GMT+7
        // 2. If the last chore is in the past -> today at 23:59:59 GMT+7
        // 3. If no chore exists -> today at 23:59:59 GMT+7

        const TIMEZONE = 'Asia/Ho_Chi_Minh';

        // Get the most recent chore created from this template
        const { data: lastChore } = await supabase
          .from('chores')
          .select('created_at')
          .eq('template_id', template.id)
          .eq('household_id', template.household_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get current time in GMT+7
        const nowGMT7 = new TZDate(now, TIMEZONE);
        const todayStartGMT7 = startOfDay(nowGMT7);

        let dueDateGMT7: TZDate;

        if (lastChore && lastChore.created_at) {
          // Convert last chore creation time to GMT+7
          const lastCreatedGMT7 = new TZDate(lastChore.created_at, TIMEZONE);
          const lastCreatedStartGMT7 = startOfDay(lastCreatedGMT7);

          // If last chore was created today (in GMT+7), set due date to tomorrow
          if (lastCreatedStartGMT7.getTime() === todayStartGMT7.getTime()) {
            // Tomorrow at end of day in GMT+7
            const tomorrowGMT7 = new TZDate(
              nowGMT7.getTime() + 24 * 60 * 60 * 1000,
              TIMEZONE
            );
            dueDateGMT7 = endOfDay(tomorrowGMT7) as TZDate;
          } else {
            // Last chore was in the past, set due date to end of today in GMT+7
            dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
          }
        } else {
          // No previous chore exists, set due date to end of today in GMT+7
          dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
        }

        const dueDateISO = dueDateGMT7.toISOString();

        // Create the chore using the existing auto-create function
        const result = await autoCreateChoreFromTemplate({
          template_id: template.id,
          household_id: template.household_id,
          due_date: dueDateISO, // Pass full ISO string with time
          recurring_type: template.recurring_type,
          recurring_interval: template.recurring_interval,
          name: template.name,
          description: template.description,
          created_by: '', // Will be set to household admin in the function
        });

        if (result.success && result.chore) {
          // Calculate next creation date
          const nextCreationDate = calculateNextCreationDate(
            template.recurring_start_date || now,
            template.recurring_type,
            template.recurring_interval,
            now // Base next creation on current time
          );

          // Update template tracking
          await supabase
            .from('chore_templates')
            .update({
              last_created_at: now.toISOString(),
              next_creation_date: nextCreationDate.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', template.id);

          results.push({
            template_id: template.id,
            template_name: template.name,
            household_id: template.household_id,
            success: true,
            chore_id: result.chore.id,
            assigned_to: result.chore.assigned_user_name,
          });

          console.log(
            `✓ Created chore "${template.name}" for ${result.chore.assigned_user_name}`
          );
        } else {
          results.push({
            template_id: template.id,
            template_name: template.name,
            household_id: template.household_id,
            success: false,
            error: result.error || 'Unknown error',
          });

          console.error(
            `✗ Failed to create chore for template "${template.name}":`,
            result.error
          );
        }
      } catch (error) {
        console.error(
          `Error processing template ${template.id}:`,
          error
        );
        results.push({
          template_id: template.id,
          template_name: template.name,
          household_id: template.household_id || 'unknown',
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${recurringTemplates.length} templates`,
      created_count: successCount,
      failed_count: failureCount,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Auto-create recurring chores error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers with specific template
export async function POST(request: Request) {
  try {
    const webhookSecret = request.headers.get('x-webhook-secret');

    if (
      !webhookSecret ||
      webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, household_id } = body;

    if (!template_id && !household_id) {
      // If no specific template/household, process all
      return GET(request);
    }

    // Process specific template or household
    const supabase = await createSystemClient();
    let query = supabase
      .from('chore_templates')
      .select('*')
      .eq('is_active', true)
      .eq('is_recurring', true);

    if (template_id) {
      query = query.eq('id', template_id);
    } else if (household_id) {
      query = query.eq('household_id', household_id);
    }

    const { data: templates, error } = await query;

    if (error || !templates || templates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No recurring templates found',
        },
        { status: 404 }
      );
    }

    // Use the same processing logic as GET
    return GET(request);
  } catch (error) {
    console.error('POST auto-create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
