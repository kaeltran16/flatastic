// lib/validations/chore.ts
import {
  Chore,
  ChoreInsert,
  ChoreStatus,
  ChoreUpdate,
  RecurringType,
} from '@/lib/supabase/schema.alias';
import { z } from 'zod';

// Zod enums that match your type aliases
export const ChoreStatusEnum = z.enum(['pending', 'completed', 'overdue']);
export const RecurringTypeEnum = z.enum(['daily', 'weekly', 'monthly', 'none']);

// Schema for transforming Supabase data to app data
export const ChoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  assigned_to: z.string().nullable(),
  due_date: z.string().nullable(),
  status: z
    .string()
    .nullable()
    .transform((val): ChoreStatus => {
      if (!val || !ChoreStatusEnum.safeParse(val).success) {
        return 'pending';
      }
      return val as ChoreStatus;
    }),
  recurring_type: z
    .string()
    .nullable()
    .transform((val): RecurringType => {
      if (!val || !RecurringTypeEnum.safeParse(val).success) {
        return 'none';
      }
      return val as RecurringType;
    }),
  recurring_interval: z.number().int().nullable(),
  household_id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
}) satisfies z.ZodType<Chore>;

// Form validation schemas
export const CreateChoreSchema = z
  .object({
    name: z
      .union([z.string(), z.undefined()])
      .transform((val) => val || '')
      .pipe(
        z.string().min(1, 'Chore name is required').max(100, 'Name too long')
      ),
    description: z
      .string()
      .max(500, 'Description too long')
      .optional()
      .nullable(),
    assigned_to: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .nullable()
      .transform((val) => {
        // Convert empty string or undefined to null
        if (!val || val === '') return null;
        return val;
      })
      .refine((val) => {
        if (val === null) return true;
        // If we have a value, it must be a valid UUID
        return z.string().uuid().safeParse(val).success;
      }, 'Invalid uuid'),
    due_date: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .nullable()
      .transform((val) => {
        // Convert empty string or undefined to null
        if (!val || val === '') return null;
        return val;
      })
      .refine((val) => {
        if (val === null) return true;
        // If we have a value, it must be a valid date
        return !isNaN(Date.parse(val));
      }, 'Invalid date format'),
    recurring_type: z
      .enum(['daily', 'weekly', 'monthly', 'none'])
      .default('none'),
    recurring_interval: z
      .number()
      .int()
      .min(1, 'Number must be greater than or equal to 1')
      .max(365, 'Number must be less than or equal to 365')
      .optional()
      .nullable(),
    household_id: z
      .union([z.string(), z.undefined()])
      .refine((val) => val !== undefined && val !== '', 'Required')
      .refine(
        (val) => z.string().uuid().safeParse(val).success,
        'Invalid uuid'
      ),
  })
  .refine(
    (data) => {
      if (data.recurring_type !== 'none') {
        return data.recurring_interval && data.recurring_interval > 0;
      }
      return true;
    },
    {
      message: 'Recurring interval is required for recurring chores',
      path: ['recurring_interval'],
    }
  );

export const UpdateChoreSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Chore name is required')
      .max(100, 'Name too long')
      .optional(),
    description: z
      .string()
      .max(500, 'Description too long')
      .nullable()
      .optional(),
    assigned_to: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .nullable()
      .refine((val) => {
        if (val === null || val === undefined) return true;
        // If we have a value, it must be a valid UUID
        return z.string().uuid().safeParse(val).success;
      }, 'Invalid uuid'),
    due_date: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .nullable()
      .refine((val) => {
        if (val === null || val === undefined) return true;
        // If we have a value, it must be a valid date
        return !isNaN(Date.parse(val));
      }, 'Invalid date format'),
    status: ChoreStatusEnum.optional(),
    recurring_type: z.enum(['daily', 'weekly', 'monthly', 'none']).optional(),
    recurring_interval: z
      .number()
      .int()
      .min(1, 'Number must be greater than or equal to 1')
      .max(365, 'Number must be less than or equal to 365')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // For partial updates, only validate the relationship if both fields are present
      if (
        data.recurring_type !== undefined &&
        data.recurring_interval !== undefined
      ) {
        if (data.recurring_type !== 'none') {
          return data.recurring_interval && data.recurring_interval > 0;
        }
      }
      return true;
    },
    {
      message: 'Recurring interval is required for recurring chores',
      path: ['recurring_interval'],
    }
  );

