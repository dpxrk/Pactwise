// Generated types for Supabase database
// This should be replaced with actual generated types from your Supabase project

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string
          email: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          avatar_url: string | null
          enterprise_id: string | null
          role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          enterprise_id?: string | null
          role?: 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          enterprise_id?: string | null
          role?: 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      enterprises: {
        Row: {
          id: string
          name: string
          domain: string | null
          settings: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          settings?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          settings?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          title: string
          status: 'draft' | 'pending_analysis' | 'active' | 'expired' | 'terminated' | 'archived'
          contract_type: string | null
          file_name: string | null
          file_type: string | null
          storage_id: string | null
          start_date: string | null
          end_date: string | null
          value: number | null
          is_auto_renew: boolean
          notes: string | null
          vendor_id: string | null
          enterprise_id: string
          owner_id: string | null
          department_id: string | null
          created_by: string
          last_modified_by: string | null
          analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | null
          analysis_error: string | null
          analyzed_at: string | null
          metadata: Record<string, any> | null
          tags: string[] | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          description?: string | null
        }
        Insert: {
          id?: string
          title: string
          status?: 'draft' | 'pending_analysis' | 'active' | 'expired' | 'terminated' | 'archived'
          contract_type?: string | null
          file_name?: string | null
          file_type?: string | null
          storage_id?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          is_auto_renew?: boolean
          notes?: string | null
          vendor_id?: string | null
          enterprise_id: string
          owner_id?: string | null
          department_id?: string | null
          created_by: string
          last_modified_by?: string | null
          analysis_status?: 'pending' | 'processing' | 'completed' | 'failed' | null
          analysis_error?: string | null
          analyzed_at?: string | null
          metadata?: Record<string, any> | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          title?: string
          status?: 'draft' | 'pending_analysis' | 'active' | 'expired' | 'terminated' | 'archived'
          contract_type?: string | null
          file_name?: string | null
          file_type?: string | null
          storage_id?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          is_auto_renew?: boolean
          notes?: string | null
          vendor_id?: string | null
          owner_id?: string | null
          department_id?: string | null
          last_modified_by?: string | null
          analysis_status?: 'pending' | 'processing' | 'completed' | 'failed' | null
          analysis_error?: string | null
          analyzed_at?: string | null
          metadata?: Record<string, any> | null
          tags?: string[] | null
          updated_at?: string
          deleted_at?: string | null
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          email: string | null
          status: 'active' | 'inactive' | 'pending' | 'blocked'
          category: string | null
          contact_person: string | null
          contact_email: string | null
          contact_phone: string | null
          phone: string | null
          address: string | null
          performance_score: number | null
          compliance_score: number | null
          total_contract_value: number | null
          active_contracts: number | null
          enterprise_id: string
          created_by: string | null
          metadata: Record<string, any> | null
          is_demo: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'blocked'
          category?: string | null
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          phone?: string | null
          address?: string | null
          performance_score?: number | null
          compliance_score?: number | null
          total_contract_value?: number | null
          active_contracts?: number | null
          enterprise_id: string
          created_by?: string | null
          metadata?: Record<string, any> | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          email?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'blocked'
          category?: string | null
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          phone?: string | null
          address?: string | null
          performance_score?: number | null
          compliance_score?: number | null
          total_contract_value?: number | null
          active_contracts?: number | null
          metadata?: Record<string, any> | null
          is_demo?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
      }
      contract_documents: {
        Row: {
          id: string
          file_name: string
          file_path: string
          file_size: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_path: string
          file_size: number
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          uploaded_at?: string
        }
      }
      contract_versions: {
        Row: {
          id: string
          version_number: number
          change_summary: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          version_number: number
          change_summary: string
          created_at?: string
          created_by: string
        }
        Update: {
          version_number?: number
          change_summary?: string
          created_at?: string
          created_by?: string
        }
      }
      contract_clauses: {
        Row: {
          id: string
          clause_type: string
          content: string
          is_critical: boolean
          order_index: number
        }
        Insert: {
          id?: string
          clause_type: string
          content: string
          is_critical?: boolean
          order_index?: number
        }
        Update: {
          clause_type?: string
          content?: string
          is_critical?: boolean
          order_index?: number
        }
      }
      departments: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          name?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]