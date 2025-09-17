import { ChoreTemplate, Profile } from '@/lib/supabase/schema.alias';

export interface RotationSettings {
  startDate: string;
  recurringType: 'daily' | 'weekly' | 'monthly';
  recurringInterval: number;
}

export interface RotationAssignment {
  chore: ChoreTemplate;
  assignedUser: Profile;
  assignmentDate: string;
  dueDate: string;
  period: number;
}

export interface NewCustomChore {
  name: string;
  description: string;
}

export type ActiveStep = 'select' | 'availability' | 'settings' | 'preview';