// Filter schema
export const ChoreFiltersSchema = z.object({
  assigneeFilter: z.string().default('all'),
  statusFilter: z.string().default('all'),
  recurringFilter: z.string().default('all'),
});

// Export form types
export type CreateChoreInput = z.infer<typeof CreateChoreSchema>;
export type UpdateChoreInput = z.infer<typeof UpdateChoreSchema>;
export type ChoreFilters = z.infer<typeof ChoreFiltersSchema>;

// Utility functions for data transformation
export const transformSupabaseChore = (supabaseChore: Chore): Chore => {
  return ChoreSchema.parse(supabaseChore);
};

export const prepareChoreForInsert = (
  input: CreateChoreInput,
  createdBy: string
): ChoreInsert => {
  return {
    name: input.name,
    description: input.description || null,
    assigned_to: input.assigned_to || null,
    due_date: input.due_date || null,
    status: 'pending',
    recurring_type: input.recurring_type,
    recurring_interval: input.recurring_interval || null,
    household_id: input.household_id || '',
    created_by: createdBy,
  };
};

export const prepareChoreForUpdate = (input: UpdateChoreInput): ChoreUpdate => {
  const update: ChoreUpdate = {};

  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.assigned_to !== undefined) update.assigned_to = input.assigned_to;
  if (input.due_date !== undefined) update.due_date = input.due_date;
  if (input.status !== undefined) update.status = input.status;
  if (input.recurring_type !== undefined)
    update.recurring_type = input.recurring_type;
  if (input.recurring_interval !== undefined)
    update.recurring_interval = input.recurring_interval;

  return update;
};

// Validation helpers
export const validateChoreStatus = (status: string): status is ChoreStatus => {
  return ChoreStatusEnum.safeParse(status).success;
};

export const validateRecurringType = (type: string): type is RecurringType => {
  return RecurringTypeEnum.safeParse(type).success;
};

// Form data helpers for your React components
export const parseChoreFormData = (formData: FormData): CreateChoreInput => {
  const data = {
    name: (formData.get('name') as string) || '',
    description: formData.get('description') as string | null,
    assigned_to: formData.get('assigned_to') as string | null,
    due_date: formData.get('due_date') as string | null,
    recurring_type: formData.get('recurring_type') as RecurringType,
    recurring_interval: formData.get('recurring_interval')
      ? parseInt(formData.get('recurring_interval') as string, 10)
      : null,
    household_id: formData.get('household_id') as string,
  };

  return CreateChoreSchema.parse(data);
};

export const parseChoreUpdateFormData = (
  formData: FormData
): UpdateChoreInput => {
  const data: Partial<UpdateChoreInput> = {};

  const name = (formData.get('name') as string) || '';
  if (name) data.name = name;

  const description = formData.get('description') as string;
  if (description !== null) data.description = description;

  const assignedTo = formData.get('assigned_to') as string;
  if (assignedTo !== null) data.assigned_to = assignedTo;

  const dueDate = formData.get('due_date') as string;
  if (dueDate !== null) data.due_date = dueDate;

  const status = formData.get('status') as ChoreStatus;
  if (status) data.status = status;

  const recurringType = formData.get('recurring_type') as RecurringType;
  if (recurringType) data.recurring_type = recurringType;

  const recurringInterval = formData.get('recurring_interval') as string;
  if (recurringInterval)
    data.recurring_interval = parseInt(recurringInterval, 10);

  return UpdateChoreSchema.parse(data);
};
