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
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      art_templates: {
        Row: {
          created_at: string
          description: string | null
          editable_fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          product_type: string
          svg_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          editable_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          product_type?: string
          svg_content: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          editable_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          product_type?: string
          svg_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      bio_page_analytics: {
        Row: {
          bio_page_id: string
          button_id: string | null
          city: string | null
          country: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          bio_page_id: string
          button_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          bio_page_id?: string
          button_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bio_page_analytics_bio_page_id_fkey"
            columns: ["bio_page_id"]
            isOneToOne: false
            referencedRelation: "bio_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_pages: {
        Row: {
          buttons: Json | null
          created_at: string
          display_id: string | null
          gallery_photos: Json | null
          id: string
          is_active: boolean | null
          pet_tag_id: string | null
          profile_photo_url: string | null
          slug: string
          subtitle: string | null
          theme: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buttons?: Json | null
          created_at?: string
          display_id?: string | null
          gallery_photos?: Json | null
          id?: string
          is_active?: boolean | null
          pet_tag_id?: string | null
          profile_photo_url?: string | null
          slug: string
          subtitle?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buttons?: Json | null
          created_at?: string
          display_id?: string | null
          gallery_photos?: Json | null
          id?: string
          is_active?: boolean | null
          pet_tag_id?: string | null
          profile_photo_url?: string | null
          slug?: string
          subtitle?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_pages_display_id_fkey"
            columns: ["display_id"]
            isOneToOne: false
            referencedRelation: "business_displays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_pages_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_pages_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_displays: {
        Row: {
          business_name: string | null
          buttons: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_activated: boolean | null
          logo_url: string | null
          qr_code: string
          slug: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_name?: string | null
          buttons?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_activated?: boolean | null
          logo_url?: string | null
          qr_code?: string
          slug?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_name?: string | null
          buttons?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_activated?: boolean | null
          logo_url?: string | null
          qr_code?: string
          slug?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_displays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_order_value: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_arts: {
        Row: {
          created_at: string
          custom_data: Json | null
          final_svg: string | null
          id: string
          logo_url: string | null
          order_item_id: string | null
          status: string | null
          template_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_data?: Json | null
          final_svg?: string | null
          id?: string
          logo_url?: string | null
          order_item_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_data?: Json | null
          final_svg?: string | null
          id?: string
          logo_url?: string | null
          order_item_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_arts_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_arts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "art_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_arts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          display_id: string | null
          id: string
          order_id: string | null
          pet_tag_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          display_id?: string | null
          id?: string
          order_id?: string | null
          pet_tag_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          display_id?: string | null
          id?: string
          order_id?: string | null
          pet_tag_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_display_id_fkey"
            columns: ["display_id"]
            isOneToOne: false
            referencedRelation: "business_displays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          asaas_payment_id: string | null
          asaas_payment_link: string | null
          coupon_id: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_label_url: string | null
          shipping_method: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string | null
          total_amount: number
          tracking_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          asaas_payment_id?: string | null
          asaas_payment_link?: string | null
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string | null
          total_amount: number
          tracking_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          asaas_payment_id?: string | null
          asaas_payment_link?: string | null
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string | null
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          card_brand: string | null
          card_last_digits: string | null
          created_at: string | null
          error_message: string | null
          id: string
          installments: number | null
          order_id: string | null
          paid_at: string | null
          payment_method: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          installments?: number | null
          order_id?: string | null
          paid_at?: string | null
          payment_method: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          installments?: number | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_tags: {
        Row: {
          address: string | null
          buttons: Json | null
          created_at: string | null
          gallery_photos: Json | null
          id: string
          is_activated: boolean | null
          lost_mode: boolean | null
          owner_name: string | null
          pet_name: string | null
          pet_photo_url: string | null
          phone: string | null
          qr_code: string
          reward_enabled: boolean | null
          reward_text: string | null
          slug: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          buttons?: Json | null
          created_at?: string | null
          gallery_photos?: Json | null
          id?: string
          is_activated?: boolean | null
          lost_mode?: boolean | null
          owner_name?: string | null
          pet_name?: string | null
          pet_photo_url?: string | null
          phone?: string | null
          qr_code?: string
          reward_enabled?: boolean | null
          reward_text?: string | null
          slug?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          buttons?: Json | null
          created_at?: string | null
          gallery_photos?: Json | null
          id?: string
          is_activated?: boolean | null
          lost_mode?: boolean | null
          owner_name?: string | null
          pet_name?: string | null
          pet_photo_url?: string | null
          phone?: string | null
          qr_code?: string
          reward_enabled?: boolean | null
          reward_text?: string | null
          slug?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          expires_at: string
          id: string
          order_id: string
          pix_key: string
          pix_key_type: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          pix_key: string
          pix_key_type?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          pix_key?: string
          pix_key_type?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          asaas_customer_id: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          numero: string | null
          phone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          asaas_customer_id?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          numero?: string | null
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          asaas_customer_id?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          numero?: string | null
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      qr_scans: {
        Row: {
          city: string | null
          country: string | null
          display_id: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          pet_tag_id: string | null
          scanned_at: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          display_id?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          pet_tag_id?: string | null
          scanned_at?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          display_id?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          pet_tag_id?: string | null
          scanned_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_display_id_fkey"
            columns: ["display_id"]
            isOneToOne: false
            referencedRelation: "business_displays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_pet_tag_id_fkey"
            columns: ["pet_tag_id"]
            isOneToOne: false
            referencedRelation: "pet_tags_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pet_tags_public: {
        Row: {
          created_at: string | null
          id: string | null
          is_activated: boolean | null
          lost_mode: boolean | null
          pet_name: string | null
          pet_photo_url: string | null
          qr_code: string | null
          reward_enabled: boolean | null
          reward_text: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_activated?: boolean | null
          lost_mode?: boolean | null
          pet_name?: string | null
          pet_photo_url?: string | null
          qr_code?: string | null
          reward_enabled?: boolean | null
          reward_text?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_activated?: boolean | null
          lost_mode?: boolean | null
          pet_name?: string | null
          pet_photo_url?: string | null
          qr_code?: string | null
          reward_enabled?: boolean | null
          reward_text?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
