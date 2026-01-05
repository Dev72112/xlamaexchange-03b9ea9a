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
      commission_claims: {
        Row: {
          claim_amount_usd: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payout_address: string
          payout_chain: string
          payout_tx_hash: string | null
          referrer_address: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          claim_amount_usd: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_address: string
          payout_chain: string
          payout_tx_hash?: string | null
          referrer_address: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          claim_amount_usd?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_address?: string
          payout_chain?: string
          payout_tx_hash?: string | null
          referrer_address?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      rebalance_schedules: {
        Row: {
          chains: string
          created_at: string | null
          frequency: string
          id: string
          last_execution: string | null
          name: string
          next_execution: string
          slippage: string | null
          status: string | null
          target_allocations: Json
          threshold_percent: number | null
          total_rebalances: number | null
          updated_at: string | null
          user_address: string
        }
        Insert: {
          chains: string
          created_at?: string | null
          frequency: string
          id?: string
          last_execution?: string | null
          name?: string
          next_execution: string
          slippage?: string | null
          status?: string | null
          target_allocations?: Json
          threshold_percent?: number | null
          total_rebalances?: number | null
          updated_at?: string | null
          user_address: string
        }
        Update: {
          chains?: string
          created_at?: string | null
          frequency?: string
          id?: string
          last_execution?: string | null
          name?: string
          next_execution?: string
          slippage?: string | null
          status?: string | null
          target_allocations?: Json
          threshold_percent?: number | null
          total_rebalances?: number | null
          updated_at?: string | null
          user_address?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount_usd: number
          chain_index: string
          claim_id: string | null
          claimed_at: string | null
          commission_rate: number
          commission_usd: number
          created_at: string
          id: string
          referee_address: string
          referrer_address: string
          status: string
          token_symbol: string
          trade_hash: string
        }
        Insert: {
          amount_usd: number
          chain_index: string
          claim_id?: string | null
          claimed_at?: string | null
          commission_rate?: number
          commission_usd: number
          created_at?: string
          id?: string
          referee_address: string
          referrer_address: string
          status?: string
          token_symbol: string
          trade_hash: string
        }
        Update: {
          amount_usd?: number
          chain_index?: string
          claim_id?: string | null
          claimed_at?: string | null
          commission_rate?: number
          commission_usd?: number
          created_at?: string
          id?: string
          referee_address?: string
          referrer_address?: string
          status?: string
          token_symbol?: string
          trade_hash?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_address: string
          referral_code: string
          referrer_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          referee_address: string
          referral_code: string
          referrer_address: string
        }
        Update: {
          created_at?: string
          id?: string
          referee_address?: string
          referral_code?: string
          referrer_address?: string
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
