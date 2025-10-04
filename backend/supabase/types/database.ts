export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_insights: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_details: Json | null
          action_taken: boolean | null
          agent_id: string
          budget_id: string | null
          confidence_score: number | null
          contract_id: string | null
          created_at: string | null
          data: Json | null
          description: string
          enterprise_id: string
          expires_at: string | null
          id: string
          insight_type: string
          is_actionable: boolean | null
          severity: string | null
          title: string
          vendor_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_details?: Json | null
          action_taken?: boolean | null
          agent_id: string
          budget_id?: string | null
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string | null
          data?: Json | null
          description: string
          enterprise_id: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_actionable?: boolean | null
          severity?: string | null
          title: string
          vendor_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_details?: Json | null
          action_taken?: boolean | null
          agent_id?: string
          budget_id?: string | null
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_actionable?: boolean | null
          severity?: string | null
          title?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_insights_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_insights_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_system: {
        Row: {
          capabilities: Json | null
          config: Json
          created_at: string | null
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          version: string
        }
        Insert: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          version: string
        }
        Update: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_system_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          enterprise_id: string
          error: string | null
          id: string
          max_retries: number | null
          payload: Json
          priority: number | null
          result: Json | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          task_type: string
          vendor_id: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          enterprise_id: string
          error?: string | null
          id?: string
          max_retries?: number | null
          payload: Json
          priority?: number | null
          result?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_type: string
          vendor_id?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          enterprise_id?: string
          error?: string | null
          id?: string
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          result?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          capabilities: Json | null
          config: Json | null
          created_at: string | null
          description: string | null
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          name: string
          system_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          capabilities?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          system_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          capabilities?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agent_system"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_cache: {
        Row: {
          cache_key: string
          cache_type: string
          created_at: string | null
          data: Json
          enterprise_id: string
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          cache_type: string
          created_at?: string | null
          data: Json
          enterprise_id: string
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          cache_type?: string
          created_at?: string | null
          data?: Json
          enterprise_id?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_cache_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage: {
        Row: {
          api_key_id: string
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown | null
          method: string
          request_size: number | null
          response_size: number | null
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: unknown | null
          method: string
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          method?: string
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          description: string | null
          enterprise_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
          rate_limit: number | null
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          rate_limit?: number | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          rate_limit?: number | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          enterprise_id: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          enterprise_id: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          enterprise_id?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alerts: Json | null
          allocated_amount: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          committed_amount: number | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          department: string | null
          end_date: string
          enterprise_id: string
          id: string
          metadata: Json | null
          name: string
          owner_id: string | null
          parent_budget_id: string | null
          spent_amount: number | null
          start_date: string
          status: Database["public"]["Enums"]["budget_status"] | null
          total_budget: number
          updated_at: string | null
        }
        Insert: {
          alerts?: Json | null
          allocated_amount?: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          committed_amount?: number | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          department?: string | null
          end_date: string
          enterprise_id: string
          id?: string
          metadata?: Json | null
          name: string
          owner_id?: string | null
          parent_budget_id?: string | null
          spent_amount?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["budget_status"] | null
          total_budget: number
          updated_at?: string | null
        }
        Update: {
          alerts?: Json | null
          allocated_amount?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          committed_amount?: number | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          department?: string | null
          end_date?: string
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          parent_budget_id?: string | null
          spent_amount?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"] | null
          total_budget?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_parent_budget_id_fkey"
            columns: ["parent_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
          tokens: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          tokens?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          closed_at: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          enterprise_id: string
          id: string
          is_active: boolean | null
          model: string | null
          title: string | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_documents: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          document_id: string
          document_type: string
          enterprise_id: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          document_id: string
          document_type: string
          enterprise_id: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          document_id?: string
          document_type?: string
          enterprise_id?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_documents_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_documents_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_type: string
          contract_id: string | null
          created_at: string | null
          enterprise_id: string
          id: string
          issues: Json | null
          next_check_date: string | null
          passed: boolean | null
          performed_at: string | null
          performed_by: string | null
          severity: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          check_type: string
          contract_id?: string | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          issues?: Json | null
          next_check_date?: string | null
          passed?: boolean | null
          performed_at?: string | null
          performed_by?: string | null
          severity?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          check_type?: string
          contract_id?: string | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          issues?: Json | null
          next_check_date?: string | null
          passed?: boolean | null
          performed_at?: string | null
          performed_by?: string | null
          severity?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "compliance_checks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_approvals: {
        Row: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          approved_at: string | null
          approver_id: string
          comments: string | null
          conditions: Json | null
          contract_id: string
          created_at: string | null
          enterprise_id: string
          id: string
          rejected_at: string | null
          status: Database["public"]["Enums"]["approval_status"] | null
          updated_at: string | null
        }
        Insert: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          conditions?: Json | null
          contract_id: string
          created_at?: string | null
          enterprise_id: string
          id?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Update: {
          approval_type?: Database["public"]["Enums"]["approval_type"]
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          conditions?: Json | null
          contract_id?: string
          created_at?: string | null
          enterprise_id?: string
          id?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_approvals_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          assignment_type: string
          contract_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          unassigned_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          assignment_type: string
          contract_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          unassigned_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          assignment_type?: string
          contract_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          unassigned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_budget_allocations: {
        Row: {
          allocated_amount: number
          allocation_type: string
          budget_id: string
          contract_id: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          allocated_amount: number
          allocation_type: string
          budget_id: string
          contract_id: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          allocation_type?: string
          budget_id?: string
          contract_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_budget_allocations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_budget_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_budget_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          clause_text: string
          clause_type: string
          confidence_score: number | null
          contract_id: string
          created_at: string | null
          enterprise_id: string
          id: string
          location_end: number | null
          location_start: number | null
          metadata: Json | null
          risk_level: string | null
          risk_reason: string | null
        }
        Insert: {
          clause_text: string
          clause_type: string
          confidence_score?: number | null
          contract_id: string
          created_at?: string | null
          enterprise_id: string
          id?: string
          location_end?: number | null
          location_start?: number | null
          metadata?: Json | null
          risk_level?: string | null
          risk_reason?: string | null
        }
        Update: {
          clause_text?: string
          clause_type?: string
          confidence_score?: number | null
          contract_id?: string
          created_at?: string | null
          enterprise_id?: string
          id?: string
          location_end?: number | null
          location_start?: number | null
          metadata?: Json | null
          risk_level?: string | null
          risk_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_clauses_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_status_history: {
        Row: {
          changed_by: string
          contract_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["contract_status"]
          previous_status: Database["public"]["Enums"]["contract_status"] | null
          reason: string | null
        }
        Insert: {
          changed_by: string
          contract_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["contract_status"]
          previous_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          reason?: string | null
        }
        Update: {
          changed_by?: string
          contract_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["contract_status"]
          previous_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          analysis_error: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"] | null
          analyzed_at: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          department_id: string | null
          end_date: string | null
          enterprise_id: string
          extracted_address: string | null
          extracted_end_date: string | null
          extracted_key_terms: Json | null
          extracted_parties: Json | null
          extracted_payment_schedule: Json | null
          extracted_pricing: Json | null
          extracted_scope: string | null
          extracted_start_date: string | null
          file_name: string | null
          file_type: string | null
          id: string
          is_auto_renew: boolean | null
          last_modified_by: string | null
          metadata: Json | null
          notes: string | null
          owner_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          storage_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          value: number | null
          vendor_id: string
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          analyzed_at?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          department_id?: string | null
          end_date?: string | null
          enterprise_id: string
          extracted_address?: string | null
          extracted_end_date?: string | null
          extracted_key_terms?: Json | null
          extracted_parties?: Json | null
          extracted_payment_schedule?: Json | null
          extracted_pricing?: Json | null
          extracted_scope?: string | null
          extracted_start_date?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          is_auto_renew?: boolean | null
          last_modified_by?: string | null
          metadata?: Json | null
          notes?: string | null
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          storage_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          value?: number | null
          vendor_id: string
        }
        Update: {
          analysis_error?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          analyzed_at?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          department_id?: string | null
          end_date?: string | null
          enterprise_id?: string
          extracted_address?: string | null
          extracted_end_date?: string | null
          extracted_key_terms?: Json | null
          extracted_parties?: Json | null
          extracted_payment_schedule?: Json | null
          extracted_pricing?: Json | null
          extracted_scope?: string | null
          extracted_start_date?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          is_auto_renew?: boolean | null
          last_modified_by?: string | null
          metadata?: Json | null
          notes?: string | null
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          storage_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          value?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          document_id: string
          enterprise_id: string
          id: string
          is_resolved: boolean | null
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          selection_end: number | null
          selection_start: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          document_id: string
          enterprise_id: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          document_id?: string
          enterprise_id?: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "collaborative_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_snapshots: {
        Row: {
          change_summary: string | null
          content: string
          content_hash: string | null
          created_at: string | null
          created_by: string
          document_id: string
          id: string
          metadata: Json | null
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          content_hash?: string | null
          created_at?: string | null
          created_by: string
          document_id: string
          id?: string
          metadata?: Json | null
          version: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          content_hash?: string | null
          created_at?: string | null
          created_by?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "collaborative_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_suggestions: {
        Row: {
          created_at: string | null
          document_id: string
          enterprise_id: string
          id: string
          original_text: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selection_end: number
          selection_start: number
          status: string | null
          suggested_text: string | null
          suggestion_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          enterprise_id: string
          id?: string
          original_text?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selection_end: number
          selection_start: number
          status?: string | null
          suggested_text?: string | null
          suggestion_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          enterprise_id?: string
          id?: string
          original_text?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selection_end?: number
          selection_start?: number
          status?: string | null
          suggested_text?: string | null
          suggestion_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "collaborative_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_suggestions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          content: string
          created_at: string | null
          embedding: string
          enterprise_id: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding: string
          enterprise_id: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          access_pin: string | null
          allow_child_organizations: boolean | null
          contract_volume: number | null
          created_at: string | null
          deleted_at: string | null
          domain: string | null
          id: string
          industry: string | null
          is_parent_organization: boolean | null
          metadata: Json | null
          name: string
          parent_enterprise_id: string | null
          primary_use_case: string | null
          settings: Json | null
          size: string | null
          updated_at: string | null
        }
        Insert: {
          access_pin?: string | null
          allow_child_organizations?: boolean | null
          contract_volume?: number | null
          created_at?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          is_parent_organization?: boolean | null
          metadata?: Json | null
          name: string
          parent_enterprise_id?: string | null
          primary_use_case?: string | null
          settings?: Json | null
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          access_pin?: string | null
          allow_child_organizations?: boolean | null
          contract_volume?: number | null
          created_at?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          is_parent_organization?: boolean | null
          metadata?: Json | null
          name?: string
          parent_enterprise_id?: string | null
          primary_use_case?: string | null
          settings?: Json | null
          size?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprises_parent_enterprise_id_fkey"
            columns: ["parent_enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          storage_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          storage_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          storage_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_metadata_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      long_term_memory: {
        Row: {
          access_count: number | null
          category: string | null
          consolidated_at: string | null
          consolidation_count: number | null
          content: string
          context: Json | null
          created_at: string | null
          embedding: string | null
          enterprise_id: string
          id: string
          importance_score: number | null
          last_accessed_at: string | null
          memory_type: string
          summary: string | null
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          category?: string | null
          consolidated_at?: string | null
          consolidation_count?: number | null
          content: string
          context?: Json | null
          created_at?: string | null
          embedding?: string | null
          enterprise_id: string
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type: string
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          category?: string | null
          consolidated_at?: string | null
          consolidation_count?: number | null
          content?: string
          context?: Json | null
          created_at?: string | null
          embedding?: string | null
          enterprise_id?: string
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type?: string
          summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "long_term_memory_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_term_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject_template: string
          type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject_template: string
          type: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string
          type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          data: Json | null
          enterprise_id: string
          expires_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string | null
          read_at: string | null
          severity: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          enterprise_id: string
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          severity?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      query_metrics: {
        Row: {
          cache_hit: boolean | null
          created_at: string | null
          enterprise_id: string | null
          execution_time_ms: number
          id: string
          query_name: string
          rows_returned: number | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string | null
          enterprise_id?: string | null
          execution_time_ms: number
          id?: string
          query_name: string
          rows_returned?: number | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string | null
          enterprise_id?: string | null
          execution_time_ms?: number
          id?: string
          query_name?: string
          rows_returned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "query_metrics_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          identifier: string
          identifier_type: string
          limit_exceeded: boolean | null
          request_count: number | null
          window_duration_seconds: number
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          identifier: string
          identifier_type: string
          limit_exceeded?: boolean | null
          request_count?: number | null
          window_duration_seconds: number
          window_start: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          limit_exceeded?: boolean | null
          request_count?: number | null
          window_duration_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      realtime_events: {
        Row: {
          created_at: string | null
          enterprise_id: string
          event_data: Json
          event_type: string
          expires_at: string | null
          id: string
          is_broadcast: boolean | null
          resource_id: string | null
          resource_type: string | null
          target_users: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          event_data: Json
          event_type: string
          expires_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          target_users?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          event_data?: Json
          event_type?: string
          expires_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          target_users?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtime_events_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realtime_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      short_term_memory: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          content: string
          context: Json | null
          created_at: string | null
          embedding: string | null
          enterprise_id: string
          expires_at: string | null
          id: string
          importance_score: number | null
          memory_type: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          content: string
          context?: Json | null
          created_at?: string | null
          embedding?: string | null
          enterprise_id: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_type: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          content?: string
          context?: Json | null
          created_at?: string | null
          embedding?: string | null
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_term_memory_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_term_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          expires_at: string | null
          field_name: string | null
          id: string
          resource_id: string
          resource_type: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          field_name?: string | null
          id?: string
          resource_id: string
          resource_type: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          field_name?: string | null
          id?: string
          resource_id?: string
          resource_type?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          frequency: string | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          frequency?: string | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          frequency?: string | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          activity_details: Json | null
          activity_type: string | null
          created_at: string | null
          current_path: string | null
          enterprise_id: string
          id: string
          last_seen_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          activity_details?: Json | null
          activity_type?: string | null
          created_at?: string | null
          current_path?: string | null
          enterprise_id: string
          id?: string
          last_seen_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string | null
          created_at?: string | null
          current_path?: string | null
          enterprise_id?: string
          id?: string
          last_seen_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          created_at: string | null
          deleted_at: string | null
          department: string | null
          email: string
          enterprise_id: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          last_name: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          settings: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email: string
          enterprise_id: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          enterprise_id?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active_contracts: number | null
          address: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          compliance_score: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          enterprise_id: string
          id: string
          is_demo: boolean | null
          metadata: Json | null
          name: string
          performance_score: number | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          total_contract_value: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          active_contracts?: number | null
          address?: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          compliance_score?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id: string
          id?: string
          is_demo?: boolean | null
          metadata?: Json | null
          name: string
          performance_score?: number | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          total_contract_value?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          active_contracts?: number | null
          address?: string | null
          category?: Database["public"]["Enums"]["vendor_category"]
          compliance_score?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id?: string
          id?: string
          is_demo?: boolean | null
          metadata?: Json | null
          name?: string
          performance_score?: number | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          total_contract_value?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          delivered_at: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          created_by: string
          enterprise_id: string
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          name: string
          retry_policy: Json | null
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          enterprise_id: string
          events: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          retry_policy?: Json | null
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          enterprise_id?: string
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          retry_policy?: Json | null
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vendor_metrics_mv: {
        Row: {
          active_contracts: number | null
          compliance_score: number | null
          enterprise_id: string | null
          last_metric_update: string | null
          metrics_calculated_at: string | null
          performance_score: number | null
          total_contract_value: number | null
          total_contracts: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_enterprise_id: string
          p_new_values: Json
          p_old_values: Json
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: string
      }
      nanoid: {
        Args: { size?: number }
        Returns: string
      }
      refresh_vendor_metrics_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      sync_vendor_metrics_from_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      analysis_status: "pending" | "processing" | "completed" | "failed"
      approval_status: "pending" | "approved" | "rejected" | "escalated"
      approval_type:
        | "initial_review"
        | "legal_review"
        | "finance_review"
        | "final_approval"
        | "renewal_approval"
      budget_status: "healthy" | "at_risk" | "exceeded" | "closed"
      budget_type: "annual" | "quarterly" | "monthly" | "project" | "department"
      contract_status:
        | "draft"
        | "pending_analysis"
        | "pending_review"
        | "active"
        | "expired"
        | "terminated"
        | "archived"
      user_role: "owner" | "admin" | "manager" | "user" | "viewer"
      vendor_category:
        | "technology"
        | "marketing"
        | "legal"
        | "finance"
        | "hr"
        | "facilities"
        | "logistics"
        | "manufacturing"
        | "consulting"
        | "other"
      vendor_status: "active" | "inactive" | "pending" | "suspended"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      analysis_status: ["pending", "processing", "completed", "failed"],
      approval_status: ["pending", "approved", "rejected", "escalated"],
      approval_type: [
        "initial_review",
        "legal_review",
        "finance_review",
        "final_approval",
        "renewal_approval",
      ],
      budget_status: ["healthy", "at_risk", "exceeded", "closed"],
      budget_type: ["annual", "quarterly", "monthly", "project", "department"],
      contract_status: [
        "draft",
        "pending_analysis",
        "pending_review",
        "active",
        "expired",
        "terminated",
        "archived",
      ],
      user_role: ["owner", "admin", "manager", "user", "viewer"],
      vendor_category: [
        "technology",
        "marketing",
        "legal",
        "finance",
        "hr",
        "facilities",
        "logistics",
        "manufacturing",
        "consulting",
        "other",
      ],
      vendor_status: ["active", "inactive", "pending", "suspended"],
    },
  },
} as const

