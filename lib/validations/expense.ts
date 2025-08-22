// lib/validations/expense.ts
import {
  Expense,
  ExpenseCategory,
  ExpenseInsert,
  ExpenseUpdate,
  SplitType,
} from '@/lib/supabase/schema.alias';
import { z } from 'zod';

// Zod enums that match your type aliases
export const ExpenseCategoryEnum = z.enum([
  'groceries',
  'utilities',
  'household',
  'food',
  'transportation',
  'entertainment',
  'other',
]);

export const SplitTypeEnum = z.enum(['equal', 'custom']);

// Custom split schema
export const CustomSplitSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});

// Schema for transforming Supabase data to app data
export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amount: z.number(),
  category: z
    .string()
    .nullable()
    .transform((val): ExpenseCategory => {
      if (!val || !ExpenseCategoryEnum.safeParse(val).success) {
        return 'other';
      }
      return val as ExpenseCategory;
    }),
  date: z.string(),
  split_type: z
    .string()
    .nullable()
    .transform((val): SplitType => {
      if (!val || !SplitTypeEnum.safeParse(val).success) {
        return 'equal';
      }
      return val as SplitType;
    }),
  paid_by: z.string().uuid(),
  household_id: z.string().uuid(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
}) satisfies z.ZodType<Expense>;

// Form validation schemas
export const CreateExpenseSchema = z
  .object({
    description: z
      .string()
      .min(1, 'Description is required')
      .max(200, 'Description too long'),
    amount: z
      .number()
      .min(1, 'Amount is required')
      .refine((val) => val > 0, 'Amount must be greater than 0'),
    category: ExpenseCategoryEnum,
    date: z
      .string()
      .min(1, 'Date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
    split_type: SplitTypeEnum.default('equal'),
    custom_splits: z.array(CustomSplitSchema).optional(),
    selected_users: z.array(z.string().uuid()).optional(),
    household_id: z.string().uuid(),
  })
  .refine(
    (data) => {
      // If split_type is custom, custom_splits and selected_users are required
      if (data.split_type === 'custom') {
        return (
          data.custom_splits &&
          data.custom_splits.length > 0 &&
          data.selected_users &&
          data.selected_users.length > 0
        );
      }
      return true;
    },
    {
      message:
        'Custom splits and selected users are required for custom split type',
      path: ['custom_splits'],
    }
  )
  .refine(
    (data) => {
      // If split_type is custom, verify amounts add up to total
      if (data.split_type === 'custom' && data.custom_splits) {
        const totalSplits = data.custom_splits.reduce(
          (sum, split) => sum + split.amount,
          0
        );
        return Math.abs(totalSplits - data.amount) < 0.01;
      }
      return true;
    },
    {
      message: 'Custom split amounts must equal the total expense amount',
      path: ['custom_splits'],
    }
  );

export const UpdateExpenseSchema = z
  .object({
    description: z
      .string()
      .min(1, 'Description is required')
      .max(200, 'Description too long')
      .optional(),
    amount: z
      .number()
      .min(1, 'Amount is required')
      .refine((val) => val > 0, 'Amount must be greater than 0')
      .optional(),
    category: ExpenseCategoryEnum.optional(),
    date: z
      .string()
      .min(1, 'Date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date')
      .optional(),
    split_type: SplitTypeEnum.optional(),
    custom_splits: z.array(CustomSplitSchema).optional(),
    selected_users: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      // If split_type is custom, custom_splits and selected_users are required
      if (data.split_type === 'custom') {
        return (
          data.custom_splits &&
          data.custom_splits.length > 0 &&
          data.selected_users &&
          data.selected_users.length > 0
        );
      }
      return true;
    },
    {
      message:
        'Custom splits and selected users are required for custom split type',
      path: ['custom_splits'],
    }
  )
  .refine(
    (data) => {
      // If split_type is custom, verify amounts add up to total
      if (data.split_type === 'custom' && data.custom_splits && data.amount) {
        const totalSplits = data.custom_splits.reduce(
          (sum, split) => sum + split.amount,
          0
        );
        return Math.abs(totalSplits - data.amount) < 0.01;
      }
      return true;
    },
    {
      message: 'Custom split amounts must equal the total expense amount',
      path: ['custom_splits'],
    }
  );

// Export form types
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type CustomSplit = z.infer<typeof CustomSplitSchema>;

// Utility functions for data transformation
export const transformSupabaseExpense = (supabaseExpense: Expense): Expense => {
  return ExpenseSchema.parse(supabaseExpense);
};

export const prepareExpenseForInsert = (
  input: CreateExpenseInput,
  paidBy: string
): ExpenseInsert => {
  return {
    description: input.description,
    amount: input.amount,
    category: input.category,
    date: input.date,
    split_type: input.split_type,
    paid_by: paidBy,
    household_id: input.household_id,
  };
};

export const prepareExpenseForUpdate = (
  input: UpdateExpenseInput
): ExpenseUpdate => {
  const update: ExpenseUpdate = {};

  if (input.description !== undefined) update.description = input.description;
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.category !== undefined) update.category = input.category;
  if (input.date !== undefined) update.date = input.date;
  if (input.split_type !== undefined) update.split_type = input.split_type;

  return update;
};

