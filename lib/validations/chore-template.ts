// lib/validations/chore-template.ts
import { TZDate } from '@date-fns/tz';
import { z } from 'zod';

// Schema for creating a chore template
export const CreateChoreTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Template name is required')
      .max(100, 'Name too long'),
    description: z
      .string()
      .max(500, 'Description too long')
      .optional()
      .nullable(),
    household_id: z.string().uuid('Invalid household ID').optional().nullable(),
    is_custom: z.boolean().default(true),
    is_active: z.boolean().default(true),
    // Recurring configuration fields
    is_recurring: z.boolean().default(false),
    recurring_type: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
    recurring_interval: z
      .number()
      .int()
      .min(1, 'Interval must be at least 1')
      .max(365, 'Interval must be at most 365')
      .optional()
      .nullable(),
    recurring_start_date: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          return !isNaN(Date.parse(val));
        },
        { message: 'Invalid date format' }
      ),
    auto_assign_rotation: z.boolean().default(true),
    next_assignee_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (data) => {
      // If is_recurring is true, must have recurring_type and recurring_interval
      if (data.is_recurring) {
        return (
          data.recurring_type &&
          data.recurring_interval &&
          data.recurring_interval > 0
        );
      }
      return true;
    },
    {
      message:
        'Recurring type and interval are required for recurring templates',
      path: ['recurring_type'],
    }
  )
  .refine(
    (data) => {
      // If is_recurring is true, must have a start date
      if (data.is_recurring) {
        return data.recurring_start_date;
      }
      return true;
    },
    {
      message: 'Start date is required for recurring templates',
      path: ['recurring_start_date'],
    }
  );

// Schema for updating a chore template
export const UpdateChoreTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Template name is required')
      .max(100, 'Name too long')
      .optional(),
    description: z
      .string()
      .max(500, 'Description too long')
      .optional()
      .nullable(),
    is_active: z.boolean().optional(),
    // Recurring configuration fields
    is_recurring: z.boolean().optional(),
    recurring_type: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
    recurring_interval: z
      .number()
      .int()
      .min(1, 'Interval must be at least 1')
      .max(365, 'Interval must be at most 365')
      .optional()
      .nullable(),
    recurring_start_date: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          return !isNaN(Date.parse(val));
        },
        { message: 'Invalid date format' }
      ),
    auto_assign_rotation: z.boolean().optional(),
    next_assignee_id: z.string().uuid().optional().nullable(),
    next_creation_date: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // If is_recurring is being set to true, validate recurring fields
      if (data.is_recurring === true) {
        return (
          data.recurring_type &&
          data.recurring_interval &&
          data.recurring_interval > 0
        );
      }
      return true;
    },
    {
      message:
        'Recurring type and interval are required when enabling recurring',
      path: ['recurring_type'],
    }
  );

// Schema for querying recurring templates that need chores created
export const RecurringTemplateQuerySchema = z.object({
  household_id: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(50),
});

// Export form types
export type CreateChoreTemplateInput = z.infer<
  typeof CreateChoreTemplateSchema
>;
export type UpdateChoreTemplateInput = z.infer<
  typeof UpdateChoreTemplateSchema
>;
export type RecurringTemplateQuery = z.infer<
  typeof RecurringTemplateQuerySchema
>;



// ... (existing code)

// Helper function to calculate next creation date in GMT+7 with 23:59 deadline
export function calculateNextCreationDate(
  currentScheduledDate: string | Date,
  recurring_type: 'daily' | 'weekly' | 'monthly',
  recurring_interval: number
): Date {
  // Always use GMT+7 timezone
  const TIMEZONE = 'Asia/Ho_Chi_Minh';
  
  const baseDate = new Date(currentScheduledDate);
  const nextDate = new TZDate(baseDate, TIMEZONE);

  switch (recurring_type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurring_interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + recurring_interval * 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + recurring_interval);
      break;
  }

  // Set time to 23:59:59 in GMT+7
  // This ensures chores expire at the end of the day in the correct timezone
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}

// Helper function to check if a template is due for chore creation
export function isTemplateReady(
  next_creation_date: string | Date | null,
  timezone: string = 'UTC'
): boolean {
  if (!next_creation_date) return false;

  const now = new Date();
  const nextDate = new Date(next_creation_date);

  return nextDate <= now;
}
