export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (cd3cf9e)';
  };
  public: {
    Tables: {
      chore_templates: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          household_id: string | null;
          id: string;
          is_active: boolean | null;
          is_custom: boolean | null;
          name: string;
          updated_at: string | null;
          is_recurring: boolean | null;
          recurring_type: string | null;
          recurring_interval: number | null;
          next_creation_date: string | null;
          last_created_at: string | null;
          auto_assign_rotation: boolean | null;
          recurring_start_date: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_custom?: boolean | null;
          name: string;
          updated_at?: string | null;
          is_recurring?: boolean | null;
          recurring_type?: string | null;
          recurring_interval?: number | null;
          next_creation_date?: string | null;
          last_created_at?: string | null;
          auto_assign_rotation?: boolean | null;
          recurring_start_date?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_custom?: boolean | null;
          name?: string;
          updated_at?: string | null;
          is_recurring?: boolean | null;
          recurring_type?: string | null;
          recurring_interval?: number | null;
          next_creation_date?: string | null;
          last_created_at?: string | null;
          auto_assign_rotation?: boolean | null;
          recurring_start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chore_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chore_templates_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      chores: {
        Row: {
          assigned_to: string | null;
          created_at: string | null;
          created_by: string;
          description: string | null;
          due_date: string | null;
          household_id: string;
          id: string;
          name: string;
          recurring_interval: number | null;
          recurring_type: string | null;
          status: string | null;
          template_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string | null;
          created_by: string;
          description?: string | null;
          due_date?: string | null;
          household_id: string;
          id?: string;
          name: string;
          recurring_interval?: number | null;
          recurring_type?: string | null;
          status?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string | null;
          created_by?: string;
          description?: string | null;
          due_date?: string | null;
          household_id?: string;
          id?: string;
          name?: string;
          recurring_interval?: number | null;
          recurring_type?: string | null;
          status?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chores_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chores_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chores_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'chore_templates';
            referencedColumns: ['id'];
          }
        ];
      };
      expense_splits: {
        Row: {
          amount_owed: number;
          created_at: string | null;
          expense_id: string;
          id: string;
          is_settled: boolean | null;
          user_id: string;
        };
        Insert: {
          amount_owed: number;
          created_at?: string | null;
          expense_id: string;
          id?: string;
          is_settled?: boolean | null;
          user_id: string;
        };
        Update: {
          amount_owed?: number;
          created_at?: string | null;
          expense_id?: string;
          id?: string;
          is_settled?: boolean | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expense_splits_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          }
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string | null;
          created_at: string | null;
          date: string;
          description: string;
          household_id: string;
          id: string;
          paid_by: string;
          split_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          category?: string | null;
          created_at?: string | null;
          date?: string;
          description: string;
          household_id: string;
          id?: string;
          paid_by: string;
          split_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          category?: string | null;
          created_at?: string | null;
          date?: string;
          description?: string;
          household_id?: string;
          id?: string;
          paid_by?: string;
          split_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      fund_penalties: {
        Row: {
          amount: number;
          chore_id: string | null;
          created_at: string | null;
          description: string | null;
          household_id: string;
          id: string;
          reason: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          chore_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          household_id: string;
          id?: string;
          reason: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          chore_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          household_id?: string;
          id?: string;
          reason?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fund_penalties_chore_id_fkey';
            columns: ['chore_id'];
            isOneToOne: false;
            referencedRelation: 'chores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fund_penalties_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fund_penalties_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      households: {
        Row: {
          admin_id: string;
          created_at: string | null;
          created_by: string;
          id: string;
          invite_code: string | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          admin_id: string;
          created_at?: string | null;
          created_by: string;
          id?: string;
          invite_code?: string | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          admin_id?: string;
          created_at?: string | null;
          created_by?: string;
          id?: string;
          invite_code?: string | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_admin_id';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          household_id: string | null;
          id: string;
          is_read: boolean | null;
          is_urgent: boolean | null;
          message: string;
          push_sent: boolean | null;
          push_sent_at: string | null;
          title: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_urgent?: boolean | null;
          message: string;
          push_sent?: boolean | null;
          push_sent_at?: string | null;
          title: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_urgent?: boolean | null;
          message?: string;
          push_sent?: boolean | null;
          push_sent_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      payment_notes: {
        Row: {
          amount: number;
          created_at: string | null;
          from_user_id: string;
          id: string;
          note: string | null;
          to_user_id: string;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          from_user_id: string;
          id?: string;
          note?: string | null;
          to_user_id: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          from_user_id?: string;
          id?: string;
          note?: string | null;
          to_user_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pending_invitations: {
        Row: {
          created_at: string | null;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string;
          invited_email: string;
          message: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string;
          household_id: string;
          id?: string;
          invited_by: string;
          invited_email: string;
          message?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string;
          invited_email?: string;
          message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pending_invitations_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pending_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          household_id: string | null;
          id: string;
          is_available: boolean | null;
          payment_link: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          household_id?: string | null;
          id: string;
          is_available?: boolean | null;
          payment_link?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          household_id?: string | null;
          id?: string;
          is_available?: boolean | null;
          payment_link?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_profiles_household';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey1';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      template_assignment_tracker: {
        Row: {
          assignment_order: Json;
          created_at: string | null;
          household_id: string;
          id: string;
          last_assigned_user_id: string;
          template_id: string;
          updated_at: string | null;
        };
        Insert: {
          assignment_order?: Json;
          created_at?: string | null;
          household_id: string;
          id?: string;
          last_assigned_user_id: string;
          template_id: string;
          updated_at?: string | null;
        };
        Update: {
          assignment_order?: Json;
          created_at?: string | null;
          household_id?: string;
          id?: string;
          last_assigned_user_id?: string;
          template_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'template_assignment_tracker_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'template_assignment_tracker_last_assigned_user_id_fkey';
            columns: ['last_assigned_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'template_assignment_tracker_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'chore_templates';
            referencedColumns: ['id'];
          }
        ];
      };
      webhook_logs: {
        Row: {
          created_at: string | null;
          id: string;
          operation: string;
          record_id: string | null;
          request_id: number | null;
          table_name: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          operation: string;
          record_id?: string | null;
          request_id?: number | null;
          table_name: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          operation?: string;
          record_id?: string | null;
          request_id?: number | null;
          table_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_chore_reminder_notification: {
        Args: { p_assigned_user_id: string; p_chore_id: string };
        Returns: string;
      };
      create_expense_notification: {
        Args: { p_expense_id: string; p_household_id: string };
        Returns: string;
      };
      create_household_notification: {
        Args: {
          p_household_id: string;
          p_is_urgent?: boolean;
          p_message: string;
          p_title: string;
          p_type?: string;
        };
        Returns: string;
      };
      create_notification_with_push: {
        Args: {
          p_household_id?: string;
          p_is_urgent?: boolean;
          p_message: string;
          p_title: string;
          p_type?: string;
          p_user_id?: string;
        };
        Returns: string;
      };
      create_user_notification: {
        Args: {
          p_is_urgent?: boolean;
          p_message: string;
          p_title: string;
          p_type?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      generate_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_user_household_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      notify_expense_added: {
        Args: { p_expense_id: string; p_household_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
      DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] &
      DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