// Validation helpers
export const validateExpenseCategory = (
  category: string
): category is ExpenseCategory => {
  return ExpenseCategoryEnum.safeParse(category).success;
};

export const validateSplitType = (type: string): type is SplitType => {
  return SplitTypeEnum.safeParse(type).success;
};

// Form data helpers for React components
// Fixed form data helpers for React components
// Safe form data helpers with proper error handling
export const parseExpenseFormData = (
  formData: FormData
): CreateExpenseInput => {
  try {
    const description = formData.get('description') as string;
    const amountStr = formData.get('amount') as string;
    const amount = parseFloat(amountStr);
    const category = formData.get('category') as ExpenseCategory;
    const date = formData.get('date') as string;
    const split_type = formData.get('split_type') as SplitType;
    const household_id = formData.get('household_id') as string;

    // Validate required fields before processing
    if (
      !description ||
      !amountStr ||
      !category ||
      !date ||
      !split_type ||
      !household_id
    ) {
      throw new Error('Missing required form fields');
    }

    if (isNaN(amount)) {
      throw new Error('Invalid amount value');
    }

    // Parse custom splits if present
    const custom_splits: CustomSplit[] = [];
    const selected_users: string[] = [];

    // Get all form entries for custom splits
    const entries = Array.from(formData.entries());
    const splitEntries = entries.filter(([key]) =>
      key.startsWith('custom_split_')
    );
    const userEntries = entries.filter(([key]) =>
      key.startsWith('selected_user_')
    );

    userEntries.forEach(([key, value]) => {
      const userId = key.replace('selected_user_', '');
      if (value === 'true') {
        selected_users.push(userId);
        const amountKey = `custom_split_${userId}`;
        const amountEntry = splitEntries.find(([k]) => k === amountKey);
        if (amountEntry) {
          const splitAmount = parseFloat(amountEntry[1] as string);
          if (!isNaN(splitAmount)) {
            custom_splits.push({
              user_id: userId,
              amount: splitAmount,
            });
          }
        }
      }
    });

    const data = {
      description,
      amount,
      category,
      date,
      split_type,
      household_id,
      ...(split_type === 'custom' && {
        custom_splits,
        selected_users,
      }),
    };

    // Use safeParse to handle validation errors gracefully
    const result = CreateExpenseSchema.safeParse(data);

    if (!result.success) {
      console.error('Form validation failed:', result.error);
      throw new Error(`Validation failed: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    console.error('Error parsing form data:', error);
    throw error; // Re-throw to be handled by calling code
  }
};

export const parseExpenseUpdateFormData = (
  formData: FormData
): UpdateExpenseInput => {
  try {
    const data: Partial<UpdateExpenseInput> = {};

    const description = formData.get('description') as string;
    if (description) data.description = description;

    const amountStr = formData.get('amount') as string;
    if (amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        data.amount = amount;
      }
    }

    const category = formData.get('category') as ExpenseCategory;
    if (category) data.category = category;

    const date = formData.get('date') as string;
    if (date) data.date = date;

    const split_type = formData.get('split_type') as SplitType;
    if (split_type) data.split_type = split_type;

    // Parse custom splits if present
    if (split_type === 'custom') {
      const custom_splits: CustomSplit[] = [];
      const selected_users: string[] = [];

      const entries = Array.from(formData.entries());
      const splitEntries = entries.filter(([key]) =>
        key.startsWith('custom_split_')
      );
      const userEntries = entries.filter(([key]) =>
        key.startsWith('selected_user_')
      );

      userEntries.forEach(([key, value]) => {
        const userId = key.replace('selected_user_', '');
        if (value === 'true') {
          selected_users.push(userId);
          const amountKey = `custom_split_${userId}`;
          const amountEntry = splitEntries.find(([k]) => k === amountKey);
          if (amountEntry) {
            const splitAmount = parseFloat(amountEntry[1] as string);
            if (!isNaN(splitAmount)) {
              custom_splits.push({
                user_id: userId,
                amount: splitAmount,
              });
            }
          }
        }
      });

      data.custom_splits = custom_splits;
      data.selected_users = selected_users;
    }

    // Use safeParse for validation
    const result = UpdateExpenseSchema.safeParse(data);

    if (!result.success) {
      console.error('Update form validation failed:', result.error);
      throw new Error(`Validation failed: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    console.error('Error parsing update form data:', error);
    throw error;
  }
};
