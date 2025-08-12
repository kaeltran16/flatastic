export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (cd3cf9e)';
  };
  public: {
    Tables: {
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
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chores_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
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
          household_id: string;
          id: string;
          is_read: boolean | null;
          is_urgent: boolean | null;
          message: string;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          household_id: string;
          id?: string;
          is_read?: boolean | null;
          is_urgent?: boolean | null;
          message: string;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          household_id?: string;
          id?: string;
          is_read?: boolean | null;
          is_urgent?: boolean | null;
          message?: string;
          title?: string;
          type?: string;
          user_id?: string;
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
          payment_link: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          household_id?: string | null;
          id: string;
          payment_link?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          household_id?: string | null;
          id?: string;
          payment_link?: string | null;
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
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
