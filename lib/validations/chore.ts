// lib/validations/chore.ts
import { z } from 'zod';

// Chore status enum
export const ChoreStatus = z.enum(['pending', 'completed', 'overdue']);

// Recurring type enum
export const RecurringType = z.enum(['daily', 'weekly', 'monthly', 'none']);

// Base chore schema
export const ChoreSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Chore name is required').max(100, 'Name too long'),
  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  status: ChoreStatus.default('pending'),
  recurring_type: RecurringType.default('none'),
  recurring_interval: z.number().int().min(1).max(365).optional().nullable(),
  household_id: z.string().uuid(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Create chore schema (for forms)
export const CreateChoreSchema = ChoreSchema.pick({
  name: true,
  description: true,
  assigned_to: true,
  due_date: true,
  recurring_type: true,
  recurring_interval: true,
  household_id: true,
}).refine(
  (data) => {
    // If recurring_type is not 'none', recurring_interval is required
    if (data.recurring_type && data.recurring_type !== 'none') {
      return data.recurring_interval && data.recurring_interval > 0;
    }
    return true;
  },
  {
    message: 'Recurring interval is required for recurring chores',
    path: ['recurring_interval'],
  }
);

// Update chore schema
export const UpdateChoreSchema = ChoreSchema.pick({
  name: true,
  description: true,
  assigned_to: true,
  due_date: true,
  status: true,
  recurring_type: true,
  recurring_interval: true,
})
  .partial()
  .refine(
    (data) => {
      // If recurring_type is not 'none', recurring_interval is required
      if (data.recurring_type && data.recurring_type !== 'none') {
        return data.recurring_interval && data.recurring_interval > 0;
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

// Types
export type Chore = z.infer<typeof ChoreSchema>;
export type CreateChoreInput = z.infer<typeof CreateChoreSchema>;
export type UpdateChoreInput = z.infer<typeof UpdateChoreSchema>;
export type ChoreFilters = z.infer<typeof ChoreFiltersSchema>;
