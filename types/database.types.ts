// Database types will be generated from Supabase
// For now, we'll define the basic structure based on the PRD

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      houses: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          timezone: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          timezone?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          timezone?: string;
          created_by?: string;
        };
      };
      house_members: {
        Row: {
          id: string;
          house_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
          can_see_others_balances: boolean;
        };
        Insert: {
          id?: string;
          house_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
          can_see_others_balances?: boolean;
        };
        Update: {
          id?: string;
          house_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          can_see_others_balances?: boolean;
        };
      };
      categories: {
        Row: {
          id: string;
          house_id: string;
          name: string;
          type: "rent" | "utility" | "other";
          billing_type: "flat" | "usage" | "mixed";
          recurrence: string | null;
          is_free: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          name: string;
          type?: "rent" | "utility" | "other";
          billing_type?: "flat" | "usage" | "mixed";
          recurrence?: string | null;
          is_free?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          name?: string;
          type?: "rent" | "utility" | "other";
          billing_type?: "flat" | "usage" | "mixed";
          recurrence?: string | null;
          is_free?: boolean;
        };
      };
      providers: {
        Row: {
          id: string;
          house_id: string;
          category_id: string | null;
          label: string;
          external_link: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          category_id?: string | null;
          label: string;
          external_link?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          category_id?: string | null;
          label?: string;
          external_link?: string | null;
          notes?: string | null;
        };
      };
      charges: {
        Row: {
          id: string;
          house_id: string;
          category_id: string;
          provider_id: string | null;
          created_by: string;
          description: string;
          total_amount: number;
          due_date: string;
          bill_period_start: string | null;
          bill_period_end: string | null;
          split_method: "equal" | "custom_fixed" | "custom_percentage" | "one_person";
          recurrence_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          category_id: string;
          provider_id?: string | null;
          created_by: string;
          description: string;
          total_amount: number;
          due_date: string;
          bill_period_start?: string | null;
          bill_period_end?: string | null;
          split_method?: "equal" | "custom_fixed" | "custom_percentage" | "one_person";
          recurrence_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          category_id?: string;
          provider_id?: string | null;
          description?: string;
          total_amount?: number;
          due_date?: string;
          bill_period_start?: string | null;
          bill_period_end?: string | null;
          split_method?: "equal" | "custom_fixed" | "custom_percentage" | "one_person";
        };
      };
      charge_shares: {
        Row: {
          id: string;
          charge_id: string;
          user_id: string;
          amount: number;
          percentage: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          charge_id: string;
          user_id: string;
          amount: number;
          percentage?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          charge_id?: string;
          user_id?: string;
          amount?: number;
          percentage?: number | null;
        };
      };
      payments: {
        Row: {
          id: string;
          house_id: string;
          created_by: string;
          payer_id: string;
          recipient_id: string | null;
          category_id: string | null;
          date: string;
          amount: number;
          payment_method_label: string | null;
          link_to_external_payment_page: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          created_by: string;
          payer_id: string;
          recipient_id?: string | null;
          category_id?: string | null;
          date: string;
          amount: number;
          payment_method_label?: string | null;
          link_to_external_payment_page?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          payer_id?: string;
          recipient_id?: string | null;
          category_id?: string | null;
          date?: string;
          amount?: number;
          payment_method_label?: string | null;
          link_to_external_payment_page?: string | null;
          notes?: string | null;
        };
      };
      payment_charge_links: {
        Row: {
          id: string;
          payment_id: string;
          charge_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          charge_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          charge_id?: string;
        };
      };
      invites: {
        Row: {
          id: string;
          house_id: string;
          email: string | null;
          token: string;
          status: "pending" | "accepted" | "expired";
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          email?: string | null;
          token: string;
          status?: "pending" | "accepted" | "expired";
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          email?: string | null;
          token?: string;
          status?: "pending" | "accepted" | "expired";
          expires_at?: string;
        };
      };
      rent_configurations: {
        Row: {
          id: string;
          house_id: string;
          category_id: string;
          user_id: string;
          amount: number;
          percentage: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          category_id: string;
          user_id: string;
          amount: number;
          percentage?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          house_id?: string;
          category_id?: string;
          user_id?: string;
          amount?: number;
          percentage?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
