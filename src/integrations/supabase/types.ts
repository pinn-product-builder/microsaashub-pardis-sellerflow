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
      approval_requests: {
        Row: {
          approved_by: string | null
          comments: string | null
          created_at: string
          decided_at: string | null
          expires_at: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          quote_id: string
          quote_margin_percent: number | null
          quote_total: number | null
          reason: string | null
          requested_at: string
          requested_by: string
          rule_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          quote_id: string
          quote_margin_percent?: number | null
          quote_total?: number | null
          reason?: string | null
          requested_at?: string
          requested_by: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          quote_id?: string
          quote_margin_percent?: number | null
          quote_total?: number | null
          reason?: string | null
          requested_at?: string
          requested_by?: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          approver_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          id: string
          is_active: boolean | null
          margin_max: number | null
          margin_min: number | null
          name: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          sla_hours: number | null
          updated_at: string
        }
        Insert: {
          approver_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          margin_max?: number | null
          margin_min?: number | null
          name: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          sla_hours?: number | null
          updated_at?: string
        }
        Update: {
          approver_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          margin_max?: number | null
          margin_min?: number | null
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          sla_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          available_payment_terms: string[] | null
          city: string
          cnpj: string
          company_name: string
          created_at: string
          credit_limit: number | null
          external_id: string | null
          id: string
          is_active: boolean | null
          is_lab_to_lab: boolean | null
          last_sync_at: string | null
          price_table_type: string | null
          state_registration: string | null
          tax_regime: string | null
          trade_name: string | null
          uf: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          available_payment_terms?: string[] | null
          city: string
          cnpj: string
          company_name: string
          created_at?: string
          credit_limit?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          is_lab_to_lab?: boolean | null
          last_sync_at?: string | null
          price_table_type?: string | null
          state_registration?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          uf: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          available_payment_terms?: string[] | null
          city?: string
          cnpj?: string
          company_name?: string
          created_at?: string
          credit_limit?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          is_lab_to_lab?: boolean | null
          last_sync_at?: string | null
          price_table_type?: string | null
          state_registration?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_log: {
        Row: {
          completed_at: string | null
          created_at: string
          entity_type: string
          error_message: string | null
          id: string
          integration_type: string
          records_failed: number | null
          records_processed: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entity_type: string
          error_message?: string | null
          id?: string
          integration_type: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          integration_type?: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      payment_conditions: {
        Row: {
          adjustment_percent: number | null
          created_at: string
          days: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          adjustment_percent?: number | null
          created_at?: string
          days?: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          adjustment_percent?: number | null
          created_at?: string
          days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          admin_percent: number
          created_at: string
          icms_percent: number
          id: string
          is_active: boolean | null
          lab_to_lab_discount: number
          logistics_percent: number
          pis_cofins_percent: number
          region: Database["public"]["Enums"]["region_type"]
          updated_at: string
        }
        Insert: {
          admin_percent?: number
          created_at?: string
          icms_percent?: number
          id?: string
          is_active?: boolean | null
          lab_to_lab_discount?: number
          logistics_percent?: number
          pis_cofins_percent?: number
          region: Database["public"]["Enums"]["region_type"]
          updated_at?: string
        }
        Update: {
          admin_percent?: number
          created_at?: string
          icms_percent?: number
          id?: string
          is_active?: boolean | null
          lab_to_lab_discount?: number
          logistics_percent?: number
          pis_cofins_percent?: number
          region?: Database["public"]["Enums"]["region_type"]
          updated_at?: string
        }
        Relationships: []
      }
      pricing_engine_config: {
        Row: {
          created_at: string | null
          default_markup_br: number
          default_markup_mg: number
          id: string
          is_active: boolean | null
          margin_authorized_threshold: number
          margin_green_threshold: number
          margin_orange_threshold: number
          margin_yellow_threshold: number
          minimum_price_margin_target: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_markup_br?: number
          default_markup_mg?: number
          id?: string
          is_active?: boolean | null
          margin_authorized_threshold?: number
          margin_green_threshold?: number
          margin_orange_threshold?: number
          margin_yellow_threshold?: number
          minimum_price_margin_target?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_markup_br?: number
          default_markup_mg?: number
          id?: string
          is_active?: boolean | null
          margin_authorized_threshold?: number
          margin_green_threshold?: number
          margin_orange_threshold?: number
          margin_yellow_threshold?: number
          minimum_price_margin_target?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          base_cost: number
          campaign_discount: number | null
          campaign_name: string | null
          category: string | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          ncm: string | null
          price_br: number | null
          price_mg: number | null
          price_minimum: number | null
          responsible_user_id: string | null
          sku: string
          status: string | null
          stock_min_expiry: string | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          base_cost: number
          campaign_discount?: number | null
          campaign_name?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          ncm?: string | null
          price_br?: number | null
          price_mg?: number | null
          price_minimum?: number | null
          responsible_user_id?: string | null
          sku: string
          status?: string | null
          stock_min_expiry?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          base_cost?: number
          campaign_discount?: number | null
          campaign_name?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          ncm?: string | null
          price_br?: number | null
          price_mg?: number | null
          price_minimum?: number | null
          responsible_user_id?: string | null
          sku?: string
          status?: string | null
          stock_min_expiry?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          region: Database["public"]["Enums"]["region_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          region?: Database["public"]["Enums"]["region_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          region?: Database["public"]["Enums"]["region_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          campaign_discount: number | null
          campaign_name: string | null
          cluster_price: number | null
          created_at: string
          id: string
          is_authorized: boolean | null
          list_price: number
          margin_percent: number | null
          margin_value: number | null
          minimum_price: number | null
          offered_price: number
          product_id: string
          quantity: number
          quote_id: string
          stock_available: number | null
          stock_min_expiry: string | null
          total_list: number
          total_offered: number
          updated_at: string
        }
        Insert: {
          campaign_discount?: number | null
          campaign_name?: string | null
          cluster_price?: number | null
          created_at?: string
          id?: string
          is_authorized?: boolean | null
          list_price: number
          margin_percent?: number | null
          margin_value?: number | null
          minimum_price?: number | null
          offered_price: number
          product_id: string
          quantity?: number
          quote_id: string
          stock_available?: number | null
          stock_min_expiry?: string | null
          total_list: number
          total_offered: number
          updated_at?: string
        }
        Update: {
          campaign_discount?: number | null
          campaign_name?: string | null
          cluster_price?: number | null
          created_at?: string
          id?: string
          is_authorized?: boolean | null
          list_price?: number
          margin_percent?: number | null
          margin_value?: number | null
          minimum_price?: number | null
          offered_price?: number
          product_id?: string
          quantity?: number
          quote_id?: string
          stock_available?: number | null
          stock_min_expiry?: string | null
          total_list?: number
          total_offered?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_validity_config: {
        Row: {
          created_at: string
          default_days: number
          expiry_message: string | null
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_days?: number
          expiry_message?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_days?: number
          expiry_message?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          coupon_value: number | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_authorized: boolean | null
          notes: string | null
          payment_condition_id: string | null
          quote_number: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number | null
          total_discount: number | null
          total_margin_percent: number | null
          total_margin_value: number | null
          total_offered: number | null
          updated_at: string
          valid_until: string
          vtex_order_id: string | null
        }
        Insert: {
          coupon_value?: number | null
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          is_authorized?: boolean | null
          notes?: string | null
          payment_condition_id?: string | null
          quote_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          total_discount?: number | null
          total_margin_percent?: number | null
          total_margin_value?: number | null
          total_offered?: number | null
          updated_at?: string
          valid_until: string
          vtex_order_id?: string | null
        }
        Update: {
          coupon_value?: number | null
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_authorized?: boolean | null
          notes?: string | null
          payment_condition_id?: string | null
          quote_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          total_discount?: number | null
          total_margin_percent?: number | null
          total_margin_value?: number | null
          total_offered?: number | null
          updated_at?: string
          valid_until?: string
          vtex_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_payment_condition_id_fkey"
            columns: ["payment_condition_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve: {
        Args: {
          _required_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vendedor" | "coordenador" | "gerente" | "diretor" | "admin"
      approval_status: "pending" | "approved" | "rejected" | "expired"
      priority_level: "low" | "medium" | "high" | "critical"
      quote_status:
        | "draft"
        | "calculated"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "expired"
        | "converted"
      region_type: "MG" | "BR"
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
    Enums: {
      app_role: ["vendedor", "coordenador", "gerente", "diretor", "admin"],
      approval_status: ["pending", "approved", "rejected", "expired"],
      priority_level: ["low", "medium", "high", "critical"],
      quote_status: [
        "draft",
        "calculated",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "expired",
        "converted",
      ],
      region_type: ["MG", "BR"],
    },
  },
} as const
