import { CreateChoreSchema, UpdateChoreSchema } from '@/lib/validations/chore';

describe('Chore Validation Schemas', () => {
  describe('CreateChoreSchema', () => {
    it('should validate a valid chore', () => {
      const validChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(validChore);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validChore.name);
        expect(result.data.description).toBe(validChore.description);
      }
    });

    it('should require name', () => {
      const invalidChore = {
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Chore name is required');
      }
    });

    it('should require name to be at least 1 character', () => {
      const invalidChore = {
        name: '',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Chore name is required');
      }
    });

    it('should require name to be at most 100 characters', () => {
      const invalidChore = {
        name: 'a'.repeat(101),
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name too long');
      }
    });

    it('should validate description length', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'a'.repeat(501), // Too long
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Description too long');
      }
    });

    it('should validate assigned_to as UUID when provided', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: 'invalid-uuid',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid uuid');
      }
    });

    it('should validate due_date format when provided', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: 'invalid-date',
        recurring_type: 'weekly',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format');
      }
    });

    it('should validate recurring_type enum values', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'invalid-type',
        recurring_interval: 1,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid option');
      }
    });

    it('should validate recurring_interval when recurring_type is not none', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 0, // Invalid: must be > 0
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
    });

    it('should require household_id', () => {
      const invalidChore = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'weekly',
        recurring_interval: 1,
      };

      const result = CreateChoreSchema.safeParse(invalidChore);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Required');
      }
    });

    it('should accept valid recurring_type values', () => {
      const validTypes = ['daily', 'weekly', 'monthly', 'none'];

      validTypes.forEach((type) => {
        const validChore = {
          name: 'Clean Kitchen',
          description: 'Clean the kitchen thoroughly',
          assigned_to: '123e4567-e89b-12d3-a456-426614174000',
          due_date: '2024-12-31T00:00:00Z',
          recurring_type: type,
          recurring_interval: type === 'none' ? null : 1,
          household_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        const result = CreateChoreSchema.safeParse(validChore);
        expect(result.success).toBe(true);
      });
    });

    it('should allow optional fields to be null', () => {
      const validChore = {
        name: 'Clean Kitchen',
        description: null,
        assigned_to: null,
        due_date: null,
        recurring_type: 'none',
        recurring_interval: null,
        household_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateChoreSchema.safeParse(validChore);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateChoreSchema', () => {
    it('should validate a valid chore update', () => {
      const validUpdate = {
        name: 'Updated Kitchen Clean',
        description: 'Updated kitchen cleaning description',
        assigned_to: '123e4567-e89b-12d3-a456-426614174002',
        due_date: '2024-12-31T00:00:00Z',
        recurring_type: 'daily',
        recurring_interval: 1,
      };

      const result = UpdateChoreSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validUpdate.name);
        expect(result.data.description).toBe(validUpdate.description);
      }
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Title',
        recurring_type: 'daily',
      };

      const result = UpdateChoreSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(partialUpdate.name);
        expect(result.data.recurring_type).toBe(partialUpdate.recurring_type);
      }
    });

    it('should validate name when provided', () => {
      const invalidUpdate = {
        name: '', // Empty name
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Chore name is required');
      }
    });

    it('should validate description length when provided', () => {
      const invalidUpdate = {
        description: 'a'.repeat(501), // Too long
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Description too long');
      }
    });

    it('should validate due_date format when provided', () => {
      const invalidUpdate = {
        due_date: 'invalid-date',
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format');
      }
    });

    it('should validate recurring_type enum when provided', () => {
      const invalidUpdate = {
        recurring_type: 'invalid-type',
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid option');
      }
    });

    it('should validate recurring_interval range when provided', () => {
      const invalidUpdate = {
        recurring_interval: 0, // Too low
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Number must be greater than or equal to 1'
        );
      }
    });

    it('should validate recurring_interval maximum when provided', () => {
      const invalidUpdate = {
        recurring_interval: 366, // Too high
      };

      const result = UpdateChoreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Number must be less than or equal to 365'
        );
      }
    });

    it('should allow empty object for no updates', () => {
      const emptyUpdate = {};

      const result = UpdateChoreSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(emptyUpdate);
      }
    });
  });
});
