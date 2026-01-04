export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      dca_orders: {
        Row: {
          amount_per_interval: string
          average_price: number | null
          chain_index: string
          completed_intervals: number | null
          created_at: string | null
          end_date: string | null
          frequency: string
          from_token_address: string
          from_token_symbol: string
          id: string
          next_execution: string
          slippage: string | null
          start_date: string
          status: string
          to_token_address: string
          to_token_symbol: string
          total_intervals: number | null
          total_received: string | null
          total_spent: string | null
          updated_at: string | null
          user_address: string
        }
        Insert: {
          amount_per_interval: string
          average_price?: number | null
          chain_index: string
          completed_intervals?: number | null
          created_at?: string | null
          end_date?: string | null
          frequency: string
          from_token_address: string
          from_token_symbol: string
          id?: string
          next_execution: string
          slippage?: string | null
          start_date: string
          status?: string
          to_token_address: string
          to_token_symbol: string
          total_intervals?: number | null
          total_received?: string | null
          total_spent?: string | null
          updated_at?: string | null
          user_address: string
        }
        Update: {
          amount_per_interval?: string
          average_price?: number | null
          chain_index?: string
          completed_intervals?: number | null
          created_at?: string | null
          end_date?: string | null
          frequency?: string
          from_token_address?: string
          from_token_symbol?: string
          id?: string
          next_execution?: string
          slippage?: string | null
          start_date?: string
          status?: string
          to_token_address?: string
          to_token_symbol?: string
          total_intervals?: number | null
          total_received?: string | null
          total_spent?: string | null
          updated_at?: string | null
          user_address?: string
        }
        Relationships: []
      }
      limit_orders: {
        Row: {
          amount: string
          chain_index: string
          condition: string
          created_at: string
          expires_at: string | null
          from_token_address: string
          from_token_symbol: string
          id: string
          slippage: string | null
          status: string
          target_price: number
          to_token_address: string
          to_token_symbol: string
          triggered_at: string | null
          user_address: string
        }
        Insert: {
          amount: string
          chain_index: string
          condition: string
          created_at?: string
          expires_at?: string | null
          from_token_address: string
          from_token_symbol: string
          id?: string
          slippage?: string | null
          status?: string
          target_price: number
          to_token_address: string
          to_token_symbol: string
          triggered_at?: string | null
          user_address: string
        }
        Update: {
          amount?: string
          chain_index?: string
          condition?: string
          created_at?: string
          expires_at?: string | null
          from_token_address?: string
          from_token_symbol?: string
          id?: string
          slippage?: string | null
          status?: string
          target_price?: number
          to_token_address?: string
          to_token_symbol?: string
          triggered_at?: string | null
          user_address?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          chain_index: string
          created_at: string
          id: string
          snapshot_date: string
          total_value_usd: number | null
          user_address: string
        }
        Insert: {
          chain_index: string
          created_at?: string
          id?: string
          snapshot_date: string
          total_value_usd?: number | null
          user_address: string
        }
        Update: {
          chain_index?: string
          created_at?: string
          id?: string
          snapshot_date?: string
          total_value_usd?: number | null
          user_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
