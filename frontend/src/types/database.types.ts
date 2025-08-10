// Generated types for Supabase database
// This should be replaced with actual generated types from your Supabase project

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          enterprise_id: string | null
          role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
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