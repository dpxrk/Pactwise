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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      addresses: {
        Row: {
          address_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          formatted_address: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          state_province: string | null
          street_address_1: string | null
          street_address_2: string | null
          updated_at: string | null
        }
        Insert: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          formatted_address?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state_province?: string | null
          street_address_1?: string | null
          street_address_2?: string | null
          updated_at?: string | null
        }
        Update: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          formatted_address?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state_province?: string | null
          street_address_1?: string | null
          street_address_2?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "agent_insights_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_insights_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      agent_knowledge_graph: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          enterprise_id: string
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          properties: Json | null
          related_to_id: string | null
          related_to_type: string | null
          relationship_type: string | null
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          properties?: Json | null
          related_to_id?: string | null
          related_to_type?: string | null
          relationship_type?: string | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          properties?: Json | null
          related_to_id?: string | null
          related_to_type?: string | null
          relationship_type?: string | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_graph_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_knowledge_graph_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning: {
        Row: {
          agent_id: string
          confidence_score: number | null
          context: Json
          created_at: string | null
          enterprise_id: string
          id: string
          learned_from_task_id: string | null
          learning_type: string
          lesson: string
          success_rate: number | null
          times_applied: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          confidence_score?: number | null
          context: Json
          created_at?: string | null
          enterprise_id: string
          id?: string
          learned_from_task_id?: string | null
          learning_type: string
          lesson: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          confidence_score?: number | null
          context?: Json
          created_at?: string | null
          enterprise_id?: string
          id?: string
          learned_from_task_id?: string | null
          learning_type?: string
          lesson?: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_learned_from_task_id_fkey"
            columns: ["learned_from_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          agent_id: string
          created_at: string | null
          execution_time_ms: number | null
          id: string
          log_level: string | null
          log_type: string
          message: string
          metadata: Json | null
          task_id: string | null
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          log_level?: string | null
          log_type: string
          message: string
          metadata?: Json | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          log_level?: string | null
          log_type?: string
          message?: string
          metadata?: Json | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          access_count: number | null
          agent_id: string
          content: string
          created_at: string | null
          embedding: string | null
          enterprise_id: string
          expires_at: string | null
          id: string
          importance_score: number | null
          last_accessed_at: string | null
          memory_type: string | null
          related_contract_id: string | null
          related_task_id: string | null
          related_vendor_id: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          agent_id: string
          content: string
          created_at?: string | null
          embedding?: string | null
          enterprise_id: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type?: string | null
          related_contract_id?: string | null
          related_task_id?: string | null
          related_vendor_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          agent_id?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          enterprise_id?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type?: string | null
          related_contract_id?: string | null
          related_task_id?: string | null
          related_vendor_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_memory_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_memory_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reasoning_traces: {
        Row: {
          agent_id: string
          confidence_score: number | null
          content: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          step_number: number
          step_type: string
          success: boolean | null
          task_id: string
          tool_input: Json | null
          tool_output: Json | null
          tool_used: string | null
        }
        Insert: {
          agent_id: string
          confidence_score?: number | null
          content: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          step_number: number
          step_type: string
          success?: boolean | null
          task_id: string
          tool_input?: Json | null
          tool_output?: Json | null
          tool_used?: string | null
        }
        Update: {
          agent_id?: string
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          step_number?: number
          step_type?: string
          success?: boolean | null
          task_id?: string
          tool_input?: Json | null
          tool_output?: Json | null
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reasoning_traces_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reasoning_traces_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
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
          error_message: string | null
          id: string
          is_active: boolean | null
          is_running: boolean | null
          last_started: string | null
          last_stopped: string | null
          metrics: Json | null
          name: string
          status: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          enterprise_id?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          is_running?: boolean | null
          last_started?: string | null
          last_stopped?: string | null
          metrics?: Json | null
          name: string
          status?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          enterprise_id?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          is_running?: boolean | null
          last_started?: string | null
          last_stopped?: string | null
          metrics?: Json | null
          name?: string
          status?: string | null
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
            foreignKeyName: "agent_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "agent_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      agent_validation_errors: {
        Row: {
          agent_id: string | null
          agent_type: string
          created_at: string | null
          enterprise_id: string
          error_count: number | null
          errors: Json
          id: string
          operation: string
          request_data: Json | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_type: string
          created_at?: string | null
          enterprise_id: string
          error_count?: number | null
          errors?: Json
          id?: string
          operation: string
          request_data?: Json | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_type?: string
          created_at?: string | null
          enterprise_id?: string
          error_count?: number | null
          errors?: Json
          id?: string
          operation?: string
          request_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_validation_errors_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_validation_errors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_validation_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          error_count: number | null
          id: string
          is_active: boolean | null
          is_enabled: boolean | null
          last_error: string | null
          last_run: string | null
          last_success: string | null
          metrics: Json | null
          name: string
          run_count: number | null
          status: string | null
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
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_error?: string | null
          last_run?: string | null
          last_success?: string | null
          metrics?: Json | null
          name: string
          run_count?: number | null
          status?: string | null
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
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_error?: string | null
          last_run?: string | null
          last_success?: string | null
          metrics?: Json | null
          name?: string
          run_count?: number | null
          status?: string | null
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
      analysis_embeddings: {
        Row: {
          content_hash: string
          content_id: string
          content_text: string
          content_type: string
          created_at: string | null
          embedding: string | null
          embedding_dimension: number | null
          embedding_model: string
          enterprise_id: string
          id: string
          language: string | null
          metadata: Json | null
          similarity_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          content_hash: string
          content_id: string
          content_text: string
          content_type: string
          created_at?: string | null
          embedding?: string | null
          embedding_dimension?: number | null
          embedding_model: string
          enterprise_id: string
          id?: string
          language?: string | null
          metadata?: Json | null
          similarity_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string
          content_id?: string
          content_text?: string
          content_type?: string
          created_at?: string | null
          embedding?: string | null
          embedding_dimension?: number | null
          embedding_model?: string
          enterprise_id?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          similarity_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_embeddings_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      approval_delegations: {
        Row: {
          created_at: string | null
          created_by: string | null
          delegate_id: string
          delegation_scope: string
          delegator_id: string
          effective_from: string
          effective_until: string | null
          enterprise_id: string
          id: string
          max_approval_value: number | null
          reason: string | null
          scope_config: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delegate_id: string
          delegation_scope?: string
          delegator_id: string
          effective_from: string
          effective_until?: string | null
          enterprise_id: string
          id?: string
          max_approval_value?: number | null
          reason?: string | null
          scope_config?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delegate_id?: string
          delegation_scope?: string
          delegator_id?: string
          effective_from?: string
          effective_until?: string | null
          enterprise_id?: string
          id?: string
          max_approval_value?: number | null
          reason?: string | null
          scope_config?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_escalations: {
        Row: {
          created_at: string | null
          days_pending: number | null
          enterprise_id: string
          escalated_at: string | null
          escalated_to: string | null
          escalation_level: number | null
          escalation_reason: string | null
          id: string
          original_approver: string | null
          resolution_type: string | null
          resolved_at: string | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          created_at?: string | null
          days_pending?: number | null
          enterprise_id: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          escalation_reason?: string | null
          id?: string
          original_approver?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resource_id: string
          resource_type: string
        }
        Update: {
          created_at?: string | null
          days_pending?: number | null
          enterprise_id?: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          escalation_reason?: string | null
          id?: string
          original_approver?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_escalations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_escalations_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_escalations_original_approver_fkey"
            columns: ["original_approver"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_matrices: {
        Row: {
          applies_to: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_until: string | null
          enterprise_id: string
          id: string
          is_active: boolean | null
          matrix_code: string
          name: string
          previous_version_id: string | null
          priority: number | null
          scope_value: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          applies_to: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          matrix_code: string
          name: string
          previous_version_id?: string | null
          priority?: number | null
          scope_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          matrix_code?: string
          name?: string
          previous_version_id?: string | null
          priority?: number | null
          scope_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_matrices_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_matrices_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "approval_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_matrix_rules: {
        Row: {
          approval_type: string | null
          approvers: Json
          auto_approve_if_no_match: boolean | null
          conditions: Json
          created_at: string | null
          escalation_days: number | null
          id: string
          is_active: boolean | null
          matrix_id: string
          notify_on_assignment: boolean | null
          notify_on_escalation: boolean | null
          reminder_days: number[] | null
          rule_name: string
          rule_order: number
          skip_if_self: boolean | null
        }
        Insert: {
          approval_type?: string | null
          approvers?: Json
          auto_approve_if_no_match?: boolean | null
          conditions?: Json
          created_at?: string | null
          escalation_days?: number | null
          id?: string
          is_active?: boolean | null
          matrix_id: string
          notify_on_assignment?: boolean | null
          notify_on_escalation?: boolean | null
          reminder_days?: number[] | null
          rule_name: string
          rule_order: number
          skip_if_self?: boolean | null
        }
        Update: {
          approval_type?: string | null
          approvers?: Json
          auto_approve_if_no_match?: boolean | null
          conditions?: Json
          created_at?: string | null
          escalation_days?: number | null
          id?: string
          is_active?: boolean | null
          matrix_id?: string
          notify_on_assignment?: boolean | null
          notify_on_escalation?: boolean | null
          reminder_days?: number[] | null
          rule_name?: string
          rule_order?: number
          skip_if_self?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_matrix_rules_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "approval_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_routing_history: {
        Row: {
          approver_id: string | null
          approver_name: string | null
          approver_role: string | null
          approver_type: string
          created_at: string | null
          decision_at: string | null
          decision_by: string | null
          decision_comment: string | null
          due_date: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          escalated_from: string | null
          escalation_reason: string | null
          id: string
          matched_conditions: Json | null
          matrix_id: string | null
          matrix_name: string | null
          routed_at: string | null
          rule_id: string | null
          rule_name: string | null
          status: string
          step_number: number
        }
        Insert: {
          approver_id?: string | null
          approver_name?: string | null
          approver_role?: string | null
          approver_type: string
          created_at?: string | null
          decision_at?: string | null
          decision_by?: string | null
          decision_comment?: string | null
          due_date?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          escalated_from?: string | null
          escalation_reason?: string | null
          id?: string
          matched_conditions?: Json | null
          matrix_id?: string | null
          matrix_name?: string | null
          routed_at?: string | null
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          step_number: number
        }
        Update: {
          approver_id?: string | null
          approver_name?: string | null
          approver_role?: string | null
          approver_type?: string
          created_at?: string | null
          decision_at?: string | null
          decision_by?: string | null
          decision_comment?: string | null
          due_date?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          escalated_from?: string | null
          escalation_reason?: string | null
          id?: string
          matched_conditions?: Json | null
          matrix_id?: string | null
          matrix_name?: string | null
          routed_at?: string | null
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_routing_history_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_routing_history_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "approval_routing_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_routing_history_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "approval_matrices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_routing_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_matrix_rules"
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
      batch_upload_items: {
        Row: {
          batch_upload_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_code: string | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          item_index: number
          metadata: Json | null
          mime_type: string | null
          processed_at: string | null
          retry_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          batch_upload_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_code?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          item_index: number
          metadata?: Json | null
          mime_type?: string | null
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          batch_upload_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_code?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          item_index?: number
          metadata?: Json | null
          mime_type?: string | null
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_upload_items_batch_upload_id_fkey"
            columns: ["batch_upload_id"]
            isOneToOne: false
            referencedRelation: "batch_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_uploads: {
        Row: {
          completed_at: string | null
          created_at: string | null
          enterprise_id: string
          error_summary: string | null
          failed_items: number
          id: string
          metadata: Json | null
          processed_items: number
          settings: Json | null
          started_at: string | null
          status: string
          successful_items: number
          total_items: number
          upload_type: string
          uploaded_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          enterprise_id: string
          error_summary?: string | null
          failed_items?: number
          id?: string
          metadata?: Json | null
          processed_items?: number
          settings?: Json | null
          started_at?: string | null
          status?: string
          successful_items?: number
          total_items?: number
          upload_type: string
          uploaded_by: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          enterprise_id?: string
          error_summary?: string | null
          failed_items?: number
          id?: string
          metadata?: Json | null
          processed_items?: number
          settings?: Json | null
          started_at?: string | null
          status?: string
          successful_items?: number
          total_items?: number
          upload_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_uploads_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string | null
          data: Json
          enterprise_id: string
          error: string | null
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          resource_id: string | null
          resource_type: string | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          enterprise_id: string
          error?: string | null
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          enterprise_id?: string
          error?: string | null
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
      ca_serial_sequences: {
        Row: {
          ca_id: string
          next_serial: number
          updated_at: string | null
        }
        Insert: {
          ca_id: string
          next_serial?: number
          updated_at?: string | null
        }
        Update: {
          ca_id?: string
          next_serial?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ca_serial_sequences_ca_id_fkey"
            columns: ["ca_id"]
            isOneToOne: true
            referencedRelation: "certificate_authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_invalidation_stats: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          hour_bucket: string
          id: string
          invalidation_count: number | null
          last_invalidation_at: string | null
          operation_type: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          hour_bucket: string
          id?: string
          invalidation_count?: number | null
          last_invalidation_at?: string | null
          operation_type: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          hour_bucket?: string
          id?: string
          invalidation_count?: number | null
          last_invalidation_at?: string | null
          operation_type?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cache_invalidation_stats_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_authorities: {
        Row: {
          certificate_pem: string
          created_at: string | null
          created_by: string | null
          crl_next_update: string | null
          crl_number: number | null
          crl_url: string | null
          description: string | null
          enterprise_id: string
          fingerprint_sha256: string
          id: string
          is_root: boolean | null
          key_algorithm: string
          key_usage: string[] | null
          name: string
          ocsp_url: string | null
          parent_ca_id: string | null
          path_length_constraint: number | null
          private_key_encrypted: string
          public_key_pem: string
          revocation_reason: string | null
          revoked_at: string | null
          serial_number: number
          status: string
          subject_dn: Json
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          certificate_pem: string
          created_at?: string | null
          created_by?: string | null
          crl_next_update?: string | null
          crl_number?: number | null
          crl_url?: string | null
          description?: string | null
          enterprise_id: string
          fingerprint_sha256: string
          id?: string
          is_root?: boolean | null
          key_algorithm?: string
          key_usage?: string[] | null
          name: string
          ocsp_url?: string | null
          parent_ca_id?: string | null
          path_length_constraint?: number | null
          private_key_encrypted: string
          public_key_pem: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number: number
          status?: string
          subject_dn: Json
          updated_at?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          certificate_pem?: string
          created_at?: string | null
          created_by?: string | null
          crl_next_update?: string | null
          crl_number?: number | null
          crl_url?: string | null
          description?: string | null
          enterprise_id?: string
          fingerprint_sha256?: string
          id?: string
          is_root?: boolean | null
          key_algorithm?: string
          key_usage?: string[] | null
          name?: string
          ocsp_url?: string | null
          parent_ca_id?: string | null
          path_length_constraint?: number | null
          private_key_encrypted?: string
          public_key_pem?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number?: number
          status?: string
          subject_dn?: Json
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_authorities_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_authorities_parent_ca_id_fkey"
            columns: ["parent_ca_id"]
            isOneToOne: false
            referencedRelation: "certificate_authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_revocations: {
        Row: {
          ca_id: string
          certificate_id: string | null
          created_at: string | null
          created_by: string | null
          crl_entry_extensions: Json | null
          id: string
          included_in_crl_number: number | null
          invalidity_date: string | null
          reason: string
          revocation_date: string
          serial_number: number
        }
        Insert: {
          ca_id: string
          certificate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          crl_entry_extensions?: Json | null
          id?: string
          included_in_crl_number?: number | null
          invalidity_date?: string | null
          reason?: string
          revocation_date?: string
          serial_number: number
        }
        Update: {
          ca_id?: string
          certificate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          crl_entry_extensions?: Json | null
          id?: string
          included_in_crl_number?: number | null
          invalidity_date?: string | null
          reason?: string
          revocation_date?: string
          serial_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_revocations_ca_id_fkey"
            columns: ["ca_id"]
            isOneToOne: false
            referencedRelation: "certificate_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_revocations_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          ca_id: string
          certificate_pem: string
          created_at: string | null
          created_by: string | null
          email: string
          enterprise_id: string
          extended_key_usage: string[] | null
          fingerprint_sha256: string
          id: string
          key_usage: string[] | null
          last_used_at: string | null
          policy_oids: string[] | null
          public_key_pem: string
          revocation_reason: string | null
          revoked_at: string | null
          serial_number: number
          signature_count: number | null
          status: string
          subject_dn: Json
          updated_at: string | null
          user_id: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          ca_id: string
          certificate_pem: string
          created_at?: string | null
          created_by?: string | null
          email: string
          enterprise_id: string
          extended_key_usage?: string[] | null
          fingerprint_sha256: string
          id?: string
          key_usage?: string[] | null
          last_used_at?: string | null
          policy_oids?: string[] | null
          public_key_pem: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number: number
          signature_count?: number | null
          status?: string
          subject_dn: Json
          updated_at?: string | null
          user_id?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          ca_id?: string
          certificate_pem?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          enterprise_id?: string
          extended_key_usage?: string[] | null
          fingerprint_sha256?: string
          id?: string
          key_usage?: string[] | null
          last_used_at?: string | null
          policy_oids?: string[] | null
          public_key_pem?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number?: number
          signature_count?: number | null
          status?: string
          subject_dn?: Json
          updated_at?: string | null
          user_id?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_ca_id_fkey"
            columns: ["ca_id"]
            isOneToOne: false
            referencedRelation: "certificate_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_renewals: {
        Row: {
          certification_id: string
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          new_certification_id: string | null
          notes: string | null
          previous_certification_id: string | null
          renewal_number: number
          started_at: string | null
          status: string | null
        }
        Insert: {
          certification_id: string
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          new_certification_id?: string | null
          notes?: string | null
          previous_certification_id?: string | null
          renewal_number: number
          started_at?: string | null
          status?: string | null
        }
        Update: {
          certification_id?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          new_certification_id?: string | null
          notes?: string | null
          previous_certification_id?: string | null
          renewal_number?: number
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_renewals_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "compliance_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_renewals_new_certification_id_fkey"
            columns: ["new_certification_id"]
            isOneToOne: false
            referencedRelation: "compliance_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_renewals_previous_certification_id_fkey"
            columns: ["previous_certification_id"]
            isOneToOne: false
            referencedRelation: "compliance_certifications"
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
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      clause_alternatives: {
        Row: {
          clause_id: string
          content: string
          content_html: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          position_label: string
          position_order: number
          requires_approval: boolean | null
          risk_delta: number | null
        }
        Insert: {
          clause_id: string
          content: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          position_label: string
          position_order: number
          requires_approval?: boolean | null
          risk_delta?: number | null
        }
        Update: {
          clause_id?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          position_label?: string
          position_order?: number
          requires_approval?: boolean | null
          risk_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_alternatives_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clause_library"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_categories: {
        Row: {
          created_at: string | null
          description: string | null
          enterprise_id: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_categories_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "clause_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_compatibility_matrix: {
        Row: {
          clause_id: string
          compatibility_score: number
          compatible_with_clause_id: string
          created_at: string | null
          enterprise_id: string
          id: string
          notes: string | null
        }
        Insert: {
          clause_id: string
          compatibility_score: number
          compatible_with_clause_id: string
          created_at?: string | null
          enterprise_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          clause_id?: string
          compatibility_score?: number
          compatible_with_clause_id?: string
          created_at?: string | null
          enterprise_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_compatibility_matrix_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clause_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_compatibility_matrix_compatible_with_clause_id_fkey"
            columns: ["compatible_with_clause_id"]
            isOneToOne: false
            referencedRelation: "clause_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_compatibility_matrix_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_conflict_rules: {
        Row: {
          category_a_id: string | null
          category_b_id: string | null
          clause_a_id: string | null
          clause_b_id: string | null
          conflict_type: string
          created_at: string | null
          created_by: string | null
          description: string
          enterprise_id: string
          id: string
          is_active: boolean | null
          precedence: string | null
          resolution_guidance: string | null
          risk_impact: number | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          category_a_id?: string | null
          category_b_id?: string | null
          clause_a_id?: string | null
          clause_b_id?: string | null
          conflict_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          precedence?: string | null
          resolution_guidance?: string | null
          risk_impact?: number | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          category_a_id?: string | null
          category_b_id?: string | null
          clause_a_id?: string | null
          clause_b_id?: string | null
          conflict_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          precedence?: string | null
          resolution_guidance?: string | null
          risk_impact?: number | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_conflict_rules_category_a_id_fkey"
            columns: ["category_a_id"]
            isOneToOne: false
            referencedRelation: "conflict_clause_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_conflict_rules_category_b_id_fkey"
            columns: ["category_b_id"]
            isOneToOne: false
            referencedRelation: "conflict_clause_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_conflict_rules_clause_a_id_fkey"
            columns: ["clause_a_id"]
            isOneToOne: false
            referencedRelation: "clause_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_conflict_rules_clause_b_id_fkey"
            columns: ["clause_b_id"]
            isOneToOne: false
            referencedRelation: "clause_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_conflict_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_definitions: {
        Row: {
          base_risk_score: number | null
          canonical_text: string | null
          category_id: string
          clause_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          detection_patterns: string[] | null
          enterprise_id: string
          fallback_positions: string[] | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          must_have: boolean | null
          name: string
          negotiation_notes: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          base_risk_score?: number | null
          canonical_text?: string | null
          category_id: string
          clause_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          detection_patterns?: string[] | null
          enterprise_id: string
          fallback_positions?: string[] | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          must_have?: boolean | null
          name: string
          negotiation_notes?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          base_risk_score?: number | null
          canonical_text?: string | null
          category_id?: string
          clause_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          detection_patterns?: string[] | null
          enterprise_id?: string
          fallback_positions?: string[] | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          must_have?: boolean | null
          name?: string
          negotiation_notes?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "conflict_clause_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_definitions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_library: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          clause_type: string
          content: string
          content_html: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          enterprise_id: string
          expiration_date: string | null
          id: string
          is_standard: boolean | null
          jurisdictions: string[] | null
          languages: string[] | null
          metadata: Json | null
          requires_approval_if_modified: boolean | null
          risk_level: string
          search_vector: unknown | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          clause_type: string
          content: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          enterprise_id: string
          expiration_date?: string | null
          id?: string
          is_standard?: boolean | null
          jurisdictions?: string[] | null
          languages?: string[] | null
          metadata?: Json | null
          requires_approval_if_modified?: boolean | null
          risk_level?: string
          search_vector?: unknown | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          clause_type?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          enterprise_id?: string
          expiration_date?: string | null
          id?: string
          is_standard?: boolean | null
          jurisdictions?: string[] | null
          languages?: string[] | null
          metadata?: Json | null
          requires_approval_if_modified?: boolean | null
          risk_level?: string
          search_vector?: unknown | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_library_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "clause_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_library_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_versions: {
        Row: {
          change_summary: string | null
          change_type: string | null
          clause_id: string
          content: string
          content_html: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_current: boolean | null
          variables: Json | null
          version_label: string | null
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          change_type?: string | null
          clause_id: string
          content: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_current?: boolean | null
          variables?: Json | null
          version_label?: string | null
          version_number: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string | null
          clause_id?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_current?: boolean | null
          variables?: Json | null
          version_label?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "clause_versions_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clause_library"
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
      collaborative_sessions: {
        Row: {
          active_user_ids: string[] | null
          allow_external_participants: boolean | null
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          document_version_id: string
          enterprise_id: string
          external_participant_emails: string[] | null
          id: string
          initial_content: string | null
          initial_content_type: string | null
          last_snapshot_at: string | null
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          max_participants: number | null
          metadata: Json | null
          operation_count: number | null
          redline_session_id: string | null
          session_name: string | null
          session_type: string
          settings: Json | null
          status: string
          updated_at: string | null
          version_number: number | null
          yjs_client_ids: number[] | null
          yjs_state: string | null
          yjs_state_vector: string | null
        }
        Insert: {
          active_user_ids?: string[] | null
          allow_external_participants?: boolean | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_version_id: string
          enterprise_id: string
          external_participant_emails?: string[] | null
          id?: string
          initial_content?: string | null
          initial_content_type?: string | null
          last_snapshot_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_participants?: number | null
          metadata?: Json | null
          operation_count?: number | null
          redline_session_id?: string | null
          session_name?: string | null
          session_type?: string
          settings?: Json | null
          status?: string
          updated_at?: string | null
          version_number?: number | null
          yjs_client_ids?: number[] | null
          yjs_state?: string | null
          yjs_state_vector?: string | null
        }
        Update: {
          active_user_ids?: string[] | null
          allow_external_participants?: boolean | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_version_id?: string
          enterprise_id?: string
          external_participant_emails?: string[] | null
          id?: string
          initial_content?: string | null
          initial_content_type?: string | null
          last_snapshot_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_participants?: number | null
          metadata?: Json | null
          operation_count?: number | null
          redline_session_id?: string | null
          session_name?: string | null
          session_type?: string
          settings?: Json | null
          status?: string
          updated_at?: string | null
          version_number?: number | null
          yjs_client_ids?: number[] | null
          yjs_state?: string | null
          yjs_state_vector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_redline_session_id_fkey"
            columns: ["redline_session_id"]
            isOneToOne: false
            referencedRelation: "redline_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_suggestions: {
        Row: {
          comment_count: number | null
          comment_thread_id: string | null
          created_at: string | null
          end_position: number | null
          format_changes: Json | null
          id: string
          original_content: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          session_id: string
          start_position: number
          status: string
          suggested_by_external: string | null
          suggested_by_user_id: string | null
          suggested_content: string | null
          suggestion_type: string
        }
        Insert: {
          comment_count?: number | null
          comment_thread_id?: string | null
          created_at?: string | null
          end_position?: number | null
          format_changes?: Json | null
          id?: string
          original_content?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          session_id: string
          start_position: number
          status?: string
          suggested_by_external?: string | null
          suggested_by_user_id?: string | null
          suggested_content?: string | null
          suggestion_type: string
        }
        Update: {
          comment_count?: number | null
          comment_thread_id?: string | null
          created_at?: string | null
          end_position?: number | null
          format_changes?: Json | null
          id?: string
          original_content?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          session_id?: string
          start_position?: number
          status?: string
          suggested_by_external?: string | null
          suggested_by_user_id?: string | null
          suggested_content?: string | null
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body_template: string
          communication_type: string
          created_at: string | null
          created_by: string | null
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string
          subject_template: string
          tone: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_template: string
          communication_type: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name: string
          subject_template: string
          tone?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_template?: string
          communication_type?: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string
          subject_template?: string
          tone?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_log: {
        Row: {
          certification_id: string | null
          check_id: string | null
          contract_id: string | null
          created_at: string | null
          enterprise_id: string
          event_data: Json | null
          event_description: string
          event_type: string
          id: string
          ip_address: string | null
          issue_id: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          certification_id?: string | null
          check_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          enterprise_id: string
          event_data?: Json | null
          event_description: string
          event_type: string
          id?: string
          ip_address?: string | null
          issue_id?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          certification_id?: string | null
          check_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          enterprise_id?: string
          event_data?: Json | null
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          issue_id?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_log_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "compliance_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "contract_compliance_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_audit_log_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "compliance_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_certifications: {
        Row: {
          approval_chain: Json | null
          approved_by: string | null
          audit_trail: Json | null
          certification_type: string
          certified_at: string
          certified_by: string
          conditions: string[] | null
          contract_id: string
          created_at: string | null
          enterprise_id: string
          exemptions: string[] | null
          framework_id: string
          id: string
          notes: string | null
          renewal_reminder_days: number | null
          status: string | null
          supporting_documents: Json | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          approval_chain?: Json | null
          approved_by?: string | null
          audit_trail?: Json | null
          certification_type: string
          certified_at?: string
          certified_by: string
          conditions?: string[] | null
          contract_id: string
          created_at?: string | null
          enterprise_id: string
          exemptions?: string[] | null
          framework_id: string
          id?: string
          notes?: string | null
          renewal_reminder_days?: number | null
          status?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          approval_chain?: Json | null
          approved_by?: string | null
          audit_trail?: Json | null
          certification_type?: string
          certified_at?: string
          certified_by?: string
          conditions?: string[] | null
          contract_id?: string
          created_at?: string | null
          enterprise_id?: string
          exemptions?: string[] | null
          framework_id?: string
          id?: string
          notes?: string | null
          renewal_reminder_days?: number | null
          status?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_certifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certifications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certifications_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_check_results: {
        Row: {
          action_taken: string | null
          check_id: string
          created_at: string | null
          details: Json | null
          id: string
          message: string | null
          remediation_applied: boolean | null
          remediation_details: Json | null
          result: string
          rule_id: string
          severity: string
        }
        Insert: {
          action_taken?: string | null
          check_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          remediation_applied?: boolean | null
          remediation_details?: Json | null
          result: string
          rule_id: string
          severity: string
        }
        Update: {
          action_taken?: string | null
          check_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          remediation_applied?: boolean | null
          remediation_details?: Json | null
          result?: string
          rule_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_check_results_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "contract_compliance_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_check_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_type: string
          contract_id: string | null
          created_at: string | null
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
            foreignKeyName: "compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "compliance_checks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      compliance_evidence: {
        Row: {
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          enterprise_id: string
          evidence_type: string | null
          expiration_date: string | null
          file_name: string | null
          id: string
          issue_date: string | null
          metadata: Json | null
          notes: string | null
          rejection_reason: string | null
          requirement_id: string | null
          status: string | null
          storage_path: string | null
          updated_at: string | null
          vendor_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          enterprise_id: string
          evidence_type?: string | null
          expiration_date?: string | null
          file_name?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          notes?: string | null
          rejection_reason?: string | null
          requirement_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          enterprise_id?: string
          evidence_type?: string | null
          expiration_date?: string | null
          file_name?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          notes?: string | null
          rejection_reason?: string | null
          requirement_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "compliance_evidence_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "compliance_evidence_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_intelligence: {
        Row: {
          ai_confidence_score: number | null
          auto_remediation_enabled: boolean | null
          compliance_status: string | null
          created_at: string | null
          enterprise_id: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          evidence_documents: Json | null
          gaps_identified: Json | null
          human_reviewed: boolean | null
          id: string
          last_assessment: string | null
          next_review_due: string | null
          notifications_sent: number | null
          regulation_framework: string | null
          remediation_suggestions: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_factors: Json | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          auto_remediation_enabled?: boolean | null
          compliance_status?: string | null
          created_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          evidence_documents?: Json | null
          gaps_identified?: Json | null
          human_reviewed?: boolean | null
          id?: string
          last_assessment?: string | null
          next_review_due?: string | null
          notifications_sent?: number | null
          regulation_framework?: string | null
          remediation_suggestions?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          auto_remediation_enabled?: boolean | null
          compliance_status?: string | null
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          evidence_documents?: Json | null
          gaps_identified?: Json | null
          human_reviewed?: boolean | null
          id?: string
          last_assessment?: string | null
          next_review_due?: string | null
          notifications_sent?: number | null
          regulation_framework?: string | null
          remediation_suggestions?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_intelligence_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_intelligence_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_issue_comments: {
        Row: {
          comment_text: string
          comment_type: string | null
          created_at: string | null
          created_by: string
          id: string
          issue_id: string
        }
        Insert: {
          comment_text: string
          comment_type?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          issue_id: string
        }
        Update: {
          comment_text?: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "compliance_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_issues: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          category: string
          check_id: string | null
          check_result_id: string | null
          contract_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          enterprise_id: string
          framework_code: string | null
          id: string
          location_details: Json | null
          requirement_id: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string | null
          title: string
          updated_at: string | null
          waiver_approved_by: string | null
          waiver_expires_at: string | null
          waiver_reason: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          category: string
          check_id?: string | null
          check_result_id?: string | null
          contract_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          enterprise_id: string
          framework_code?: string | null
          id?: string
          location_details?: Json | null
          requirement_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity: string
          status?: string | null
          title: string
          updated_at?: string | null
          waiver_approved_by?: string | null
          waiver_expires_at?: string | null
          waiver_reason?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string
          check_id?: string | null
          check_result_id?: string | null
          contract_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          enterprise_id?: string
          framework_code?: string | null
          id?: string
          location_details?: Json | null
          requirement_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          waiver_approved_by?: string | null
          waiver_expires_at?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_issues_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "contract_compliance_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_check_result_id_fkey"
            columns: ["check_result_id"]
            isOneToOne: false
            referencedRelation: "compliance_check_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "framework_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          applies_to: string
          contract_category: string | null
          created_at: string | null
          description: string | null
          enterprise_id: string | null
          evidence_required: Json | null
          frequency: string | null
          id: string
          industry: string | null
          is_mandatory: boolean | null
          reference_url: string | null
          regulatory_body: string | null
          requirement_code: string | null
          requirement_name: string
          requirement_type: string
          updated_at: string | null
          vendor_category: string | null
        }
        Insert: {
          applies_to: string
          contract_category?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          evidence_required?: Json | null
          frequency?: string | null
          id?: string
          industry?: string | null
          is_mandatory?: boolean | null
          reference_url?: string | null
          regulatory_body?: string | null
          requirement_code?: string | null
          requirement_name: string
          requirement_type: string
          updated_at?: string | null
          vendor_category?: string | null
        }
        Update: {
          applies_to?: string
          contract_category?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          evidence_required?: Json | null
          frequency?: string | null
          id?: string
          industry?: string | null
          is_mandatory?: boolean | null
          reference_url?: string | null
          regulatory_body?: string | null
          requirement_code?: string | null
          requirement_name?: string
          requirement_type?: string
          updated_at?: string | null
          vendor_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rule_group_members: {
        Row: {
          created_at: string | null
          execution_order: number | null
          group_id: string
          id: string
          rule_id: string
        }
        Insert: {
          created_at?: string | null
          execution_order?: number | null
          group_id: string
          id?: string
          rule_id: string
        }
        Update: {
          created_at?: string | null
          execution_order?: number | null
          group_id?: string
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rule_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "compliance_rule_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_rule_group_members_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rule_groups: {
        Row: {
          created_at: string | null
          description: string | null
          enterprise_id: string
          execution_order: number | null
          id: string
          is_active: boolean | null
          name: string
          stop_on_failure: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          stop_on_failure?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          stop_on_failure?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rule_groups_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          applies_when: Json | null
          auto_remediation: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_until: string | null
          enterprise_id: string
          failure_action: string | null
          id: string
          is_active: boolean | null
          name: string
          notify_roles: string[] | null
          notify_users: string[] | null
          remediation_instructions: string | null
          requirement_id: string | null
          rule_code: string
          rule_definition: Json
          rule_type: string
          severity: string
          updated_at: string | null
        }
        Insert: {
          applies_when?: Json | null
          auto_remediation?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          enterprise_id: string
          failure_action?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notify_roles?: string[] | null
          notify_users?: string[] | null
          remediation_instructions?: string | null
          requirement_id?: string | null
          rule_code: string
          rule_definition: Json
          rule_type: string
          severity: string
          updated_at?: string | null
        }
        Update: {
          applies_when?: Json | null
          auto_remediation?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          enterprise_id?: string
          failure_action?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notify_roles?: string[] | null
          notify_users?: string[] | null
          remediation_instructions?: string | null
          requirement_id?: string | null
          rule_code?: string
          rule_definition?: Json
          rule_type?: string
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_rules_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "framework_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      conflict_clause_categories: {
        Row: {
          category_type: string
          created_at: string | null
          default_risk_weight: number | null
          description: string | null
          enterprise_id: string
          id: string
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_type: string
          created_at?: string | null
          default_risk_weight?: number | null
          description?: string | null
          enterprise_id: string
          id?: string
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_type?: string
          created_at?: string | null
          default_risk_weight?: number | null
          description?: string | null
          enterprise_id?: string
          id?: string
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conflict_clause_categories_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflict_clause_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "conflict_clause_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conflict_resolution_history: {
        Row: {
          action_taken: string | null
          conflict_id: string
          id: string
          new_status: string
          notes: string | null
          performed_at: string | null
          performed_by: string
          previous_status: string
        }
        Insert: {
          action_taken?: string | null
          conflict_id: string
          id?: string
          new_status: string
          notes?: string | null
          performed_at?: string | null
          performed_by: string
          previous_status: string
        }
        Update: {
          action_taken?: string | null
          conflict_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflict_resolution_history_conflict_id_fkey"
            columns: ["conflict_id"]
            isOneToOne: false
            referencedRelation: "detected_clause_conflicts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_analyses: {
        Row: {
          analysis_results: Json
          analysis_type: string | null
          compliance_score: number | null
          confidence_level: string | null
          contract_id: string | null
          contract_text: string
          created_at: string | null
          created_by: string | null
          enterprise_id: string
          id: string
          key_findings: Json | null
          metadata: Json | null
          model_provider: string | null
          model_version: string | null
          processing_time_ms: number | null
          recommendations: Json | null
          regulations_checked: string[] | null
          risk_score: number | null
          updated_at: string | null
        }
        Insert: {
          analysis_results?: Json
          analysis_type?: string | null
          compliance_score?: number | null
          confidence_level?: string | null
          contract_id?: string | null
          contract_text: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id: string
          id?: string
          key_findings?: Json | null
          metadata?: Json | null
          model_provider?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          regulations_checked?: string[] | null
          risk_score?: number | null
          updated_at?: string | null
        }
        Update: {
          analysis_results?: Json
          analysis_type?: string | null
          compliance_score?: number | null
          confidence_level?: string | null
          contract_id?: string | null
          contract_text?: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string
          id?: string
          key_findings?: Json | null
          metadata?: Json | null
          model_provider?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          regulations_checked?: string[] | null
          risk_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_analyses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_analyses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_analyses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_analyses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_analyses_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
            foreignKeyName: "contract_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
          enterprise_id: string
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
          enterprise_id: string
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
          enterprise_id?: string
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
            foreignKeyName: "contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assignments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
            foreignKeyName: "contract_budget_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_budget_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
            foreignKeyName: "contract_clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
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
      contract_compliance_checks: {
        Row: {
          blocking_issues_count: number | null
          check_type: string
          check_version: number | null
          compliance_score: number | null
          contract_id: string
          created_at: string | null
          document_version_id: string | null
          enterprise_id: string
          framework_results: Json | null
          has_critical_failures: boolean | null
          id: string
          overall_status: string
          requires_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rules_failed: number | null
          rules_passed: number | null
          rules_skipped: number | null
          rules_warned: number | null
          status: string | null
          total_rules_checked: number | null
          triggered_by: string | null
        }
        Insert: {
          blocking_issues_count?: number | null
          check_type: string
          check_version?: number | null
          compliance_score?: number | null
          contract_id: string
          created_at?: string | null
          document_version_id?: string | null
          enterprise_id: string
          framework_results?: Json | null
          has_critical_failures?: boolean | null
          id?: string
          overall_status: string
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rules_failed?: number | null
          rules_passed?: number | null
          rules_skipped?: number | null
          rules_warned?: number | null
          status?: string | null
          total_rules_checked?: number | null
          triggered_by?: string | null
        }
        Update: {
          blocking_issues_count?: number | null
          check_type?: string
          check_version?: number | null
          compliance_score?: number | null
          contract_id?: string
          created_at?: string | null
          document_version_id?: string | null
          enterprise_id?: string
          framework_results?: Json | null
          has_critical_failures?: boolean | null
          id?: string
          overall_status?: string
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rules_failed?: number | null
          rules_passed?: number | null
          rules_skipped?: number | null
          rules_warned?: number | null
          status?: string | null
          total_rules_checked?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_checks_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_checks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_extractions: {
        Row: {
          contract_id: string
          created_at: string | null
          extracted_address: string | null
          extracted_end_date: string | null
          extracted_key_terms: Json | null
          extracted_parties: Json | null
          extracted_payment_schedule: Json | null
          extracted_pricing: Json | null
          extracted_scope: string | null
          extracted_start_date: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          extracted_address?: string | null
          extracted_end_date?: string | null
          extracted_key_terms?: Json | null
          extracted_parties?: Json | null
          extracted_payment_schedule?: Json | null
          extracted_pricing?: Json | null
          extracted_scope?: string | null
          extracted_start_date?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          extracted_address?: string | null
          extracted_end_date?: string | null
          extracted_key_terms?: Json | null
          extracted_parties?: Json | null
          extracted_payment_schedule?: Json | null
          extracted_pricing?: Json | null
          extracted_scope?: string | null
          extracted_start_date?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_extractions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_intake_forms: {
        Row: {
          allow_draft_save: boolean | null
          allow_resubmission: boolean | null
          attachment_types: string[] | null
          auto_assign_rules: Json | null
          auto_create_contract: boolean | null
          avg_completion_time_minutes: number | null
          conditional_logic: Json | null
          created_at: string | null
          created_by: string | null
          default_workflow_id: string | null
          description: string | null
          enterprise_id: string
          form_code: string
          form_schema: Json
          id: string
          max_attachments: number | null
          name: string
          published_at: string | null
          requires_approval: boolean | null
          requires_attachments: boolean | null
          status: string
          submission_count: number | null
          target_contract_type: string | null
          target_template_id: string | null
          ui_schema: Json | null
          updated_at: string | null
          updated_by: string | null
          validation_rules: Json | null
          version: number | null
        }
        Insert: {
          allow_draft_save?: boolean | null
          allow_resubmission?: boolean | null
          attachment_types?: string[] | null
          auto_assign_rules?: Json | null
          auto_create_contract?: boolean | null
          avg_completion_time_minutes?: number | null
          conditional_logic?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_workflow_id?: string | null
          description?: string | null
          enterprise_id: string
          form_code: string
          form_schema?: Json
          id?: string
          max_attachments?: number | null
          name: string
          published_at?: string | null
          requires_approval?: boolean | null
          requires_attachments?: boolean | null
          status?: string
          submission_count?: number | null
          target_contract_type?: string | null
          target_template_id?: string | null
          ui_schema?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          validation_rules?: Json | null
          version?: number | null
        }
        Update: {
          allow_draft_save?: boolean | null
          allow_resubmission?: boolean | null
          attachment_types?: string[] | null
          auto_assign_rules?: Json | null
          auto_create_contract?: boolean | null
          avg_completion_time_minutes?: number | null
          conditional_logic?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_workflow_id?: string | null
          description?: string | null
          enterprise_id?: string
          form_code?: string
          form_schema?: Json
          id?: string
          max_attachments?: number | null
          name?: string
          published_at?: string | null
          requires_approval?: boolean | null
          requires_attachments?: boolean | null
          status?: string
          submission_count?: number | null
          target_contract_type?: string | null
          target_template_id?: string | null
          ui_schema?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          validation_rules?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_intake_forms_default_workflow_id_fkey"
            columns: ["default_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_intake_forms_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_intake_forms_target_template_id_fkey"
            columns: ["target_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_lifecycle_events: {
        Row: {
          contract_id: string
          created_at: string | null
          enterprise_id: string
          event_at: string | null
          event_source: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          new_value: number | null
          notes: string | null
          previous_status: string | null
          previous_value: number | null
          triggered_by_agent: string | null
          triggered_by_user_id: string | null
          value_delta: number | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          enterprise_id: string
          event_at?: string | null
          event_source?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          new_value?: number | null
          notes?: string | null
          previous_status?: string | null
          previous_value?: number | null
          triggered_by_agent?: string | null
          triggered_by_user_id?: string | null
          value_delta?: number | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          enterprise_id?: string
          event_at?: string | null
          event_source?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          new_value?: number | null
          notes?: string | null
          previous_status?: string | null
          previous_value?: number | null
          triggered_by_agent?: string | null
          triggered_by_user_id?: string | null
          value_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_lifecycle_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_lifecycle_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_lifecycle_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_lifecycle_events_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_line_items: {
        Row: {
          category: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          discount_amount: number | null
          discount_pct: number | null
          discount_reason: string | null
          end_date: string | null
          enterprise_id: string
          extraction_confidence: number | null
          extraction_metadata: Json | null
          extraction_source: string | null
          hts_code: string | null
          hts_confidence: number | null
          hts_description: string | null
          hts_match_method: string | null
          id: string
          is_optional: boolean | null
          is_recurring: boolean | null
          is_usmca_qualifying: boolean | null
          item_description: string | null
          item_name: string
          last_modified_by: string | null
          line_number: number
          origin_country: string | null
          origin_country_name: string | null
          page_number: number | null
          pricing_frequency: string | null
          pricing_model: string | null
          pricing_tiers: Json | null
          quantity: number
          raw_text: string | null
          sku: string | null
          start_date: string | null
          tariff_breakdown: Json | null
          tariff_calculated_at: string | null
          tariff_cost: number | null
          tariff_effective_date: string | null
          tariff_rate: number | null
          taxonomy_code: string | null
          taxonomy_confidence: number | null
          taxonomy_match_method: string | null
          total_price: number | null
          unit: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          discount_reason?: string | null
          end_date?: string | null
          enterprise_id: string
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          extraction_source?: string | null
          hts_code?: string | null
          hts_confidence?: number | null
          hts_description?: string | null
          hts_match_method?: string | null
          id?: string
          is_optional?: boolean | null
          is_recurring?: boolean | null
          is_usmca_qualifying?: boolean | null
          item_description?: string | null
          item_name: string
          last_modified_by?: string | null
          line_number: number
          origin_country?: string | null
          origin_country_name?: string | null
          page_number?: number | null
          pricing_frequency?: string | null
          pricing_model?: string | null
          pricing_tiers?: Json | null
          quantity?: number
          raw_text?: string | null
          sku?: string | null
          start_date?: string | null
          tariff_breakdown?: Json | null
          tariff_calculated_at?: string | null
          tariff_cost?: number | null
          tariff_effective_date?: string | null
          tariff_rate?: number | null
          taxonomy_code?: string | null
          taxonomy_confidence?: number | null
          taxonomy_match_method?: string | null
          total_price?: number | null
          unit?: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          discount_reason?: string | null
          end_date?: string | null
          enterprise_id?: string
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          extraction_source?: string | null
          hts_code?: string | null
          hts_confidence?: number | null
          hts_description?: string | null
          hts_match_method?: string | null
          id?: string
          is_optional?: boolean | null
          is_recurring?: boolean | null
          is_usmca_qualifying?: boolean | null
          item_description?: string | null
          item_name?: string
          last_modified_by?: string | null
          line_number?: number
          origin_country?: string | null
          origin_country_name?: string | null
          page_number?: number | null
          pricing_frequency?: string | null
          pricing_model?: string | null
          pricing_tiers?: Json | null
          quantity?: number
          raw_text?: string | null
          sku?: string | null
          start_date?: string | null
          tariff_breakdown?: Json | null
          tariff_calculated_at?: string | null
          tariff_cost?: number | null
          tariff_effective_date?: string | null
          tariff_rate?: number | null
          taxonomy_code?: string | null
          taxonomy_confidence?: number | null
          taxonomy_match_method?: string | null
          total_price?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      contract_obligations: {
        Row: {
          contract_id: string
          created_at: string | null
          created_by: string | null
          depends_on_obligation_id: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          enterprise_id: string
          escalation_days: number[] | null
          extracted_by: string | null
          extraction_confidence: number | null
          financial_impact: number | null
          frequency: string
          id: string
          metadata: Json | null
          next_due_date: string | null
          obligation_type: string
          party_responsible: string
          priority: string
          recurring_config: Json | null
          recurring_day: number | null
          reminder_days: number[] | null
          risk_if_missed: string | null
          risk_score: number | null
          source_page: number | null
          source_section: string | null
          source_text: string | null
          start_date: string | null
          status: string
          tags: string[] | null
          title: string
          triggers_obligation_id: string | null
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          depends_on_obligation_id?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          enterprise_id: string
          escalation_days?: number[] | null
          extracted_by?: string | null
          extraction_confidence?: number | null
          financial_impact?: number | null
          frequency: string
          id?: string
          metadata?: Json | null
          next_due_date?: string | null
          obligation_type: string
          party_responsible: string
          priority?: string
          recurring_config?: Json | null
          recurring_day?: number | null
          reminder_days?: number[] | null
          risk_if_missed?: string | null
          risk_score?: number | null
          source_page?: number | null
          source_section?: string | null
          source_text?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          triggers_obligation_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          depends_on_obligation_id?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          enterprise_id?: string
          escalation_days?: number[] | null
          extracted_by?: string | null
          extraction_confidence?: number | null
          financial_impact?: number | null
          frequency?: string
          id?: string
          metadata?: Json | null
          next_due_date?: string | null
          obligation_type?: string
          party_responsible?: string
          priority?: string
          recurring_config?: Json | null
          recurring_day?: number | null
          reminder_days?: number[] | null
          risk_if_missed?: string | null
          risk_score?: number | null
          source_page?: number | null
          source_section?: string | null
          source_text?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          triggers_obligation_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_depends_on_obligation_id_fkey"
            columns: ["depends_on_obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_triggers_obligation_id_fkey"
            columns: ["triggers_obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_risk_assessments: {
        Row: {
          ai_recommendations: Json | null
          ai_summary: string | null
          assessment_type: string
          assessment_version: number | null
          compliance_risk_score: number | null
          conflict_count: number | null
          conflict_risk_contribution: number | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          enterprise_id: string
          factor_scores: Json | null
          financial_risk_score: number | null
          id: string
          legal_risk_score: number | null
          operational_risk_score: number | null
          overall_risk_score: number
          requires_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          vendor_risk_score: number | null
        }
        Insert: {
          ai_recommendations?: Json | null
          ai_summary?: string | null
          assessment_type: string
          assessment_version?: number | null
          compliance_risk_score?: number | null
          conflict_count?: number | null
          conflict_risk_contribution?: number | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id: string
          factor_scores?: Json | null
          financial_risk_score?: number | null
          id?: string
          legal_risk_score?: number | null
          operational_risk_score?: number | null
          overall_risk_score: number
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_risk_score?: number | null
        }
        Update: {
          ai_recommendations?: Json | null
          ai_summary?: string | null
          assessment_type?: string
          assessment_version?: number | null
          compliance_risk_score?: number | null
          conflict_count?: number | null
          conflict_risk_contribution?: number | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string
          factor_scores?: Json | null
          financial_risk_score?: number | null
          id?: string
          legal_risk_score?: number | null
          operational_risk_score?: number | null
          overall_risk_score?: number
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_risk_assessments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_risk_assessments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_risk_assessments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_risk_assessments_enterprise_id_fkey"
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
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          allowed_contract_types: string[] | null
          approval_workflow_id: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          complexity_score: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string | null
          enterprise_id: string
          expiration_date: string | null
          footer_content: string | null
          footer_content_html: string | null
          governing_law: string | null
          header_content: string | null
          header_content_html: string | null
          id: string
          is_default: boolean | null
          jurisdictions: string[] | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          max_contract_value: number | null
          metadata: Json | null
          min_contract_value: number | null
          name: string
          regulatory_requirements: string[] | null
          requires_legal_review: boolean | null
          restricted_vendors: string[] | null
          risk_score: number | null
          search_vector: unknown | null
          signature_block_template: string | null
          slug: string
          status: string
          tags: string[] | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          allowed_contract_types?: string[] | null
          approval_workflow_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          complexity_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          enterprise_id: string
          expiration_date?: string | null
          footer_content?: string | null
          footer_content_html?: string | null
          governing_law?: string | null
          header_content?: string | null
          header_content_html?: string | null
          id?: string
          is_default?: boolean | null
          jurisdictions?: string[] | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          max_contract_value?: number | null
          metadata?: Json | null
          min_contract_value?: number | null
          name: string
          regulatory_requirements?: string[] | null
          requires_legal_review?: boolean | null
          restricted_vendors?: string[] | null
          risk_score?: number | null
          search_vector?: unknown | null
          signature_block_template?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          allowed_contract_types?: string[] | null
          approval_workflow_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          complexity_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          enterprise_id?: string
          expiration_date?: string | null
          footer_content?: string | null
          footer_content_html?: string | null
          governing_law?: string | null
          header_content?: string | null
          header_content_html?: string | null
          id?: string
          is_default?: boolean | null
          jurisdictions?: string[] | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          max_contract_value?: number | null
          metadata?: Json | null
          min_contract_value?: number | null
          name?: string
          regulatory_requirements?: string[] | null
          requires_legal_review?: boolean | null
          restricted_vendors?: string[] | null
          risk_score?: number | null
          search_vector?: unknown | null
          signature_block_template?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          analysis_error: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"] | null
          analyzed_at: string | null
          approval_status: string | null
          archived_at: string | null
          archived_by: string | null
          compliance_score: number | null
          contract_duration_days: number | null
          contract_type: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          deleted_at: string | null
          department_id: string | null
          effective_date: string | null
          end_date: string | null
          enterprise_id: string
          expiry_notification_sent_at: string | null
          file_name: string | null
          file_type: string | null
          id: string
          is_auto_renew: boolean | null
          last_modified_by: string | null
          last_renewal_date: string | null
          legal_address_id: string | null
          metadata: Json | null
          next_renewal_date: string | null
          notes: string | null
          notice_period_days: number | null
          owner_id: string | null
          parent_contract_id: string | null
          payment_terms: string | null
          renewal_notice_days: number | null
          renewal_notification_sent_at: string | null
          risk_score: number | null
          signed_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          storage_id: string | null
          tags: string[] | null
          tariff_by_country: Json | null
          tariff_last_calculated: string | null
          tariff_risk_level: string | null
          template_id: string | null
          title: string
          total_tariff_exposure: number | null
          updated_at: string | null
          value: number | null
          vendor_id: string
          version: number | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          analyzed_at?: string | null
          approval_status?: string | null
          archived_at?: string | null
          archived_by?: string | null
          compliance_score?: number | null
          contract_duration_days?: number | null
          contract_type?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          deleted_at?: string | null
          department_id?: string | null
          effective_date?: string | null
          end_date?: string | null
          enterprise_id: string
          expiry_notification_sent_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          is_auto_renew?: boolean | null
          last_modified_by?: string | null
          last_renewal_date?: string | null
          legal_address_id?: string | null
          metadata?: Json | null
          next_renewal_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          owner_id?: string | null
          parent_contract_id?: string | null
          payment_terms?: string | null
          renewal_notice_days?: number | null
          renewal_notification_sent_at?: string | null
          risk_score?: number | null
          signed_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          storage_id?: string | null
          tags?: string[] | null
          tariff_by_country?: Json | null
          tariff_last_calculated?: string | null
          tariff_risk_level?: string | null
          template_id?: string | null
          title: string
          total_tariff_exposure?: number | null
          updated_at?: string | null
          value?: number | null
          vendor_id: string
          version?: number | null
        }
        Update: {
          analysis_error?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          analyzed_at?: string | null
          approval_status?: string | null
          archived_at?: string | null
          archived_by?: string | null
          compliance_score?: number | null
          contract_duration_days?: number | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          deleted_at?: string | null
          department_id?: string | null
          effective_date?: string | null
          end_date?: string | null
          enterprise_id?: string
          expiry_notification_sent_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          is_auto_renew?: boolean | null
          last_modified_by?: string | null
          last_renewal_date?: string | null
          legal_address_id?: string | null
          metadata?: Json | null
          next_renewal_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          owner_id?: string | null
          parent_contract_id?: string | null
          payment_terms?: string | null
          renewal_notice_days?: number | null
          renewal_notification_sent_at?: string | null
          risk_score?: number | null
          signed_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          storage_id?: string | null
          tags?: string[] | null
          tariff_by_country?: Json | null
          tariff_last_calculated?: string | null
          tariff_risk_level?: string | null
          template_id?: string | null
          title?: string
          total_tariff_exposure?: number | null
          updated_at?: string | null
          value?: number | null
          vendor_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "contracts_legal_address_id_fkey"
            columns: ["legal_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
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
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      corporate_networks: {
        Row: {
          created_at: string
          enterprise_id: string
          id: string
          ip_range: unknown
          name: string
          trust_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enterprise_id: string
          id?: string
          ip_range: unknown
          name: string
          trust_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enterprise_id?: string
          id?: string
          ip_range?: unknown
          name?: string
          trust_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_networks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      country_tariff_rules: {
        Row: {
          base_additional_rate: number | null
          country_code: string
          country_name: string
          created_at: string | null
          effective_date: string | null
          expiration_date: string | null
          fta_name: string | null
          has_fta: boolean | null
          id: string
          ieepa_rate: number | null
          is_usmca_country: boolean | null
          non_usmca_rate: number | null
          notes: string | null
          reciprocal_rate: number | null
          updated_at: string | null
          usmca_rate: number | null
        }
        Insert: {
          base_additional_rate?: number | null
          country_code: string
          country_name: string
          created_at?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          fta_name?: string | null
          has_fta?: boolean | null
          id?: string
          ieepa_rate?: number | null
          is_usmca_country?: boolean | null
          non_usmca_rate?: number | null
          notes?: string | null
          reciprocal_rate?: number | null
          updated_at?: string | null
          usmca_rate?: number | null
        }
        Update: {
          base_additional_rate?: number | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          fta_name?: string | null
          has_fta?: boolean | null
          id?: string
          ieepa_rate?: number | null
          is_usmca_country?: boolean | null
          non_usmca_rate?: number | null
          notes?: string | null
          reciprocal_rate?: number | null
          updated_at?: string | null
          usmca_rate?: number | null
        }
        Relationships: []
      }
      cursor_color_palette: {
        Row: {
          color_hex: string
          color_name: string
          id: number
          sort_order: number
          text_color_hex: string
        }
        Insert: {
          color_hex: string
          color_name: string
          id?: number
          sort_order: number
          text_color_hex?: string
        }
        Update: {
          color_hex?: string
          color_name?: string
          id?: number
          sort_order?: number
          text_color_hex?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          enterprise_id: string
          id: string
          name: string
          parent_department_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          name: string
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          name?: string
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_clause_conflicts: {
        Row: {
          clause_a_location: Json | null
          clause_a_text: string
          clause_b_location: Json | null
          clause_b_text: string
          confidence_score: number | null
          conflict_rule_id: string | null
          conflict_type: string
          contract_id: string
          created_at: string | null
          detection_method: string
          document_version_id: string | null
          enterprise_id: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_impact: number | null
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          clause_a_location?: Json | null
          clause_a_text: string
          clause_b_location?: Json | null
          clause_b_text: string
          confidence_score?: number | null
          conflict_rule_id?: string | null
          conflict_type: string
          contract_id: string
          created_at?: string | null
          detection_method: string
          document_version_id?: string | null
          enterprise_id: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_impact?: number | null
          severity: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          clause_a_location?: Json | null
          clause_a_text?: string
          clause_b_location?: Json | null
          clause_b_text?: string
          confidence_score?: number | null
          conflict_rule_id?: string | null
          conflict_type?: string
          contract_id?: string
          created_at?: string | null
          detection_method?: string
          document_version_id?: string | null
          enterprise_id?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_impact?: number | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_clause_conflicts_conflict_rule_id_fkey"
            columns: ["conflict_rule_id"]
            isOneToOne: false
            referencedRelation: "clause_conflict_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_clause_conflicts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_clause_conflicts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_clause_conflicts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_clause_conflicts_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_clause_conflicts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_suppliers: {
        Row: {
          can_fulfill_quantity: boolean | null
          capabilities: Json | null
          categories: string[] | null
          country: string | null
          created_at: string
          discovered_at: string
          email: string | null
          estimated_lead_time_days: number | null
          estimated_price: number | null
          evaluated_at: string | null
          id: string
          match_score: number
          on_time_delivery_rate: number | null
          phone: string | null
          quality_rating: number | null
          risk_score: number
          source: string
          sourcing_request_id: string
          supplier_name: string
          total_score: number
          vendor_id: string | null
          website: string | null
        }
        Insert: {
          can_fulfill_quantity?: boolean | null
          capabilities?: Json | null
          categories?: string[] | null
          country?: string | null
          created_at?: string
          discovered_at?: string
          email?: string | null
          estimated_lead_time_days?: number | null
          estimated_price?: number | null
          evaluated_at?: string | null
          id?: string
          match_score: number
          on_time_delivery_rate?: number | null
          phone?: string | null
          quality_rating?: number | null
          risk_score: number
          source: string
          sourcing_request_id: string
          supplier_name: string
          total_score: number
          vendor_id?: string | null
          website?: string | null
        }
        Update: {
          can_fulfill_quantity?: boolean | null
          capabilities?: Json | null
          categories?: string[] | null
          country?: string | null
          created_at?: string
          discovered_at?: string
          email?: string | null
          estimated_lead_time_days?: number | null
          estimated_price?: number | null
          evaluated_at?: string | null
          id?: string
          match_score?: number
          on_time_delivery_rate?: number | null
          phone?: string | null
          quality_rating?: number | null
          risk_score?: number
          source?: string
          sourcing_request_id?: string
          supplier_name?: string
          total_score?: number
          vendor_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_suppliers_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "discovered_suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "discovered_suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_changes: {
        Row: {
          action: string | null
          action_at: string | null
          action_by: string | null
          category: string | null
          change_order: number
          change_type: string
          character_position: number | null
          comparison_id: string
          context_after: string | null
          context_before: string | null
          created_at: string | null
          flag_reason: string | null
          id: string
          is_flagged: boolean | null
          line_number: number | null
          metadata: Json | null
          modified_text: string | null
          original_text: string | null
          paragraph_number: number | null
          requires_review: boolean | null
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_id: string | null
          section_name: string | null
          severity: string | null
          word_position: number | null
        }
        Insert: {
          action?: string | null
          action_at?: string | null
          action_by?: string | null
          category?: string | null
          change_order: number
          change_type: string
          character_position?: number | null
          comparison_id: string
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          line_number?: number | null
          metadata?: Json | null
          modified_text?: string | null
          original_text?: string | null
          paragraph_number?: number | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string | null
          section_name?: string | null
          severity?: string | null
          word_position?: number | null
        }
        Update: {
          action?: string | null
          action_at?: string | null
          action_by?: string | null
          category?: string | null
          change_order?: number
          change_type?: string
          character_position?: number | null
          comparison_id?: string
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          line_number?: number | null
          metadata?: Json | null
          modified_text?: string | null
          original_text?: string | null
          paragraph_number?: number | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string | null
          section_name?: string | null
          severity?: string | null
          word_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_changes_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "document_comparisons"
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
      document_comparisons: {
        Row: {
          additions_count: number | null
          algorithm_used: string | null
          base_version_id: string
          characters_added: number | null
          characters_deleted: number | null
          compare_version_id: string
          comparison_status: string
          content_overlap_percentage: number | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          deletions_count: number | null
          diff_html: string | null
          diff_json: Json | null
          enterprise_id: string
          error_message: string | null
          flagged_changes: Json | null
          id: string
          modifications_count: number | null
          moves_count: number | null
          processing_time_ms: number | null
          risk_factors: Json | null
          risk_level: string | null
          side_by_side_html: string | null
          similarity_score: number | null
          total_changes: number | null
          words_added: number | null
          words_deleted: number | null
        }
        Insert: {
          additions_count?: number | null
          algorithm_used?: string | null
          base_version_id: string
          characters_added?: number | null
          characters_deleted?: number | null
          compare_version_id: string
          comparison_status?: string
          content_overlap_percentage?: number | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          deletions_count?: number | null
          diff_html?: string | null
          diff_json?: Json | null
          enterprise_id: string
          error_message?: string | null
          flagged_changes?: Json | null
          id?: string
          modifications_count?: number | null
          moves_count?: number | null
          processing_time_ms?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          side_by_side_html?: string | null
          similarity_score?: number | null
          total_changes?: number | null
          words_added?: number | null
          words_deleted?: number | null
        }
        Update: {
          additions_count?: number | null
          algorithm_used?: string | null
          base_version_id?: string
          characters_added?: number | null
          characters_deleted?: number | null
          compare_version_id?: string
          comparison_status?: string
          content_overlap_percentage?: number | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          deletions_count?: number | null
          diff_html?: string | null
          diff_json?: Json | null
          enterprise_id?: string
          error_message?: string | null
          flagged_changes?: Json | null
          id?: string
          modifications_count?: number | null
          moves_count?: number | null
          processing_time_ms?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          side_by_side_html?: string | null
          similarity_score?: number | null
          total_changes?: number | null
          words_added?: number | null
          words_deleted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_comparisons_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comparisons_compare_version_id_fkey"
            columns: ["compare_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comparisons_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comparisons_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comparisons_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comparisons_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      document_intelligence: {
        Row: {
          classification_results: Json | null
          confidence_scores: Json | null
          created_at: string | null
          created_by: string | null
          document_id: string
          document_name: string | null
          document_source: string | null
          document_type: string | null
          enterprise_id: string
          extracted_entities: Json | null
          file_size_bytes: number | null
          id: string
          key_information: Json | null
          language_detected: string | null
          ocr_applied: boolean | null
          ocr_confidence: number | null
          page_count: number | null
          processed_at: string | null
          processing_metadata: Json | null
          sentiment_analysis: Json | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          classification_results?: Json | null
          confidence_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          document_name?: string | null
          document_source?: string | null
          document_type?: string | null
          enterprise_id: string
          extracted_entities?: Json | null
          file_size_bytes?: number | null
          id?: string
          key_information?: Json | null
          language_detected?: string | null
          ocr_applied?: boolean | null
          ocr_confidence?: number | null
          page_count?: number | null
          processed_at?: string | null
          processing_metadata?: Json | null
          sentiment_analysis?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          classification_results?: Json | null
          confidence_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          document_name?: string | null
          document_source?: string | null
          document_type?: string | null
          enterprise_id?: string
          extracted_entities?: Json | null
          file_size_bytes?: number | null
          id?: string
          key_information?: Json | null
          language_detected?: string | null
          ocr_applied?: boolean | null
          ocr_confidence?: number | null
          page_count?: number | null
          processed_at?: string | null
          processing_metadata?: Json | null
          sentiment_analysis?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_intelligence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_intelligence_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      document_operations: {
        Row: {
          affected_range: Json | null
          batch_id: string | null
          batch_sequence: number | null
          change_summary: string | null
          client_id: string
          clock: number
          created_at: string | null
          external_party_email: string | null
          id: string
          operation_data: string
          operation_size: number
          operation_type: string
          origin: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          affected_range?: Json | null
          batch_id?: string | null
          batch_sequence?: number | null
          change_summary?: string | null
          client_id: string
          clock: number
          created_at?: string | null
          external_party_email?: string | null
          id?: string
          operation_data: string
          operation_size: number
          operation_type: string
          origin?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          affected_range?: Json | null
          batch_id?: string | null
          batch_sequence?: number | null
          change_summary?: string | null
          client_id?: string
          clock?: number
          created_at?: string | null
          external_party_email?: string | null
          id?: string
          operation_data?: string
          operation_size?: number
          operation_type?: string
          origin?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_queue: {
        Row: {
          auto_assigned_contract_id: string | null
          auto_assigned_vendor_id: string | null
          auto_assignment_confidence: number | null
          classification_completed_at: string | null
          classification_confidence: number | null
          classification_task_id: string | null
          completed_at: string | null
          created_at: string | null
          document_classification: Json | null
          enterprise_id: string
          error_details: Json | null
          error_message: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          max_retries: number | null
          ocr_completed_at: string | null
          ocr_confidence: number | null
          ocr_language: string | null
          ocr_task_id: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          requires_review: boolean | null
          retry_count: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_context: string | null
          status: string | null
          storage_bucket: string | null
          target_contract_id: string | null
          target_vendor_id: string | null
          updated_at: string | null
          user_id: string
          vendor_match_completed_at: string | null
          vendor_match_confidence: number | null
          vendor_match_result: Json | null
          vendor_match_task_id: string | null
        }
        Insert: {
          auto_assigned_contract_id?: string | null
          auto_assigned_vendor_id?: string | null
          auto_assignment_confidence?: number | null
          classification_completed_at?: string | null
          classification_confidence?: number | null
          classification_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_classification?: Json | null
          enterprise_id: string
          error_details?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          max_retries?: number | null
          ocr_completed_at?: string | null
          ocr_confidence?: number | null
          ocr_language?: string | null
          ocr_task_id?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          requires_review?: boolean | null
          retry_count?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_context?: string | null
          status?: string | null
          storage_bucket?: string | null
          target_contract_id?: string | null
          target_vendor_id?: string | null
          updated_at?: string | null
          user_id: string
          vendor_match_completed_at?: string | null
          vendor_match_confidence?: number | null
          vendor_match_result?: Json | null
          vendor_match_task_id?: string | null
        }
        Update: {
          auto_assigned_contract_id?: string | null
          auto_assigned_vendor_id?: string | null
          auto_assignment_confidence?: number | null
          classification_completed_at?: string | null
          classification_confidence?: number | null
          classification_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_classification?: Json | null
          enterprise_id?: string
          error_details?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          max_retries?: number | null
          ocr_completed_at?: string | null
          ocr_confidence?: number | null
          ocr_language?: string | null
          ocr_task_id?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          requires_review?: boolean | null
          retry_count?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_context?: string | null
          status?: string | null
          storage_bucket?: string | null
          target_contract_id?: string | null
          target_vendor_id?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_match_completed_at?: string | null
          vendor_match_confidence?: number | null
          vendor_match_result?: Json | null
          vendor_match_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_queue_auto_assigned_contract_id_fkey"
            columns: ["auto_assigned_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_contract_id_fkey"
            columns: ["auto_assigned_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_contract_id_fkey"
            columns: ["auto_assigned_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_vendor_id_fkey"
            columns: ["auto_assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_vendor_id_fkey"
            columns: ["auto_assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_vendor_id_fkey"
            columns: ["auto_assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_vendor_id_fkey"
            columns: ["auto_assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_auto_assigned_vendor_id_fkey"
            columns: ["auto_assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_classification_task_id_fkey"
            columns: ["classification_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_ocr_task_id_fkey"
            columns: ["ocr_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_contract_id_fkey"
            columns: ["target_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_contract_id_fkey"
            columns: ["target_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_contract_id_fkey"
            columns: ["target_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_vendor_match_task_id_fkey"
            columns: ["vendor_match_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
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
      document_version_comments: {
        Row: {
          change_id: string | null
          comment_type: string
          content: string
          created_at: string | null
          created_by: string | null
          end_position: number | null
          enterprise_id: string
          id: string
          is_internal: boolean | null
          is_resolved: boolean | null
          paragraph_number: number | null
          parent_comment_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          section_id: string | null
          selected_text: string | null
          start_position: number | null
          thread_id: string | null
          updated_at: string | null
          version_id: string
          visibility: string | null
        }
        Insert: {
          change_id?: string | null
          comment_type: string
          content: string
          created_at?: string | null
          created_by?: string | null
          end_position?: number | null
          enterprise_id: string
          id?: string
          is_internal?: boolean | null
          is_resolved?: boolean | null
          paragraph_number?: number | null
          parent_comment_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          selected_text?: string | null
          start_position?: number | null
          thread_id?: string | null
          updated_at?: string | null
          version_id: string
          visibility?: string | null
        }
        Update: {
          change_id?: string | null
          comment_type?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          end_position?: number | null
          enterprise_id?: string
          id?: string
          is_internal?: boolean | null
          is_resolved?: boolean | null
          paragraph_number?: number | null
          parent_comment_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          selected_text?: string | null
          start_position?: number | null
          thread_id?: string | null
          updated_at?: string | null
          version_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_version_comments_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "document_changes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_comments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "document_version_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_comments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          changes_count: number | null
          content_html: string | null
          content_markdown: string | null
          content_text: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          enterprise_id: string
          extracted_metadata: Json | null
          extracted_text: string | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_current: boolean | null
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: string
          updated_at: string | null
          version_label: string | null
          version_number: number
          version_type: string
        }
        Insert: {
          change_summary?: string | null
          changes_count?: number | null
          content_html?: string | null
          content_markdown?: string | null
          content_text?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id: string
          extracted_metadata?: Json | null
          extracted_text?: string | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: string
          updated_at?: string | null
          version_label?: string | null
          version_number: number
          version_type: string
        }
        Update: {
          change_summary?: string | null
          changes_count?: number | null
          content_html?: string | null
          content_markdown?: string | null
          content_text?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string
          extracted_metadata?: Json | null
          extracted_text?: string | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: string
          updated_at?: string | null
          version_label?: string | null
          version_number?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_analysis_logs: {
        Row: {
          confidence: number | null
          created_at: string | null
          enterprise_id: string | null
          id: string
          insights_generated: number | null
          query_context: Json
          query_type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          insights_generated?: number | null
          query_context: Json
          query_type: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          insights_generated?: number | null
          query_context?: Json
          query_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_analysis_logs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_best_practices: {
        Row: {
          actions: Json | null
          company_size: string | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          enterprise_id: string | null
          id: string
          industry: string | null
          practice_type: string
          success_rate: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          actions?: Json | null
          company_size?: string | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          industry?: string | null
          practice_type: string
          success_rate?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          actions?: Json | null
          company_size?: string | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          industry?: string | null
          practice_type?: string
          success_rate?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_best_practices_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_feedback_events: {
        Row: {
          event_data: Json
          event_timestamp: string | null
          event_type: string
          id: string
          recommendation_tracking_id: string
          sequence_number: number
        }
        Insert: {
          event_data?: Json
          event_timestamp?: string | null
          event_type: string
          id?: string
          recommendation_tracking_id: string
          sequence_number?: number
        }
        Update: {
          event_data?: Json
          event_timestamp?: string | null
          event_type?: string
          id?: string
          recommendation_tracking_id?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "donna_feedback_events_recommendation_tracking_id_fkey"
            columns: ["recommendation_tracking_id"]
            isOneToOne: false
            referencedRelation: "donna_recommendation_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_feedback_quality_metrics: {
        Row: {
          acceptance_rate: number | null
          average_feedback_score: number | null
          avg_implementation_time_hours: number | null
          avg_response_time_seconds: number | null
          bucket_type: string
          context_category: string | null
          created_at: string | null
          id: string
          implementation_rate: number | null
          implementations_abandoned: number | null
          implementations_completed: number | null
          implementations_started: number | null
          outcomes_failure: number | null
          outcomes_neutral: number | null
          outcomes_partial_success: number | null
          outcomes_success: number | null
          outcomes_unknown: number | null
          pattern_confidence_changes: number | null
          q_value_updates: number | null
          recommendation_type: string
          recommendations_accepted: number | null
          recommendations_ignored: number | null
          recommendations_modified: number | null
          recommendations_rejected: number | null
          success_rate: number | null
          time_bucket: string
          total_recommendations: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          average_feedback_score?: number | null
          avg_implementation_time_hours?: number | null
          avg_response_time_seconds?: number | null
          bucket_type: string
          context_category?: string | null
          created_at?: string | null
          id?: string
          implementation_rate?: number | null
          implementations_abandoned?: number | null
          implementations_completed?: number | null
          implementations_started?: number | null
          outcomes_failure?: number | null
          outcomes_neutral?: number | null
          outcomes_partial_success?: number | null
          outcomes_success?: number | null
          outcomes_unknown?: number | null
          pattern_confidence_changes?: number | null
          q_value_updates?: number | null
          recommendation_type: string
          recommendations_accepted?: number | null
          recommendations_ignored?: number | null
          recommendations_modified?: number | null
          recommendations_rejected?: number | null
          success_rate?: number | null
          time_bucket: string
          total_recommendations?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          average_feedback_score?: number | null
          avg_implementation_time_hours?: number | null
          avg_response_time_seconds?: number | null
          bucket_type?: string
          context_category?: string | null
          created_at?: string | null
          id?: string
          implementation_rate?: number | null
          implementations_abandoned?: number | null
          implementations_completed?: number | null
          implementations_started?: number | null
          outcomes_failure?: number | null
          outcomes_neutral?: number | null
          outcomes_partial_success?: number | null
          outcomes_success?: number | null
          outcomes_unknown?: number | null
          pattern_confidence_changes?: number | null
          q_value_updates?: number | null
          recommendation_type?: string
          recommendations_accepted?: number | null
          recommendations_ignored?: number | null
          recommendations_modified?: number | null
          recommendations_rejected?: number | null
          success_rate?: number | null
          time_bucket?: string
          total_recommendations?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      donna_insights: {
        Row: {
          actionable: boolean | null
          category: string | null
          confidence: number | null
          content: string | null
          created_at: string | null
          description: string | null
          enterprise_id: string | null
          id: string
          metadata: Json | null
          priority: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actionable?: boolean | null
          category?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actionable?: boolean | null
          category?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_insights_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_knowledge_edges: {
        Row: {
          confidence: number | null
          created_at: string | null
          edge_type: string
          evidence_count: number | null
          id: string
          properties: Json | null
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          edge_type: string
          evidence_count?: number | null
          id?: string
          properties?: Json | null
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          edge_type?: string
          evidence_count?: number | null
          id?: string
          properties?: Json | null
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_knowledge_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "donna_knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_knowledge_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "donna_knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_knowledge_nodes: {
        Row: {
          access_frequency: number | null
          created_at: string | null
          description: string | null
          embedding: string | null
          enterprise_id: string | null
          id: string
          importance_score: number | null
          name: string
          node_type: string
          properties: Json | null
          updated_at: string | null
        }
        Insert: {
          access_frequency?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          enterprise_id?: string | null
          id?: string
          importance_score?: number | null
          name: string
          node_type: string
          properties?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_frequency?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          enterprise_id?: string | null
          id?: string
          importance_score?: number | null
          name?: string
          node_type?: string
          properties?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_knowledge_nodes_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_learning_history: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          feedback_score: number | null
          id: string
          input_data: Json
          learning_type: string
          model_version: string | null
          output_data: Json
          reward: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          feedback_score?: number | null
          id?: string
          input_data: Json
          learning_type: string
          model_version?: string | null
          output_data: Json
          reward?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          feedback_score?: number | null
          id?: string
          input_data?: Json
          learning_type?: string
          model_version?: string | null
          output_data?: Json
          reward?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_learning_history_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_learning_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_learning_updates: {
        Row: {
          created_at: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          sample_count: number | null
          source_recommendation_id: string | null
          target_best_practice_id: string | null
          target_pattern_id: string | null
          update_reason: string | null
          update_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          sample_count?: number | null
          source_recommendation_id?: string | null
          target_best_practice_id?: string | null
          target_pattern_id?: string | null
          update_reason?: string | null
          update_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          sample_count?: number | null
          source_recommendation_id?: string | null
          target_best_practice_id?: string | null
          target_pattern_id?: string | null
          update_reason?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_learning_updates_source_recommendation_id_fkey"
            columns: ["source_recommendation_id"]
            isOneToOne: false
            referencedRelation: "donna_recommendation_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_market_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          description: string | null
          first_observed: string | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          last_observed: string | null
          observation_count: number | null
          pattern_data: Json
          pattern_signature: string
          pattern_type: string
          predicted_outcomes: Json | null
          recommendations: Json | null
          regions: string[] | null
          taxonomy_codes: string[] | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          first_observed?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          last_observed?: string | null
          observation_count?: number | null
          pattern_data: Json
          pattern_signature: string
          pattern_type: string
          predicted_outcomes?: Json | null
          recommendations?: Json | null
          regions?: string[] | null
          taxonomy_codes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          first_observed?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          last_observed?: string | null
          observation_count?: number | null
          pattern_data?: Json
          pattern_signature?: string
          pattern_type?: string
          predicted_outcomes?: Json | null
          recommendations?: Json | null
          regions?: string[] | null
          taxonomy_codes?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      donna_market_trends: {
        Row: {
          affected_segments: string[] | null
          change_pct: number | null
          confidence: number | null
          created_at: string | null
          data_quality: number | null
          description: string
          drivers: string[] | null
          end_date: string
          expires_at: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          prediction_next_period: Json | null
          region: string | null
          sample_size: number | null
          similar_historical_trends: Json | null
          start_date: string
          taxonomy_code: string | null
          trend_period: string
          trend_strength: string
          trend_type: string
        }
        Insert: {
          affected_segments?: string[] | null
          change_pct?: number | null
          confidence?: number | null
          created_at?: string | null
          data_quality?: number | null
          description: string
          drivers?: string[] | null
          end_date: string
          expires_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          prediction_next_period?: Json | null
          region?: string | null
          sample_size?: number | null
          similar_historical_trends?: Json | null
          start_date: string
          taxonomy_code?: string | null
          trend_period: string
          trend_strength: string
          trend_type: string
        }
        Update: {
          affected_segments?: string[] | null
          change_pct?: number | null
          confidence?: number | null
          created_at?: string | null
          data_quality?: number | null
          description?: string
          drivers?: string[] | null
          end_date?: string
          expires_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          prediction_next_period?: Json | null
          region?: string | null
          sample_size?: number | null
          similar_historical_trends?: Json | null
          start_date?: string
          taxonomy_code?: string | null
          trend_period?: string
          trend_strength?: string
          trend_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_market_trends_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      donna_outcome_definitions: {
        Row: {
          context_category: string | null
          created_at: string | null
          failure_threshold: number | null
          id: string
          is_active: boolean | null
          measurement_method: string
          measurement_window_hours: number | null
          partial_success_threshold: number | null
          recommendation_type: string
          success_metric_description: string | null
          success_metric_name: string
          success_threshold: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          context_category?: string | null
          created_at?: string | null
          failure_threshold?: number | null
          id?: string
          is_active?: boolean | null
          measurement_method: string
          measurement_window_hours?: number | null
          partial_success_threshold?: number | null
          recommendation_type: string
          success_metric_description?: string | null
          success_metric_name: string
          success_threshold?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          context_category?: string | null
          created_at?: string | null
          failure_threshold?: number | null
          id?: string
          is_active?: boolean | null
          measurement_method?: string
          measurement_window_hours?: number | null
          partial_success_threshold?: number | null
          recommendation_type?: string
          success_metric_description?: string | null
          success_metric_name?: string
          success_threshold?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      donna_patterns: {
        Row: {
          confidence: number | null
          context: Json | null
          created_at: string | null
          enterprise_id: string | null
          frequency: number | null
          id: string
          last_seen: string | null
          pattern_data: Json
          pattern_signature: string
          pattern_type: string
        }
        Insert: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          enterprise_id?: string | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          pattern_data: Json
          pattern_signature: string
          pattern_type: string
        }
        Update: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          enterprise_id?: string | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          pattern_data?: Json
          pattern_signature?: string
          pattern_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_patterns_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_policies: {
        Row: {
          active: boolean | null
          created_at: string | null
          enterprise_id: string | null
          id: string
          parameters: Json
          performance_score: number | null
          policy_name: string
          policy_type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          parameters: Json
          performance_score?: number | null
          policy_name: string
          policy_type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          parameters?: Json
          performance_score?: number | null
          policy_name?: string
          policy_type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_policies_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_predictions: {
        Row: {
          accuracy_score: number | null
          actual_outcome: Json | null
          confidence: number
          created_at: string | null
          enterprise_id: string
          entity_id: string | null
          entity_type: string | null
          id: string
          model_version: string | null
          outcome_recorded_at: string | null
          prediction: Json
          prediction_type: string
          timeframe_days: number | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_outcome?: Json | null
          confidence: number
          created_at?: string | null
          enterprise_id: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_version?: string | null
          outcome_recorded_at?: string | null
          prediction: Json
          prediction_type: string
          timeframe_days?: number | null
        }
        Update: {
          accuracy_score?: number | null
          actual_outcome?: Json | null
          confidence?: number
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_version?: string | null
          outcome_recorded_at?: string | null
          prediction?: Json
          prediction_type?: string
          timeframe_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_predictions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_price_anomalies: {
        Row: {
          anomaly_type: string
          comparison_basis: string | null
          comparison_period: string | null
          comparison_sample_size: number | null
          confidence: number | null
          contract_id: string | null
          created_at: string | null
          description: string
          detected_at: string | null
          detected_price: number
          deviation_pct: number | null
          enterprise_id: string
          expected_price: number | null
          id: string
          line_item_id: string | null
          market_avg_price: number | null
          market_median_price: number | null
          percentile_rank: number | null
          potential_savings: number | null
          recommendation: string | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          taxonomy_code: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          anomaly_type: string
          comparison_basis?: string | null
          comparison_period?: string | null
          comparison_sample_size?: number | null
          confidence?: number | null
          contract_id?: string | null
          created_at?: string | null
          description: string
          detected_at?: string | null
          detected_price: number
          deviation_pct?: number | null
          enterprise_id: string
          expected_price?: number | null
          id?: string
          line_item_id?: string | null
          market_avg_price?: number | null
          market_median_price?: number | null
          percentile_rank?: number | null
          potential_savings?: number | null
          recommendation?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          taxonomy_code?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          anomaly_type?: string
          comparison_basis?: string | null
          comparison_period?: string | null
          comparison_sample_size?: number | null
          confidence?: number | null
          contract_id?: string | null
          created_at?: string | null
          description?: string
          detected_at?: string | null
          detected_price?: number
          deviation_pct?: number | null
          enterprise_id?: string
          expected_price?: number | null
          id?: string
          line_item_id?: string | null
          market_avg_price?: number | null
          market_median_price?: number | null
          percentile_rank?: number | null
          potential_savings?: number | null
          recommendation?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          taxonomy_code?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_price_anomalies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "contract_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "donna_price_anomalies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donna_price_anomalies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_price_intelligence_cache: {
        Row: {
          cache_key: string
          computed_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          industry: string | null
          intelligence_data: Json
          last_hit_at: string | null
          region: string | null
          taxonomy_code: string
        }
        Insert: {
          cache_key: string
          computed_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          industry?: string | null
          intelligence_data: Json
          last_hit_at?: string | null
          region?: string | null
          taxonomy_code: string
        }
        Update: {
          cache_key?: string
          computed_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          industry?: string | null
          intelligence_data?: Json
          last_hit_at?: string | null
          region?: string | null
          taxonomy_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_price_intelligence_cache_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      donna_q_values: {
        Row: {
          action: string
          context_type: string | null
          enterprise_id: string | null
          id: string
          last_update: string | null
          q_value: number
          state_hash: string
          visits: number | null
        }
        Insert: {
          action: string
          context_type?: string | null
          enterprise_id?: string | null
          id?: string
          last_update?: string | null
          q_value: number
          state_hash: string
          visits?: number | null
        }
        Update: {
          action?: string
          context_type?: string | null
          enterprise_id?: string | null
          id?: string
          last_update?: string | null
          q_value?: number
          state_hash?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_q_values_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_query_logs: {
        Row: {
          confidence: number | null
          created_at: string | null
          enterprise_id: string | null
          feedback_metrics: Json | null
          feedback_received: boolean | null
          feedback_success: boolean | null
          id: string
          insights_count: number | null
          query_context: Json
          query_type: string
          recommendations_count: number | null
          updated_at: string | null
          user_satisfaction: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          enterprise_id?: string | null
          feedback_metrics?: Json | null
          feedback_received?: boolean | null
          feedback_success?: boolean | null
          id: string
          insights_count?: number | null
          query_context: Json
          query_type: string
          recommendations_count?: number | null
          updated_at?: string | null
          user_satisfaction?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          enterprise_id?: string | null
          feedback_metrics?: Json | null
          feedback_received?: boolean | null
          feedback_success?: boolean | null
          id?: string
          insights_count?: number | null
          query_context?: Json
          query_type?: string
          recommendations_count?: number | null
          updated_at?: string | null
          user_satisfaction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donna_query_logs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      donna_recommendation_tracking: {
        Row: {
          confidence_score: number | null
          context_category: string | null
          context_industry: string | null
          context_size_category: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          implementation_completed_at: string | null
          implementation_started_at: string | null
          implementation_status: string | null
          outcome_notes: string | null
          outcome_recorded_at: string | null
          outcome_status: string | null
          outcome_value: number | null
          outcome_value_unit: string | null
          predicted_outcome: string | null
          recommendation_content: Json
          recommendation_id: string
          recommendation_type: string
          response_at: string | null
          shown_at: string | null
          source_best_practice_id: string | null
          source_pattern_id: string | null
          time_to_implementation_hours: number | null
          time_to_response_seconds: number | null
          updated_at: string | null
          user_modification_notes: string | null
          user_response: string | null
        }
        Insert: {
          confidence_score?: number | null
          context_category?: string | null
          context_industry?: string | null
          context_size_category?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          implementation_completed_at?: string | null
          implementation_started_at?: string | null
          implementation_status?: string | null
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_status?: string | null
          outcome_value?: number | null
          outcome_value_unit?: string | null
          predicted_outcome?: string | null
          recommendation_content: Json
          recommendation_id: string
          recommendation_type: string
          response_at?: string | null
          shown_at?: string | null
          source_best_practice_id?: string | null
          source_pattern_id?: string | null
          time_to_implementation_hours?: number | null
          time_to_response_seconds?: number | null
          updated_at?: string | null
          user_modification_notes?: string | null
          user_response?: string | null
        }
        Update: {
          confidence_score?: number | null
          context_category?: string | null
          context_industry?: string | null
          context_size_category?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          implementation_completed_at?: string | null
          implementation_started_at?: string | null
          implementation_status?: string | null
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_status?: string | null
          outcome_value?: number | null
          outcome_value_unit?: string | null
          predicted_outcome?: string | null
          recommendation_content?: Json
          recommendation_id?: string
          recommendation_type?: string
          response_at?: string | null
          shown_at?: string | null
          source_best_practice_id?: string | null
          source_pattern_id?: string | null
          time_to_implementation_hours?: number | null
          time_to_response_seconds?: number | null
          updated_at?: string | null
          user_modification_notes?: string | null
          user_response?: string | null
        }
        Relationships: []
      }
      donna_system: {
        Row: {
          capabilities: Json | null
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          version: string
        }
        Insert: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version: string
        }
        Update: {
          capabilities?: Json | null
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      donna_user_profiles: {
        Row: {
          behavior_patterns: Json | null
          expertise_level: string | null
          feature_usage: Json | null
          id: string
          interaction_style: string | null
          last_updated: string | null
          preferences: Json | null
          recommendation_feedback: Json | null
          user_id: string
        }
        Insert: {
          behavior_patterns?: Json | null
          expertise_level?: string | null
          feature_usage?: Json | null
          id?: string
          interaction_style?: string | null
          last_updated?: string | null
          preferences?: Json | null
          recommendation_feedback?: Json | null
          user_id: string
        }
        Update: {
          behavior_patterns?: Json | null
          expertise_level?: string | null
          feature_usage?: Json | null
          id?: string
          interaction_style?: string | null
          last_updated?: string | null
          preferences?: Json | null
          recommendation_feedback?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donna_user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      editing_cursors: {
        Row: {
          anchor: number | null
          client_id: string
          color: string
          current_action: string | null
          cursor_style: string | null
          external_party_email: string | null
          focus_path: string | null
          head: number | null
          id: string
          idle_since: string | null
          last_activity: string | null
          selected_node_ids: string[] | null
          selection_type: string | null
          session_id: string
          session_start: string | null
          status: string
          user_avatar_url: string | null
          user_id: string | null
          user_name: string
          viewport_end: number | null
          viewport_start: number | null
        }
        Insert: {
          anchor?: number | null
          client_id: string
          color: string
          current_action?: string | null
          cursor_style?: string | null
          external_party_email?: string | null
          focus_path?: string | null
          head?: number | null
          id?: string
          idle_since?: string | null
          last_activity?: string | null
          selected_node_ids?: string[] | null
          selection_type?: string | null
          session_id: string
          session_start?: string | null
          status?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name: string
          viewport_end?: number | null
          viewport_start?: number | null
        }
        Update: {
          anchor?: number | null
          client_id?: string
          color?: string
          current_action?: string | null
          cursor_style?: string | null
          external_party_email?: string | null
          focus_path?: string | null
          head?: number | null
          id?: string
          idle_since?: string | null
          last_activity?: string | null
          selected_node_ids?: string[] | null
          selection_type?: string | null
          session_id?: string
          session_start?: string | null
          status?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name?: string
          viewport_end?: number | null
          viewport_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editing_cursors_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          bcc_emails: string[] | null
          cc_emails: string[] | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          from_email: string | null
          html_body: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          priority: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_data: Json | null
          template_name: string | null
          text_body: string | null
          to_email: string
        }
        Insert: {
          attempts?: number | null
          bcc_emails?: string[] | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string | null
          html_body?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_data?: Json | null
          template_name?: string | null
          text_body?: string | null
          to_email: string
        }
        Update: {
          attempts?: number | null
          bcc_emails?: string[] | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string | null
          html_body?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_data?: Json | null
          template_name?: string | null
          text_body?: string | null
          to_email?: string
        }
        Relationships: []
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
      enterprise_compliance_frameworks: {
        Row: {
          applies_to_categories: string[] | null
          applies_to_contract_types: string[] | null
          applies_to_regions: string[] | null
          certified_at: string | null
          certified_by: string | null
          created_at: string | null
          created_by: string | null
          custom_settings: Json | null
          enterprise_id: string
          framework_id: string
          id: string
          next_certification_due: string | null
          status: string | null
          strictness_level: string | null
          updated_at: string | null
        }
        Insert: {
          applies_to_categories?: string[] | null
          applies_to_contract_types?: string[] | null
          applies_to_regions?: string[] | null
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_settings?: Json | null
          enterprise_id: string
          framework_id: string
          id?: string
          next_certification_due?: string | null
          status?: string | null
          strictness_level?: string | null
          updated_at?: string | null
        }
        Update: {
          applies_to_categories?: string[] | null
          applies_to_contract_types?: string[] | null
          applies_to_regions?: string[] | null
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_settings?: Json | null
          enterprise_id?: string
          framework_id?: string
          id?: string
          next_certification_due?: string | null
          status?: string | null
          strictness_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_compliance_frameworks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_compliance_frameworks_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_tariff_cache: {
        Row: {
          base_rate: number | null
          calculated_at: string | null
          calculation_breakdown: Json | null
          country_additional_rate: number | null
          enterprise_id: string
          expires_at: string | null
          hts_code: string
          id: string
          is_usmca_qualifying: boolean | null
          origin_country: string
          product_specific_rate: number | null
          total_rate: number
        }
        Insert: {
          base_rate?: number | null
          calculated_at?: string | null
          calculation_breakdown?: Json | null
          country_additional_rate?: number | null
          enterprise_id: string
          expires_at?: string | null
          hts_code: string
          id?: string
          is_usmca_qualifying?: boolean | null
          origin_country: string
          product_specific_rate?: number | null
          total_rate: number
        }
        Update: {
          base_rate?: number | null
          calculated_at?: string | null
          calculation_breakdown?: Json | null
          country_additional_rate?: number | null
          enterprise_id?: string
          expires_at?: string | null
          hts_code?: string
          id?: string
          is_usmca_qualifying?: boolean | null
          origin_country?: string
          product_specific_rate?: number | null
          total_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_tariff_cache_enterprise_id_fkey"
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
          primary_party_aliases: string[] | null
          primary_party_identifiers: Json | null
          primary_party_name: string | null
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
          primary_party_aliases?: string[] | null
          primary_party_identifiers?: Json | null
          primary_party_name?: string | null
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
          primary_party_aliases?: string[] | null
          primary_party_identifiers?: Json | null
          primary_party_name?: string | null
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
      entity_comments: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          id: string
          is_resolved: boolean | null
          mentions: string[] | null
          parent_id: string | null
          reactions: Json | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          parent_id?: string | null
          reactions?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          parent_id?: string | null
          reactions?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_comments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_access_tokens: {
        Row: {
          access_code_hash: string | null
          allowed_countries: string[] | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          custom_message: string | null
          document_version_id: string | null
          email_verification_expires_at: string | null
          email_verification_token: string | null
          email_verified: boolean | null
          enterprise_id: string
          expires_at: string
          id: string
          invitation_sent_at: string | null
          ip_whitelist: string[] | null
          max_concurrent_sessions: number | null
          max_uses: number | null
          metadata: Json | null
          party_company: string | null
          party_email: string
          party_name: string
          party_phone: string | null
          party_role: string
          party_title: string | null
          redline_session_id: string | null
          reminder_count: number | null
          reminder_sent_at: string | null
          require_email_verification: boolean | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          signature_request_id: string | null
          status: string
          token_hash: string
          token_prefix: string
          token_type: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          access_code_hash?: string | null
          allowed_countries?: string[] | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_message?: string | null
          document_version_id?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          enterprise_id: string
          expires_at: string
          id?: string
          invitation_sent_at?: string | null
          ip_whitelist?: string[] | null
          max_concurrent_sessions?: number | null
          max_uses?: number | null
          metadata?: Json | null
          party_company?: string | null
          party_email: string
          party_name: string
          party_phone?: string | null
          party_role?: string
          party_title?: string | null
          redline_session_id?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          require_email_verification?: boolean | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          signature_request_id?: string | null
          status?: string
          token_hash: string
          token_prefix: string
          token_type: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          access_code_hash?: string | null
          allowed_countries?: string[] | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_message?: string | null
          document_version_id?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          enterprise_id?: string
          expires_at?: string
          id?: string
          invitation_sent_at?: string | null
          ip_whitelist?: string[] | null
          max_concurrent_sessions?: number | null
          max_uses?: number | null
          metadata?: Json | null
          party_company?: string | null
          party_email?: string
          party_name?: string
          party_phone?: string | null
          party_role?: string
          party_title?: string | null
          redline_session_id?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          require_email_verification?: boolean | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          signature_request_id?: string | null
          status?: string
          token_hash?: string
          token_prefix?: string
          token_type?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_access_tokens_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_redline_session_id_fkey"
            columns: ["redline_session_id"]
            isOneToOne: false
            referencedRelation: "redline_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_tokens_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      external_party_actions: {
        Row: {
          action_description: string | null
          action_type: string
          created_at: string | null
          duration_ms: number | null
          geo_location: Json | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_state: Json | null
          previous_state: Json | null
          session_id: string
          target_data: Json | null
          target_id: string | null
          target_type: string | null
          token_id: string
          user_agent: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          created_at?: string | null
          duration_ms?: number | null
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          session_id: string
          target_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          token_id: string
          user_agent?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          created_at?: string | null
          duration_ms?: number | null
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          session_id?: string
          target_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_party_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "external_party_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_party_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "external_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      external_party_drawn_signatures: {
        Row: {
          canvas_height: number | null
          canvas_width: number | null
          consent_text: string
          consent_timestamp: string
          created_at: string | null
          device_type: string | null
          font_family: string | null
          font_size: number | null
          id: string
          ip_address: string
          last_used_at: string | null
          session_id: string
          signature_data: string
          signature_hash: string
          signature_type: string
          stroke_data: Json | null
          token_id: string
          used_count: number | null
          user_agent: string | null
        }
        Insert: {
          canvas_height?: number | null
          canvas_width?: number | null
          consent_text: string
          consent_timestamp?: string
          created_at?: string | null
          device_type?: string | null
          font_family?: string | null
          font_size?: number | null
          id?: string
          ip_address: string
          last_used_at?: string | null
          session_id: string
          signature_data: string
          signature_hash: string
          signature_type: string
          stroke_data?: Json | null
          token_id: string
          used_count?: number | null
          user_agent?: string | null
        }
        Update: {
          canvas_height?: number | null
          canvas_width?: number | null
          consent_text?: string
          consent_timestamp?: string
          created_at?: string | null
          device_type?: string | null
          font_family?: string | null
          font_size?: number | null
          id?: string
          ip_address?: string
          last_used_at?: string | null
          session_id?: string
          signature_data?: string
          signature_hash?: string
          signature_type?: string
          stroke_data?: Json | null
          token_id?: string
          used_count?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_party_drawn_signatures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "external_party_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_party_drawn_signatures_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "external_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      external_party_sessions: {
        Row: {
          created_at: string | null
          cursor_position: Json | null
          device_fingerprint: string | null
          expires_at: string
          geo_location: Json | null
          id: string
          ip_address: string | null
          last_activity: string | null
          presence_data: Json | null
          session_token_hash: string
          started_at: string | null
          status: string
          terminated_reason: string | null
          token_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          cursor_position?: Json | null
          device_fingerprint?: string | null
          expires_at: string
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          presence_data?: Json | null
          session_token_hash: string
          started_at?: string | null
          status?: string
          terminated_reason?: string | null
          token_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          cursor_position?: Json | null
          device_fingerprint?: string | null
          expires_at?: string
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          presence_data?: Json | null
          session_token_hash?: string
          started_at?: string | null
          status?: string
          terminated_reason?: string | null
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_party_sessions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "external_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_data_reviews: {
        Row: {
          accuracy_rate: number | null
          confidence_scores: Json | null
          contract_id: string | null
          corrected_data: Json | null
          corrections_made: string[] | null
          created_at: string
          document_id: string
          enterprise_id: string
          entity_highlights: Json | null
          extracted_data: Json
          extraction_quality_score: number | null
          fields_corrected: number | null
          id: string
          ocr_job_id: string | null
          review_notes: string | null
          review_time_seconds: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_fields: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          accuracy_rate?: number | null
          confidence_scores?: Json | null
          contract_id?: string | null
          corrected_data?: Json | null
          corrections_made?: string[] | null
          created_at?: string
          document_id: string
          enterprise_id: string
          entity_highlights?: Json | null
          extracted_data?: Json
          extraction_quality_score?: number | null
          fields_corrected?: number | null
          id?: string
          ocr_job_id?: string | null
          review_notes?: string | null
          review_time_seconds?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_fields?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          accuracy_rate?: number | null
          confidence_scores?: Json | null
          contract_id?: string | null
          corrected_data?: Json | null
          corrections_made?: string[] | null
          created_at?: string
          document_id?: string
          enterprise_id?: string
          entity_highlights?: Json | null
          extracted_data?: Json
          extraction_quality_score?: number | null
          fields_corrected?: number | null
          id?: string
          ocr_job_id?: string | null
          review_notes?: string | null
          review_time_seconds?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_fields?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_data_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_ocr_job_id_fkey"
            columns: ["ocr_job_id"]
            isOneToOne: false
            referencedRelation: "ocr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          conditions: Json | null
          created_at: string | null
          description: string | null
          flag_name: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          rollout_percentage: number | null
          target_enterprises: string[] | null
          target_users: string[] | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          rollout_percentage?: number | null
          target_enterprises?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          rollout_percentage?: number | null
          target_enterprises?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
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
      framework_requirements: {
        Row: {
          category: string
          clause_requirements: Json | null
          created_at: string | null
          description: string | null
          example_clause: string | null
          framework_id: string
          id: string
          is_active: boolean | null
          mandatory: boolean | null
          prohibited_clauses: string[] | null
          remediation_guidance: string | null
          required_clauses: string[] | null
          requirement_code: string
          severity: string
          title: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          category: string
          clause_requirements?: Json | null
          created_at?: string | null
          description?: string | null
          example_clause?: string | null
          framework_id: string
          id?: string
          is_active?: boolean | null
          mandatory?: boolean | null
          prohibited_clauses?: string[] | null
          remediation_guidance?: string | null
          required_clauses?: string[] | null
          requirement_code: string
          severity: string
          title: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          category?: string
          clause_requirements?: Json | null
          created_at?: string | null
          description?: string | null
          example_clause?: string | null
          framework_id?: string
          id?: string
          is_active?: boolean | null
          mandatory?: boolean | null
          prohibited_clauses?: string[] | null
          remediation_guidance?: string | null
          required_clauses?: string[] | null
          requirement_code?: string
          severity?: string
          title?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_requirements_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      hts_codes: {
        Row: {
          category: string | null
          chapter: string | null
          code: string
          column_2_rate: string | null
          created_at: string | null
          description: string
          effective_date: string | null
          embedding: string | null
          full_description: string | null
          general_rate_numeric: number | null
          general_rate_text: string | null
          heading: string | null
          is_active: boolean | null
          source: string | null
          special_rate_text: string | null
          subheading: string | null
          suffix: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          chapter?: string | null
          code: string
          column_2_rate?: string | null
          created_at?: string | null
          description: string
          effective_date?: string | null
          embedding?: string | null
          full_description?: string | null
          general_rate_numeric?: number | null
          general_rate_text?: string | null
          heading?: string | null
          is_active?: boolean | null
          source?: string | null
          special_rate_text?: string | null
          subheading?: string | null
          suffix?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          chapter?: string | null
          code?: string
          column_2_rate?: string | null
          created_at?: string | null
          description?: string
          effective_date?: string | null
          embedding?: string | null
          full_description?: string | null
          general_rate_numeric?: number | null
          general_rate_text?: string | null
          heading?: string | null
          is_active?: boolean | null
          source?: string | null
          special_rate_text?: string | null
          subheading?: string | null
          suffix?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      industry_benchmarks_master: {
        Row: {
          company_size_segment: string | null
          confidence_level: number | null
          created_at: string | null
          currency: string | null
          effective_date: string
          expires_date: string | null
          geographic_region: string | null
          id: string
          industry: string
          last_validated: string | null
          mean_value: number | null
          metric_category: string
          metric_name: string
          metric_value: Json
          p10_value: number | null
          p25_value: number | null
          p50_value: number | null
          p75_value: number | null
          p90_value: number | null
          p95_value: number | null
          sample_size: number | null
          source: string | null
          source_url: string | null
          std_deviation: number | null
          sub_industry: string | null
          time_period: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          company_size_segment?: string | null
          confidence_level?: number | null
          created_at?: string | null
          currency?: string | null
          effective_date: string
          expires_date?: string | null
          geographic_region?: string | null
          id?: string
          industry: string
          last_validated?: string | null
          mean_value?: number | null
          metric_category: string
          metric_name: string
          metric_value: Json
          p10_value?: number | null
          p25_value?: number | null
          p50_value?: number | null
          p75_value?: number | null
          p90_value?: number | null
          p95_value?: number | null
          sample_size?: number | null
          source?: string | null
          source_url?: string | null
          std_deviation?: number | null
          sub_industry?: string | null
          time_period?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          company_size_segment?: string | null
          confidence_level?: number | null
          created_at?: string | null
          currency?: string | null
          effective_date?: string
          expires_date?: string | null
          geographic_region?: string | null
          id?: string
          industry?: string
          last_validated?: string | null
          mean_value?: number | null
          metric_category?: string
          metric_name?: string
          metric_value?: Json
          p10_value?: number | null
          p25_value?: number | null
          p50_value?: number | null
          p75_value?: number | null
          p90_value?: number | null
          p95_value?: number | null
          sample_size?: number | null
          source?: string | null
          source_url?: string | null
          std_deviation?: number | null
          sub_industry?: string | null
          time_period?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      industry_contract_templates: {
        Row: {
          active: boolean | null
          audit_requirements: Json | null
          certification_requirements: string[] | null
          common_risks: Json | null
          contract_type: string
          created_at: string | null
          discount_structures: Json | null
          dispute_resolution: Json | null
          escalation_clauses: Json | null
          geographic_applicability: string[] | null
          governing_law: string | null
          id: string
          incentive_structures: Json | null
          indemnification_terms: Json | null
          industry: string
          insurance_requirements: Json | null
          kpi_metrics: Json | null
          language_requirements: string[] | null
          liability_caps: Json | null
          mandatory_clauses: Json | null
          max_duration_days: number | null
          min_duration_days: number | null
          mitigation_strategies: Json | null
          negotiable_terms: Json | null
          notice_periods: Json | null
          optional_clauses: Json | null
          payment_terms: Json | null
          penalty_structures: Json | null
          pricing_models: Json | null
          prohibited_clauses: Json | null
          regulatory_references: Json | null
          renewal_terms: Json | null
          required_compliance: string[] | null
          sla_requirements: Json | null
          standard_clauses: Json
          sub_industry: string | null
          template_name: string
          template_version: string | null
          termination_clauses: Json | null
          typical_duration_days: number | null
          typical_value_range: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          audit_requirements?: Json | null
          certification_requirements?: string[] | null
          common_risks?: Json | null
          contract_type: string
          created_at?: string | null
          discount_structures?: Json | null
          dispute_resolution?: Json | null
          escalation_clauses?: Json | null
          geographic_applicability?: string[] | null
          governing_law?: string | null
          id?: string
          incentive_structures?: Json | null
          indemnification_terms?: Json | null
          industry: string
          insurance_requirements?: Json | null
          kpi_metrics?: Json | null
          language_requirements?: string[] | null
          liability_caps?: Json | null
          mandatory_clauses?: Json | null
          max_duration_days?: number | null
          min_duration_days?: number | null
          mitigation_strategies?: Json | null
          negotiable_terms?: Json | null
          notice_periods?: Json | null
          optional_clauses?: Json | null
          payment_terms?: Json | null
          penalty_structures?: Json | null
          pricing_models?: Json | null
          prohibited_clauses?: Json | null
          regulatory_references?: Json | null
          renewal_terms?: Json | null
          required_compliance?: string[] | null
          sla_requirements?: Json | null
          standard_clauses: Json
          sub_industry?: string | null
          template_name: string
          template_version?: string | null
          termination_clauses?: Json | null
          typical_duration_days?: number | null
          typical_value_range?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          audit_requirements?: Json | null
          certification_requirements?: string[] | null
          common_risks?: Json | null
          contract_type?: string
          created_at?: string | null
          discount_structures?: Json | null
          dispute_resolution?: Json | null
          escalation_clauses?: Json | null
          geographic_applicability?: string[] | null
          governing_law?: string | null
          id?: string
          incentive_structures?: Json | null
          indemnification_terms?: Json | null
          industry?: string
          insurance_requirements?: Json | null
          kpi_metrics?: Json | null
          language_requirements?: string[] | null
          liability_caps?: Json | null
          mandatory_clauses?: Json | null
          max_duration_days?: number | null
          min_duration_days?: number | null
          mitigation_strategies?: Json | null
          negotiable_terms?: Json | null
          notice_periods?: Json | null
          optional_clauses?: Json | null
          payment_terms?: Json | null
          penalty_structures?: Json | null
          pricing_models?: Json | null
          prohibited_clauses?: Json | null
          regulatory_references?: Json | null
          renewal_terms?: Json | null
          required_compliance?: string[] | null
          sla_requirements?: Json | null
          standard_clauses?: Json
          sub_industry?: string | null
          template_name?: string
          template_version?: string | null
          termination_clauses?: Json | null
          typical_duration_days?: number | null
          typical_value_range?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inline_comments: {
        Row: {
          anchor_end: number
          anchor_start: number
          anchor_text: string | null
          author_external_email: string | null
          author_name: string
          author_user_id: string | null
          comment_text: string
          created_at: string | null
          formatted_text: string | null
          id: string
          is_resolved: boolean | null
          mentions: string[] | null
          metadata: Json | null
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          status: string
          suggestion_id: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          anchor_end: number
          anchor_start: number
          anchor_text?: string | null
          author_external_email?: string | null
          author_name: string
          author_user_id?: string | null
          comment_text: string
          created_at?: string | null
          formatted_text?: string | null
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          metadata?: Json | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          status?: string
          suggestion_id?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          anchor_end?: number
          anchor_start?: number
          anchor_text?: string | null
          author_external_email?: string | null
          author_name?: string
          author_user_id?: string | null
          comment_text?: string
          created_at?: string | null
          formatted_text?: string | null
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          metadata?: Json | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          status?: string
          suggestion_id?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inline_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "inline_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inline_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inline_comments_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "collaborative_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string | null
          description: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          submission_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string | null
          description?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          submission_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string | null
          description?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          submission_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "intake_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_comments: {
        Row: {
          author_id: string | null
          author_name: string
          comment_text: string
          comment_type: string | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          submission_id: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          comment_text: string
          comment_type?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          submission_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          comment_text?: string
          comment_type?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "intake_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_form_fields: {
        Row: {
          allow_other: boolean | null
          column_span: number | null
          created_at: string | null
          depends_on_field: string | null
          depends_on_value: Json | null
          field_label: string
          field_name: string
          field_order: number
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean | null
          maps_to_contract_field: string | null
          maps_to_workflow_variable: string | null
          max_length: number | null
          max_value: number | null
          metadata: Json | null
          min_length: number | null
          min_value: number | null
          options: Json | null
          pattern: string | null
          placeholder: string | null
          section: string | null
          show_when: string | null
          tooltip: string | null
          validation_message: string | null
        }
        Insert: {
          allow_other?: boolean | null
          column_span?: number | null
          created_at?: string | null
          depends_on_field?: string | null
          depends_on_value?: Json | null
          field_label: string
          field_name: string
          field_order: number
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          maps_to_contract_field?: string | null
          maps_to_workflow_variable?: string | null
          max_length?: number | null
          max_value?: number | null
          metadata?: Json | null
          min_length?: number | null
          min_value?: number | null
          options?: Json | null
          pattern?: string | null
          placeholder?: string | null
          section?: string | null
          show_when?: string | null
          tooltip?: string | null
          validation_message?: string | null
        }
        Update: {
          allow_other?: boolean | null
          column_span?: number | null
          created_at?: string | null
          depends_on_field?: string | null
          depends_on_value?: Json | null
          field_label?: string
          field_name?: string
          field_order?: number
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          maps_to_contract_field?: string | null
          maps_to_workflow_variable?: string | null
          max_length?: number | null
          max_value?: number | null
          metadata?: Json | null
          min_length?: number | null
          min_value?: number | null
          options?: Json | null
          pattern?: string | null
          placeholder?: string | null
          section?: string | null
          show_when?: string | null
          tooltip?: string | null
          validation_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "contract_intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_submission_sequences: {
        Row: {
          enterprise_id: string
          next_number: number
          prefix: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          enterprise_id: string
          next_number?: number
          prefix?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          enterprise_id?: string
          next_number?: number
          prefix?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_submission_sequences_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: true
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_submissions: {
        Row: {
          assigned_to: string | null
          business_unit: string | null
          completed_at: string | null
          contract_type: string | null
          converted_at: string | null
          cost_center: string | null
          counterparty_name: string | null
          counterparty_type: string | null
          created_at: string | null
          current_approval_step: number | null
          enterprise_id: string
          estimated_value: number | null
          first_reviewed_at: string | null
          form_data: Json
          form_id: string
          form_version: number
          id: string
          resulting_contract_id: string | null
          risk_level: string | null
          status: string
          status_reason: string | null
          submission_number: string
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string | null
          urgency: string | null
          vendor_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_unit?: string | null
          completed_at?: string | null
          contract_type?: string | null
          converted_at?: string | null
          cost_center?: string | null
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string | null
          current_approval_step?: number | null
          enterprise_id: string
          estimated_value?: number | null
          first_reviewed_at?: string | null
          form_data?: Json
          form_id: string
          form_version: number
          id?: string
          resulting_contract_id?: string | null
          risk_level?: string | null
          status?: string
          status_reason?: string | null
          submission_number: string
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string | null
          urgency?: string | null
          vendor_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_unit?: string | null
          completed_at?: string | null
          contract_type?: string | null
          converted_at?: string | null
          cost_center?: string | null
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string | null
          current_approval_step?: number | null
          enterprise_id?: string
          estimated_value?: number | null
          first_reviewed_at?: string | null
          form_data?: Json
          form_id?: string
          form_version?: number
          id?: string
          resulting_contract_id?: string | null
          risk_level?: string | null
          status?: string
          status_reason?: string | null
          submission_number?: string
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string | null
          urgency?: string | null
          vendor_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "contract_intake_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_contract_id_fkey"
            columns: ["resulting_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_contract_id_fkey"
            columns: ["resulting_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_contract_id_fkey"
            columns: ["resulting_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "intake_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "intake_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          code: string
          created_at: string | null
          email: string
          enterprise_id: string
          expires_at: string
          id: string
          invited_by: string
          is_used: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          enterprise_id: string
          expires_at: string
          id?: string
          invited_by: string
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          enterprise_id?: string
          expires_at?: string
          id?: string
          invited_by?: string
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["auth_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number | null
          amount_remaining: number
          created_at: string | null
          currency: string | null
          due_date: string | null
          enterprise_id: string
          hosted_invoice_url: string | null
          id: string
          invoice_number: string | null
          invoice_pdf: string | null
          metadata: Json | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          subscription_id: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          amount_remaining: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          enterprise_id: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf?: string | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          subscription_id?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          amount_remaining?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          enterprise_id?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf?: string | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_invoice_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_reputation: {
        Row: {
          country_code: string | null
          first_seen: string | null
          id: string
          ip_address: unknown
          is_blacklisted: boolean | null
          is_whitelisted: boolean | null
          last_seen: string | null
          notes: string | null
          organization: string | null
          reputation_score: number | null
          threat_types: string[] | null
          total_events: number | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          first_seen?: string | null
          id?: string
          ip_address: unknown
          is_blacklisted?: boolean | null
          is_whitelisted?: boolean | null
          last_seen?: string | null
          notes?: string | null
          organization?: string | null
          reputation_score?: number | null
          threat_types?: string[] | null
          total_events?: number | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          first_seen?: string | null
          id?: string
          ip_address?: unknown
          is_blacklisted?: boolean | null
          is_whitelisted?: boolean | null
          last_seen?: string | null
          notes?: string | null
          organization?: string | null
          reputation_score?: number | null
          threat_types?: string[] | null
          total_events?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_execution_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_id: string
          output: Json | null
          retry_count: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id: string
          output?: Json | null
          retry_count?: number | null
          started_at: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id?: string
          output?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_execution_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          enterprise_id: string
          id: string
          level: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          level?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          level?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_titles_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
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
      market_price_history: {
        Row: {
          company_size: string | null
          contract_duration_months: number | null
          contract_type: string | null
          currency: string | null
          data_quality_score: number | null
          effective_date: string
          id: string
          industry: string | null
          is_outlier: boolean | null
          line_item_hash: string | null
          negotiation_indicator: string | null
          outlier_reason: string | null
          pricing_frequency: string | null
          pricing_model: string | null
          quantity_range: string | null
          recorded_at: string | null
          region: string | null
          source_hash: string
          taxonomy_code: string
          unit_price: number
          vendor_tier: string | null
        }
        Insert: {
          company_size?: string | null
          contract_duration_months?: number | null
          contract_type?: string | null
          currency?: string | null
          data_quality_score?: number | null
          effective_date: string
          id?: string
          industry?: string | null
          is_outlier?: boolean | null
          line_item_hash?: string | null
          negotiation_indicator?: string | null
          outlier_reason?: string | null
          pricing_frequency?: string | null
          pricing_model?: string | null
          quantity_range?: string | null
          recorded_at?: string | null
          region?: string | null
          source_hash: string
          taxonomy_code: string
          unit_price: number
          vendor_tier?: string | null
        }
        Update: {
          company_size?: string | null
          contract_duration_months?: number | null
          contract_type?: string | null
          currency?: string | null
          data_quality_score?: number | null
          effective_date?: string
          id?: string
          industry?: string | null
          is_outlier?: boolean | null
          line_item_hash?: string | null
          negotiation_indicator?: string | null
          outlier_reason?: string | null
          pricing_frequency?: string | null
          pricing_model?: string | null
          quantity_range?: string | null
          recorded_at?: string | null
          region?: string | null
          source_hash?: string
          taxonomy_code?: string
          unit_price?: number
          vendor_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_price_history_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      market_price_indices: {
        Row: {
          avg_unit_price: number
          company_size: string | null
          confidence_score: number | null
          data_freshness_days: number | null
          id: string
          index_date: string
          industry: string | null
          last_calculated: string | null
          max_price: number | null
          median_unit_price: number
          min_price: number | null
          p10_price: number | null
          p25_price: number | null
          p75_price: number | null
          p90_price: number | null
          p95_price: number | null
          period: string
          price_change_pct: number | null
          price_change_yoy_pct: number | null
          region: string | null
          sample_count: number
          std_dev: number | null
          taxonomy_code: string
          trend_direction: string | null
          volatility_score: number | null
        }
        Insert: {
          avg_unit_price: number
          company_size?: string | null
          confidence_score?: number | null
          data_freshness_days?: number | null
          id?: string
          index_date: string
          industry?: string | null
          last_calculated?: string | null
          max_price?: number | null
          median_unit_price: number
          min_price?: number | null
          p10_price?: number | null
          p25_price?: number | null
          p75_price?: number | null
          p90_price?: number | null
          p95_price?: number | null
          period?: string
          price_change_pct?: number | null
          price_change_yoy_pct?: number | null
          region?: string | null
          sample_count: number
          std_dev?: number | null
          taxonomy_code: string
          trend_direction?: string | null
          volatility_score?: number | null
        }
        Update: {
          avg_unit_price?: number
          company_size?: string | null
          confidence_score?: number | null
          data_freshness_days?: number | null
          id?: string
          index_date?: string
          industry?: string | null
          last_calculated?: string | null
          max_price?: number | null
          median_unit_price?: number
          min_price?: number | null
          p10_price?: number | null
          p25_price?: number | null
          p75_price?: number | null
          p90_price?: number | null
          p95_price?: number | null
          period?: string
          price_change_pct?: number | null
          price_change_yoy_pct?: number | null
          region?: string | null
          sample_count?: number
          std_dev?: number | null
          taxonomy_code?: string
          trend_direction?: string | null
          volatility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_price_indices_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      migration_history: {
        Row: {
          applied_by: string | null
          checksum: string | null
          executed_at: string
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          migration_name: string
          rollback_sql: string | null
          version: string
        }
        Insert: {
          applied_by?: string | null
          checksum?: string | null
          executed_at: string
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          migration_name: string
          rollback_sql?: string | null
          version: string
        }
        Update: {
          applied_by?: string | null
          checksum?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          migration_name?: string
          rollback_sql?: string | null
          version?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          cache_key: string | null
          confidence_score: number | null
          created_at: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          input_data: Json
          is_cached: boolean | null
          model_metrics: Json | null
          model_version: string | null
          prediction_results: Json
          prediction_type: string
          processing_time_ms: number | null
          service_name: string
        }
        Insert: {
          cache_key?: string | null
          confidence_score?: number | null
          created_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          input_data?: Json
          is_cached?: boolean | null
          model_metrics?: Json | null
          model_version?: string | null
          prediction_results?: Json
          prediction_type: string
          processing_time_ms?: number | null
          service_name: string
        }
        Update: {
          cache_key?: string | null
          confidence_score?: number | null
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          input_data?: Json
          is_cached?: boolean | null
          model_metrics?: Json | null
          model_version?: string | null
          prediction_results?: Json
          prediction_type?: string
          processing_time_ms?: number | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_messages: {
        Row: {
          action_due_date: string | null
          attachments: Json | null
          contract_id: string | null
          created_at: string | null
          delivered_at: string | null
          enterprise_id: string
          id: string
          is_action_required: boolean | null
          is_important: boolean | null
          message_html: string | null
          message_text: string
          metadata: Json | null
          parent_message_id: string | null
          read_at: string | null
          read_by: string[] | null
          redline_session_id: string | null
          related_clause_id: string | null
          related_field: string | null
          related_redline_id: string | null
          sender_company: string | null
          sender_email: string
          sender_name: string
          sender_token_id: string | null
          sender_type: string
          sender_user_id: string | null
          signature_request_id: string | null
          status: string
          subject: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_due_date?: string | null
          attachments?: Json | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          enterprise_id: string
          id?: string
          is_action_required?: boolean | null
          is_important?: boolean | null
          message_html?: string | null
          message_text: string
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          read_by?: string[] | null
          redline_session_id?: string | null
          related_clause_id?: string | null
          related_field?: string | null
          related_redline_id?: string | null
          sender_company?: string | null
          sender_email: string
          sender_name: string
          sender_token_id?: string | null
          sender_type: string
          sender_user_id?: string | null
          signature_request_id?: string | null
          status?: string
          subject?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_due_date?: string | null
          attachments?: Json | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          enterprise_id?: string
          id?: string
          is_action_required?: boolean | null
          is_important?: boolean | null
          message_html?: string | null
          message_text?: string
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          read_by?: string[] | null
          redline_session_id?: string | null
          related_clause_id?: string | null
          related_field?: string | null
          related_redline_id?: string | null
          sender_company?: string | null
          sender_email?: string
          sender_name?: string
          sender_token_id?: string | null
          sender_type?: string
          sender_user_id?: string | null
          signature_request_id?: string | null
          status?: string
          subject?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "negotiation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_redline_session_id_fkey"
            columns: ["redline_session_id"]
            isOneToOne: false
            referencedRelation: "redline_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_sender_token_id_fkey"
            columns: ["sender_token_id"]
            isOneToOne: false
            referencedRelation: "external_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_playbooks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contract_types: string[]
          created_at: string | null
          created_by: string | null
          description: string | null
          enterprise_id: string
          id: string
          metadata: Json | null
          name: string
          status: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contract_types?: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contract_types?: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_playbooks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_sessions: {
        Row: {
          actual_outcome: Json | null
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          current_state: Json | null
          enterprise_id: string
          id: string
          initial_position: Json | null
          moves_history: Json | null
          negotiation_strategy: Json | null
          outcome_prediction: Json | null
          recommendations: Json | null
          session_name: string
          session_type: string | null
          started_at: string | null
          status: string | null
          success_metrics: Json | null
          target_outcomes: Json | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          actual_outcome?: Json | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: Json | null
          enterprise_id: string
          id?: string
          initial_position?: Json | null
          moves_history?: Json | null
          negotiation_strategy?: Json | null
          outcome_prediction?: Json | null
          recommendations?: Json | null
          session_name: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          success_metrics?: Json | null
          target_outcomes?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          actual_outcome?: Json | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: Json | null
          enterprise_id?: string
          id?: string
          initial_position?: Json | null
          moves_history?: Json | null
          negotiation_strategy?: Json | null
          outcome_prediction?: Json | null
          recommendations?: Json | null
          session_name?: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          success_metrics?: Json | null
          target_outcomes?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "negotiation_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "negotiation_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_config: Json
          channel_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_config: Json
          channel_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_config?: Json
          channel_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digest_settings: {
        Row: {
          created_at: string | null
          digest_type: string
          enabled: boolean | null
          excluded_types: string[] | null
          id: string
          included_types: string[] | null
          last_sent_at: string | null
          next_scheduled_at: string | null
          send_day_of_month: number | null
          send_day_of_week: number | null
          send_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_type: string
          enabled?: boolean | null
          excluded_types?: string[] | null
          id?: string
          included_types?: string[] | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          send_day_of_month?: number | null
          send_day_of_week?: number | null
          send_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_type?: string
          enabled?: boolean | null
          excluded_types?: string[] | null
          id?: string
          included_types?: string[] | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          send_day_of_month?: number | null
          send_day_of_week?: number | null
          send_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digest_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          notification_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notification_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notification_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          enterprise_id: string
          event_types: string[]
          id: string
          is_active: boolean | null
          priority: number | null
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          enterprise_id: string
          event_types: string[]
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          enterprise_id?: string
          event_types?: string[]
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      obligation_assignments: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          declined_reason: string | null
          id: string
          notifications_enabled: boolean | null
          obligation_id: string
          role: string
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          declined_reason?: string | null
          id?: string
          notifications_enabled?: boolean | null
          obligation_id: string
          role: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          declined_reason?: string | null
          id?: string
          notifications_enabled?: boolean | null
          obligation_id?: string
          role?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_assignments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_audit_log: {
        Row: {
          action: string
          action_category: string | null
          changed_fields: string[] | null
          created_at: string | null
          enterprise_id: string
          id: string
          ip_address: unknown | null
          new_state: Json | null
          obligation_id: string
          performed_by_agent: string | null
          performed_by_system: boolean | null
          performed_by_user_id: string | null
          previous_state: Json | null
          reason: string | null
          related_completion_id: string | null
          related_dependency_id: string | null
          related_escalation_id: string | null
          related_risk_assessment_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          ip_address?: unknown | null
          new_state?: Json | null
          obligation_id: string
          performed_by_agent?: string | null
          performed_by_system?: boolean | null
          performed_by_user_id?: string | null
          previous_state?: Json | null
          reason?: string | null
          related_completion_id?: string | null
          related_dependency_id?: string | null
          related_escalation_id?: string | null
          related_risk_assessment_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          ip_address?: unknown | null
          new_state?: Json | null
          obligation_id?: string
          performed_by_agent?: string | null
          performed_by_system?: boolean | null
          performed_by_user_id?: string | null
          previous_state?: Json | null
          reason?: string | null
          related_completion_id?: string | null
          related_dependency_id?: string | null
          related_escalation_id?: string | null
          related_risk_assessment_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_audit_log_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_audit_log_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_completions: {
        Row: {
          completed_by: string | null
          completion_date: string
          created_at: string | null
          days_early_late: number | null
          evidence_description: string | null
          evidence_file_id: string | null
          evidence_type: string | null
          evidence_url: string | null
          id: string
          notes: string | null
          obligation_id: string
          period_end: string | null
          period_start: string | null
          rejection_reason: string | null
          requires_verification: boolean | null
          verification_notes: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          was_on_time: boolean | null
        }
        Insert: {
          completed_by?: string | null
          completion_date: string
          created_at?: string | null
          days_early_late?: number | null
          evidence_description?: string | null
          evidence_file_id?: string | null
          evidence_type?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          obligation_id: string
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          requires_verification?: boolean | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          was_on_time?: boolean | null
        }
        Update: {
          completed_by?: string | null
          completion_date?: string
          created_at?: string | null
          days_early_late?: number | null
          evidence_description?: string | null
          evidence_file_id?: string | null
          evidence_type?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          obligation_id?: string
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          requires_verification?: boolean | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          was_on_time?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_completions_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_dependencies: {
        Row: {
          blocked_at: string | null
          child_obligation_id: string
          created_at: string | null
          created_by: string | null
          dependency_type: string
          enterprise_id: string
          failure_action: string | null
          id: string
          is_critical: boolean | null
          lag_days: number | null
          lead_days: number | null
          notes: string | null
          overridden_by: string | null
          override_reason: string | null
          parent_obligation_id: string
          satisfied_at: string | null
          status: string | null
        }
        Insert: {
          blocked_at?: string | null
          child_obligation_id: string
          created_at?: string | null
          created_by?: string | null
          dependency_type: string
          enterprise_id: string
          failure_action?: string | null
          id?: string
          is_critical?: boolean | null
          lag_days?: number | null
          lead_days?: number | null
          notes?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          parent_obligation_id: string
          satisfied_at?: string | null
          status?: string | null
        }
        Update: {
          blocked_at?: string | null
          child_obligation_id?: string
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          enterprise_id?: string
          failure_action?: string | null
          id?: string
          is_critical?: boolean | null
          lag_days?: number | null
          lead_days?: number | null
          notes?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          parent_obligation_id?: string
          satisfied_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_dependencies_child_obligation_id_fkey"
            columns: ["child_obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_dependencies_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_dependencies_parent_obligation_id_fkey"
            columns: ["parent_obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          auto_escalate_after_hours: number | null
          auto_escalation_scheduled_at: string | null
          created_at: string | null
          enterprise_id: string
          escalated_to_role: string | null
          escalated_to_team: string | null
          escalated_to_user_id: string | null
          escalation_level: number
          escalation_type: string
          id: string
          metadata: Json | null
          next_escalation_level: number | null
          notification_channels: string[] | null
          notification_message: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          obligation_id: string
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_deadline: string | null
          status: string | null
          trigger_reason: string
          trigger_threshold: Json | null
          triggered_at: string | null
          triggered_by: string | null
          triggered_by_user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_escalate_after_hours?: number | null
          auto_escalation_scheduled_at?: string | null
          created_at?: string | null
          enterprise_id: string
          escalated_to_role?: string | null
          escalated_to_team?: string | null
          escalated_to_user_id?: string | null
          escalation_level?: number
          escalation_type: string
          id?: string
          metadata?: Json | null
          next_escalation_level?: number | null
          notification_channels?: string[] | null
          notification_message?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          obligation_id: string
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_deadline?: string | null
          status?: string | null
          trigger_reason: string
          trigger_threshold?: Json | null
          triggered_at?: string | null
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_escalate_after_hours?: number | null
          auto_escalation_scheduled_at?: string | null
          created_at?: string | null
          enterprise_id?: string
          escalated_to_role?: string | null
          escalated_to_team?: string | null
          escalated_to_user_id?: string | null
          escalation_level?: number
          escalation_type?: string
          id?: string
          metadata?: Json | null
          next_escalation_level?: number | null
          notification_channels?: string[] | null
          notification_message?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          obligation_id?: string
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_deadline?: string | null
          status?: string | null
          trigger_reason?: string
          trigger_threshold?: Json | null
          triggered_at?: string | null
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_escalations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_escalations_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_performance_tracking: {
        Row: {
          actual_completion_date: string | null
          actual_quality_score: number | null
          actual_value: number | null
          business_impact: string | null
          completion_id: string | null
          corrective_actions: Json | null
          created_at: string | null
          days_variance: number | null
          enterprise_id: string
          expected_completion_date: string
          expected_quality_score: number | null
          expected_value: number | null
          financial_impact_amount: number | null
          id: string
          obligation_id: string
          on_time_delivery: boolean | null
          overall_performance_score: number | null
          performance_issue_type: string | null
          period_end: string
          period_start: string
          quality_met: boolean | null
          quality_variance: number | null
          relationship_impact: string | null
          root_cause_notes: string | null
          updated_at: string | null
          value_met: boolean | null
          value_variance: number | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_quality_score?: number | null
          actual_value?: number | null
          business_impact?: string | null
          completion_id?: string | null
          corrective_actions?: Json | null
          created_at?: string | null
          days_variance?: number | null
          enterprise_id: string
          expected_completion_date: string
          expected_quality_score?: number | null
          expected_value?: number | null
          financial_impact_amount?: number | null
          id?: string
          obligation_id: string
          on_time_delivery?: boolean | null
          overall_performance_score?: number | null
          performance_issue_type?: string | null
          period_end: string
          period_start: string
          quality_met?: boolean | null
          quality_variance?: number | null
          relationship_impact?: string | null
          root_cause_notes?: string | null
          updated_at?: string | null
          value_met?: boolean | null
          value_variance?: number | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_quality_score?: number | null
          actual_value?: number | null
          business_impact?: string | null
          completion_id?: string | null
          corrective_actions?: Json | null
          created_at?: string | null
          days_variance?: number | null
          enterprise_id?: string
          expected_completion_date?: string
          expected_quality_score?: number | null
          expected_value?: number | null
          financial_impact_amount?: number | null
          id?: string
          obligation_id?: string
          on_time_delivery?: boolean | null
          overall_performance_score?: number | null
          performance_issue_type?: string | null
          period_end?: string
          period_start?: string
          quality_met?: boolean | null
          quality_variance?: number | null
          relationship_impact?: string | null
          root_cause_notes?: string | null
          updated_at?: string | null
          value_met?: boolean | null
          value_variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_performance_tracking_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "obligation_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_performance_tracking_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_performance_tracking_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_reminders: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          days_offset: number
          error_message: string | null
          id: string
          notification_channels: string[] | null
          obligation_id: string
          recipients: Json | null
          reminder_type: string
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          sent_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          days_offset: number
          error_message?: string | null
          id?: string
          notification_channels?: string[] | null
          obligation_id: string
          recipients?: Json | null
          reminder_type: string
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          sent_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          days_offset?: number
          error_message?: string | null
          id?: string
          notification_channels?: string[] | null
          obligation_id?: string
          recipients?: Json | null
          reminder_type?: string
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_reminders_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_risk_assessments: {
        Row: {
          assessed_by: string | null
          assessed_by_agent: string | null
          assessment_date: string | null
          assessment_type: string
          created_at: string | null
          enterprise_id: string
          financial_exposure: number | null
          id: string
          impact_score: number
          is_current: boolean | null
          likelihood_score: number
          metadata: Json | null
          mitigation_actions: Json | null
          mitigation_deadline: string | null
          mitigation_owner_id: string | null
          mitigation_status: string | null
          next_review_date: string | null
          notes: string | null
          obligation_id: string
          overall_risk_score: number | null
          potential_consequences: Json | null
          regulatory_implications: string | null
          reputational_risk: string | null
          residual_impact: number | null
          residual_likelihood: number | null
          residual_risk_score: number | null
          review_frequency: string | null
          risk_factors: Json | null
          risk_level: string | null
          superseded_by: string | null
        }
        Insert: {
          assessed_by?: string | null
          assessed_by_agent?: string | null
          assessment_date?: string | null
          assessment_type: string
          created_at?: string | null
          enterprise_id: string
          financial_exposure?: number | null
          id?: string
          impact_score: number
          is_current?: boolean | null
          likelihood_score: number
          metadata?: Json | null
          mitigation_actions?: Json | null
          mitigation_deadline?: string | null
          mitigation_owner_id?: string | null
          mitigation_status?: string | null
          next_review_date?: string | null
          notes?: string | null
          obligation_id: string
          overall_risk_score?: number | null
          potential_consequences?: Json | null
          regulatory_implications?: string | null
          reputational_risk?: string | null
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk_score?: number | null
          review_frequency?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          superseded_by?: string | null
        }
        Update: {
          assessed_by?: string | null
          assessed_by_agent?: string | null
          assessment_date?: string | null
          assessment_type?: string
          created_at?: string | null
          enterprise_id?: string
          financial_exposure?: number | null
          id?: string
          impact_score?: number
          is_current?: boolean | null
          likelihood_score?: number
          metadata?: Json | null
          mitigation_actions?: Json | null
          mitigation_deadline?: string | null
          mitigation_owner_id?: string | null
          mitigation_status?: string | null
          next_review_date?: string | null
          notes?: string | null
          obligation_id?: string
          overall_risk_score?: number | null
          potential_consequences?: Json | null
          regulatory_implications?: string | null
          reputational_risk?: string | null
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk_score?: number | null
          review_frequency?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_risk_assessments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_risk_assessments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "contract_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_risk_assessments_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "obligation_risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          document_ids: string[]
          enterprise_id: string
          errors: Json | null
          estimated_completion: string | null
          id: string
          job_name: string
          metadata: Json | null
          ocr_options: Json | null
          priority: number
          processed_documents: number
          processing_time_ms: number | null
          results: Json | null
          started_at: string | null
          status: string
          total_documents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_ids?: string[]
          enterprise_id: string
          errors?: Json | null
          estimated_completion?: string | null
          id?: string
          job_name: string
          metadata?: Json | null
          ocr_options?: Json | null
          priority?: number
          processed_documents?: number
          processing_time_ms?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_documents?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_ids?: string[]
          enterprise_id?: string
          errors?: Json | null
          estimated_completion?: string | null
          id?: string
          job_name?: string
          metadata?: Json | null
          ocr_options?: Json | null
          priority?: number
          processed_documents?: number
          processing_time_ms?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_documents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_jobs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_results: {
        Row: {
          created_at: string
          detected_language: string | null
          document_id: string
          enterprise_id: string
          error_message: string | null
          extracted_text: string | null
          has_handwriting: boolean | null
          has_signatures: boolean | null
          has_tables: boolean | null
          id: string
          ocr_engine: string | null
          ocr_job_id: string
          overall_confidence: number | null
          page_count: number | null
          processing_time_ms: number | null
          quality_score: number | null
          raw_ocr_output: Json | null
          status: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          created_at?: string
          detected_language?: string | null
          document_id: string
          enterprise_id: string
          error_message?: string | null
          extracted_text?: string | null
          has_handwriting?: boolean | null
          has_signatures?: boolean | null
          has_tables?: boolean | null
          id?: string
          ocr_engine?: string | null
          ocr_job_id: string
          overall_confidence?: number | null
          page_count?: number | null
          processing_time_ms?: number | null
          quality_score?: number | null
          raw_ocr_output?: Json | null
          status?: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          created_at?: string
          detected_language?: string | null
          document_id?: string
          enterprise_id?: string
          error_message?: string | null
          extracted_text?: string | null
          has_handwriting?: boolean | null
          has_signatures?: boolean | null
          has_tables?: boolean | null
          id?: string
          ocr_engine?: string | null
          ocr_job_id?: string
          overall_confidence?: number | null
          page_count?: number | null
          processing_time_ms?: number | null
          quality_score?: number | null
          raw_ocr_output?: Json | null
          status?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_results_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_results_ocr_job_id_fkey"
            columns: ["ocr_job_id"]
            isOneToOne: false
            referencedRelation: "ocr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token_hash: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token_hash: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          enterprise_id: string
          error_message: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          payment_method_id: string | null
          status: string
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          enterprise_id: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_method_id?: string | null
          status: string
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          enterprise_id?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_method_id?: string | null
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_bank_accounts: {
        Row: {
          account_holder_name: string | null
          account_holder_type: string | null
          account_type: string | null
          bank_name: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          last4: string
          payment_method_id: string
          routing_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_holder_type?: string | null
          account_type?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          last4: string
          payment_method_id: string
          routing_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_holder_type?: string | null
          account_type?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          last4?: string
          payment_method_id?: string
          routing_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_bank_accounts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_cards: {
        Row: {
          brand: string
          country: string | null
          created_at: string | null
          exp_month: number
          exp_year: number
          fingerprint: string | null
          funding: string | null
          id: string
          last4: string
          payment_method_id: string
          updated_at: string | null
        }
        Insert: {
          brand: string
          country?: string | null
          created_at?: string | null
          exp_month: number
          exp_year: number
          fingerprint?: string | null
          funding?: string | null
          id?: string
          last4: string
          payment_method_id: string
          updated_at?: string | null
        }
        Update: {
          brand?: string
          country?: string | null
          created_at?: string | null
          exp_month?: number
          exp_year?: number
          fingerprint?: string | null
          funding?: string | null
          id?: string
          last4?: string
          payment_method_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_cards_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          billing_details: Json | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          enterprise_id: string
          has_bank_details: boolean | null
          has_card_details: boolean | null
          id: string
          is_default: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          type: string
        }
        Insert: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          enterprise_id: string
          has_bank_details?: boolean | null
          has_card_details?: boolean | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          type: string
        }
        Update: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          enterprise_id?: string
          has_bank_details?: boolean | null
          has_card_details?: boolean | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_signatures: {
        Row: {
          appearance_stream: string | null
          byte_range: number[]
          contact_info: string | null
          created_at: string | null
          document_hash: string
          document_hash_algorithm: string
          enterprise_id: string
          filter: string
          has_visible_signature: boolean | null
          id: string
          pades_level: string
          page_number: number
          rect_ll_x: number
          rect_ll_y: number
          rect_ur_x: number
          rect_ur_y: number
          signature_certificate_id: string | null
          signature_document_id: string
          signature_location: string | null
          signature_name: string
          signature_reason: string | null
          signing_time: string
          sub_filter: string
          verification_result: Json | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          appearance_stream?: string | null
          byte_range: number[]
          contact_info?: string | null
          created_at?: string | null
          document_hash: string
          document_hash_algorithm?: string
          enterprise_id: string
          filter?: string
          has_visible_signature?: boolean | null
          id?: string
          pades_level?: string
          page_number?: number
          rect_ll_x: number
          rect_ll_y: number
          rect_ur_x: number
          rect_ur_y: number
          signature_certificate_id?: string | null
          signature_document_id: string
          signature_location?: string | null
          signature_name: string
          signature_reason?: string | null
          signing_time?: string
          sub_filter?: string
          verification_result?: Json | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          appearance_stream?: string | null
          byte_range?: number[]
          contact_info?: string | null
          created_at?: string | null
          document_hash?: string
          document_hash_algorithm?: string
          enterprise_id?: string
          filter?: string
          has_visible_signature?: boolean | null
          id?: string
          pades_level?: string
          page_number?: number
          rect_ll_x?: number
          rect_ll_y?: number
          rect_ur_x?: number
          rect_ur_y?: number
          signature_certificate_id?: string | null
          signature_document_id?: string
          signature_location?: string | null
          signature_name?: string
          signature_reason?: string | null
          signing_time?: string
          sub_filter?: string
          verification_result?: Json | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_signatures_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_signatures_signature_certificate_id_fkey"
            columns: ["signature_certificate_id"]
            isOneToOne: false
            referencedRelation: "signature_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_signatures_signature_document_id_fkey"
            columns: ["signature_document_id"]
            isOneToOne: false
            referencedRelation: "signature_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_rules: {
        Row: {
          authority_level: string | null
          clause_type: string
          common_pushback: Json | null
          created_at: string | null
          escalation_triggers: Json | null
          fallback_positions: Json | null
          guidance_notes: string | null
          id: string
          playbook_id: string
          priority: number | null
          red_lines: Json | null
          standard_clause_id: string | null
          standard_position_text: string | null
          talking_points: Json | null
          updated_at: string | null
        }
        Insert: {
          authority_level?: string | null
          clause_type: string
          common_pushback?: Json | null
          created_at?: string | null
          escalation_triggers?: Json | null
          fallback_positions?: Json | null
          guidance_notes?: string | null
          id?: string
          playbook_id: string
          priority?: number | null
          red_lines?: Json | null
          standard_clause_id?: string | null
          standard_position_text?: string | null
          talking_points?: Json | null
          updated_at?: string | null
        }
        Update: {
          authority_level?: string | null
          clause_type?: string
          common_pushback?: Json | null
          created_at?: string | null
          escalation_triggers?: Json | null
          fallback_positions?: Json | null
          guidance_notes?: string | null
          id?: string
          playbook_id?: string
          priority?: number | null
          red_lines?: Json | null
          standard_clause_id?: string | null
          standard_position_text?: string | null
          talking_points?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_rules_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "negotiation_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_rules_standard_clause_id_fkey"
            columns: ["standard_clause_id"]
            isOneToOne: false
            referencedRelation: "clause_library"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_usage: {
        Row: {
          clauses_compromised: number | null
          clauses_lost: number | null
          clauses_won: number | null
          completed_at: string | null
          contract_id: string
          created_at: string | null
          deviations: Json | null
          escalations: Json | null
          escalations_count: number | null
          id: string
          lessons_learned: string | null
          outcomes: Json | null
          overall_outcome: string | null
          playbook_id: string
          red_lines_triggered: number | null
          started_at: string | null
          total_clauses_negotiated: number | null
          updated_at: string | null
        }
        Insert: {
          clauses_compromised?: number | null
          clauses_lost?: number | null
          clauses_won?: number | null
          completed_at?: string | null
          contract_id: string
          created_at?: string | null
          deviations?: Json | null
          escalations?: Json | null
          escalations_count?: number | null
          id?: string
          lessons_learned?: string | null
          outcomes?: Json | null
          overall_outcome?: string | null
          playbook_id: string
          red_lines_triggered?: number | null
          started_at?: string | null
          total_clauses_negotiated?: number | null
          updated_at?: string | null
        }
        Update: {
          clauses_compromised?: number | null
          clauses_lost?: number | null
          clauses_won?: number | null
          completed_at?: string | null
          contract_id?: string
          created_at?: string | null
          deviations?: Json | null
          escalations?: Json | null
          escalations_count?: number | null
          id?: string
          lessons_learned?: string | null
          outcomes?: Json | null
          overall_outcome?: string | null
          playbook_id?: string
          red_lines_triggered?: number | null
          started_at?: string | null
          total_clauses_negotiated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_usage_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_usage_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_usage_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_usage_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "negotiation_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invitations: {
        Row: {
          bounce_reason: string | null
          click_count: number | null
          clicked_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          email_body: string
          email_provider: string | null
          email_subject: string
          enterprise_id: string
          external_message_id: string | null
          failure_reason: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string
          sent_at: string | null
          status: string
          template_name: string | null
          template_variables: Json | null
          token_id: string
        }
        Insert: {
          bounce_reason?: string | null
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          email_body: string
          email_provider?: string | null
          email_subject: string
          enterprise_id: string
          external_message_id?: string | null
          failure_reason?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email: string
          recipient_name: string
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_variables?: Json | null
          token_id: string
        }
        Update: {
          bounce_reason?: string | null
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          email_body?: string
          email_provider?: string | null
          email_subject?: string
          enterprise_id?: string
          external_message_id?: string | null
          failure_reason?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_variables?: Json | null
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invitations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "external_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_risk_scores: {
        Row: {
          calculation_date: string
          compliance_risk_score: number | null
          contract_risk_score: number | null
          created_at: string | null
          enterprise_id: string
          financial_risk_score: number | null
          high_risk_contracts: number | null
          high_risk_vendors: number | null
          id: string
          low_risk_contracts: number | null
          medium_risk_contracts: number | null
          metadata: Json | null
          overall_risk_score: number
          recommendations: Json | null
          risk_breakdown: Json | null
          risk_concentration: Json | null
          total_liability_exposure: number | null
          vendor_risk_score: number | null
        }
        Insert: {
          calculation_date?: string
          compliance_risk_score?: number | null
          contract_risk_score?: number | null
          created_at?: string | null
          enterprise_id: string
          financial_risk_score?: number | null
          high_risk_contracts?: number | null
          high_risk_vendors?: number | null
          id?: string
          low_risk_contracts?: number | null
          medium_risk_contracts?: number | null
          metadata?: Json | null
          overall_risk_score: number
          recommendations?: Json | null
          risk_breakdown?: Json | null
          risk_concentration?: Json | null
          total_liability_exposure?: number | null
          vendor_risk_score?: number | null
        }
        Update: {
          calculation_date?: string
          compliance_risk_score?: number | null
          contract_risk_score?: number | null
          created_at?: string | null
          enterprise_id?: string
          financial_risk_score?: number | null
          high_risk_contracts?: number | null
          high_risk_vendors?: number | null
          id?: string
          low_risk_contracts?: number | null
          medium_risk_contracts?: number | null
          metadata?: Json | null
          overall_risk_score?: number
          recommendations?: Json | null
          risk_breakdown?: Json | null
          risk_concentration?: Json | null
          total_liability_exposure?: number | null
          vendor_risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_risk_scores_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_history: {
        Row: {
          characters_typed: number | null
          client_id: string
          created_at: string | null
          duration_ms: number | null
          event_type: string
          external_party_email: string | null
          id: string
          ip_address: string | null
          operations_made: number | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          characters_typed?: number | null
          client_id: string
          created_at?: string | null
          duration_ms?: number | null
          event_type: string
          external_party_email?: string | null
          id?: string
          ip_address?: string | null
          operations_made?: number | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          characters_typed?: number | null
          client_id?: string
          created_at?: string | null
          duration_ms?: number | null
          event_type?: string
          external_party_email?: string | null
          id?: string
          ip_address?: string | null
          operations_made?: number | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_service_taxonomy: {
        Row: {
          ai_confidence: number | null
          class_code: string
          code: string
          commodity_code: string
          created_at: string | null
          description: string | null
          embedding: string | null
          family_code: string
          id: string
          industry_relevance: string[] | null
          is_active: boolean | null
          keywords: string[] | null
          level: number
          name: string
          parent_code: string | null
          segment_code: string
          source: string | null
          synonyms: string[] | null
          typical_price_range: Json | null
          typical_unit: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          ai_confidence?: number | null
          class_code: string
          code: string
          commodity_code: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          family_code: string
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          keywords?: string[] | null
          level: number
          name: string
          parent_code?: string | null
          segment_code: string
          source?: string | null
          synonyms?: string[] | null
          typical_price_range?: Json | null
          typical_unit?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          ai_confidence?: number | null
          class_code?: string
          code?: string
          commodity_code?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          family_code?: string
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          keywords?: string[] | null
          level?: number
          name?: string
          parent_code?: string | null
          segment_code?: string
          source?: string | null
          synonyms?: string[] | null
          typical_price_range?: Json | null
          typical_unit?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_service_taxonomy_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      product_specific_tariffs: {
        Row: {
          additional_rate: number
          applies_to_all_countries: boolean | null
          country_exceptions: string[] | null
          created_at: string | null
          description: string | null
          effective_date: string | null
          expiration_date: string | null
          hts_chapter: string | null
          hts_pattern: string | null
          id: string
          is_active: boolean | null
          legal_reference: string | null
          tariff_type: string
        }
        Insert: {
          additional_rate: number
          applies_to_all_countries?: boolean | null
          country_exceptions?: string[] | null
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          hts_chapter?: string | null
          hts_pattern?: string | null
          id?: string
          is_active?: boolean | null
          legal_reference?: string | null
          tariff_type: string
        }
        Update: {
          additional_rate?: number
          applies_to_all_countries?: boolean | null
          country_exceptions?: string[] | null
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          hts_chapter?: string | null
          hts_pattern?: string | null
          id?: string
          is_active?: boolean | null
          legal_reference?: string | null
          tariff_type?: string
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string
          enterprise_id: string | null
          expires_at: string
          hit_count: number
          last_accessed: string
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string
          enterprise_id?: string | null
          expires_at: string
          hit_count?: number
          last_accessed?: string
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string
          enterprise_id?: string | null
          expires_at?: string
          hit_count?: number
          last_accessed?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_cache_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
      rate_limit_rules: {
        Row: {
          burst_multiplier: number | null
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          endpoint: string | null
          enterprise_id: string | null
          id: string
          max_requests: number
          name: string
          priority: number | null
          scope: string
          strategy: string
          updated_at: string | null
          user_tier: string | null
          window_seconds: number
        }
        Insert: {
          burst_multiplier?: number | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          enterprise_id?: string | null
          id: string
          max_requests: number
          name: string
          priority?: number | null
          scope: string
          strategy: string
          updated_at?: string | null
          user_tier?: string | null
          window_seconds: number
        }
        Update: {
          burst_multiplier?: number | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          enterprise_id?: string | null
          id?: string
          max_requests?: number
          name?: string
          priority?: number | null
          scope?: string
          strategy?: string
          updated_at?: string | null
          user_tier?: string | null
          window_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
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
      redline_sessions: {
        Row: {
          accepted_changes: number | null
          allow_external_edits: boolean | null
          auto_accept_minor_changes: boolean | null
          base_version_id: string
          completed_at: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          enterprise_id: string
          external_participants: Json | null
          id: string
          name: string
          participants: Json | null
          pending_changes: number | null
          rejected_changes: number | null
          require_approval_for_changes: boolean | null
          started_at: string | null
          status: string
          total_proposed_changes: number | null
          updated_at: string | null
          working_version_id: string | null
        }
        Insert: {
          accepted_changes?: number | null
          allow_external_edits?: boolean | null
          auto_accept_minor_changes?: boolean | null
          base_version_id: string
          completed_at?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          enterprise_id: string
          external_participants?: Json | null
          id?: string
          name: string
          participants?: Json | null
          pending_changes?: number | null
          rejected_changes?: number | null
          require_approval_for_changes?: boolean | null
          started_at?: string | null
          status?: string
          total_proposed_changes?: number | null
          updated_at?: string | null
          working_version_id?: string | null
        }
        Update: {
          accepted_changes?: number | null
          allow_external_edits?: boolean | null
          auto_accept_minor_changes?: boolean | null
          base_version_id?: string
          completed_at?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          enterprise_id?: string
          external_participants?: Json | null
          id?: string
          name?: string
          participants?: Json | null
          pending_changes?: number | null
          rejected_changes?: number | null
          require_approval_for_changes?: boolean | null
          started_at?: string | null
          status?: string
          total_proposed_changes?: number | null
          updated_at?: string | null
          working_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redline_sessions_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redline_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redline_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redline_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redline_sessions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redline_sessions_working_version_id_fkey"
            columns: ["working_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_frameworks: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          documentation_url: string | null
          effective_date: string | null
          framework_type: string
          full_name: string | null
          governing_body: string | null
          id: string
          is_active: boolean | null
          jurisdiction: string[] | null
          last_updated: string | null
          name: string
          official_url: string | null
          version: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          effective_date?: string | null
          framework_type: string
          full_name?: string | null
          governing_body?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string[] | null
          last_updated?: string | null
          name: string
          official_url?: string | null
          version?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          effective_date?: string | null
          framework_type?: string
          full_name?: string | null
          governing_body?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string[] | null
          last_updated?: string | null
          name?: string
          official_url?: string | null
          version?: string | null
        }
        Relationships: []
      }
      renewal_predictions: {
        Row: {
          actual_outcome: string | null
          actual_renewal_date: string | null
          actual_renewal_value: number | null
          confidence_score: number | null
          contract_end_date: string
          contract_id: string
          created_at: string | null
          days_until_expiration: number | null
          enterprise_id: string
          factors: Json
          id: string
          model_version: string | null
          predicted_negotiation_complexity: string | null
          predicted_renewal_date: string | null
          predicted_renewal_value: number | null
          prediction_accuracy: number | null
          prediction_date: string | null
          probability_tier: string | null
          recommended_actions: Json | null
          renewal_probability: number
          updated_at: string | null
        }
        Insert: {
          actual_outcome?: string | null
          actual_renewal_date?: string | null
          actual_renewal_value?: number | null
          confidence_score?: number | null
          contract_end_date: string
          contract_id: string
          created_at?: string | null
          days_until_expiration?: number | null
          enterprise_id: string
          factors?: Json
          id?: string
          model_version?: string | null
          predicted_negotiation_complexity?: string | null
          predicted_renewal_date?: string | null
          predicted_renewal_value?: number | null
          prediction_accuracy?: number | null
          prediction_date?: string | null
          probability_tier?: string | null
          recommended_actions?: Json | null
          renewal_probability: number
          updated_at?: string | null
        }
        Update: {
          actual_outcome?: string | null
          actual_renewal_date?: string | null
          actual_renewal_value?: number | null
          confidence_score?: number | null
          contract_end_date?: string
          contract_id?: string
          created_at?: string | null
          days_until_expiration?: number | null
          enterprise_id?: string
          factors?: Json
          id?: string
          model_version?: string | null
          predicted_negotiation_complexity?: string | null
          predicted_renewal_date?: string | null
          predicted_renewal_value?: number | null
          prediction_accuracy?: number | null
          prediction_date?: string | null
          probability_tier?: string | null
          recommended_actions?: Json | null
          renewal_probability?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_predictions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_predictions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_predictions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_predictions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_bids: {
        Row: {
          attachments: Json | null
          compliance_checklist: Json | null
          compliance_score: number | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          delivery_timeline: Json | null
          evaluated_at: string | null
          evaluation: Json | null
          id: string
          payment_terms: string | null
          pricing: Json | null
          rank: number | null
          references: Json | null
          rejection_reason: string | null
          rfq_id: string
          score: number | null
          status: Database["public"]["Enums"]["bid_status"]
          submitted_at: string | null
          technical_proposal: Json | null
          total_price: number | null
          updated_at: string
          validity_days: number | null
          vendor_id: string
        }
        Insert: {
          attachments?: Json | null
          compliance_checklist?: Json | null
          compliance_score?: number | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          delivery_timeline?: Json | null
          evaluated_at?: string | null
          evaluation?: Json | null
          id?: string
          payment_terms?: string | null
          pricing?: Json | null
          rank?: number | null
          references?: Json | null
          rejection_reason?: string | null
          rfq_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string | null
          technical_proposal?: Json | null
          total_price?: number | null
          updated_at?: string
          validity_days?: number | null
          vendor_id: string
        }
        Update: {
          attachments?: Json | null
          compliance_checklist?: Json | null
          compliance_score?: number | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          delivery_timeline?: Json | null
          evaluated_at?: string | null
          evaluation?: Json | null
          id?: string
          payment_terms?: string | null
          pricing?: Json | null
          rank?: number | null
          references?: Json | null
          rejection_reason?: string | null
          rfq_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string | null
          technical_proposal?: Json | null
          total_price?: number | null
          updated_at?: string
          validity_days?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_bids_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "rfq_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "rfq_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          is_public: boolean
          question: string
          rfq_id: string
          submitted_at: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          question: string
          rfq_id: string
          submitted_at?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          question?: string
          rfq_id?: string
          submitted_at?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_questions_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_questions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "rfq_questions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_questions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "rfq_questions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_questions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          attachments: Json | null
          awarded_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_metadata: Json | null
          document_url: string | null
          enterprise_id: string
          estimated_value: number | null
          evaluation_criteria: Json
          evaluation_weights: Json
          id: string
          invited_vendor_ids: string[] | null
          published_at: string | null
          qa_deadline: string | null
          received_bid_ids: string[] | null
          requirements: Json
          response_deadline: string
          rfq_number: string
          specifications: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          title: string
          type: string
          updated_at: string
          winning_bid_id: string | null
        }
        Insert: {
          attachments?: Json | null
          awarded_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_metadata?: Json | null
          document_url?: string | null
          enterprise_id: string
          estimated_value?: number | null
          evaluation_criteria?: Json
          evaluation_weights?: Json
          id?: string
          invited_vendor_ids?: string[] | null
          published_at?: string | null
          qa_deadline?: string | null
          received_bid_ids?: string[] | null
          requirements?: Json
          response_deadline: string
          rfq_number: string
          specifications?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          title: string
          type: string
          updated_at?: string
          winning_bid_id?: string | null
        }
        Update: {
          attachments?: Json | null
          awarded_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_metadata?: Json | null
          document_url?: string | null
          enterprise_id?: string
          estimated_value?: number | null
          evaluation_criteria?: Json
          evaluation_weights?: Json
          id?: string
          invited_vendor_ids?: string[] | null
          published_at?: string | null
          qa_deadline?: string | null
          received_bid_ids?: string[] | null
          requirements?: Json
          response_deadline?: string
          rfq_number?: string
          specifications?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          title?: string
          type?: string
          updated_at?: string
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actions_triggered: Json | null
          alert_reason: string
          alert_type: string
          assessment_id: string | null
          contract_id: string
          created_at: string | null
          current_value: number | null
          enterprise_id: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          threshold_config_id: string | null
          threshold_value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions_triggered?: Json | null
          alert_reason: string
          alert_type: string
          assessment_id?: string | null
          contract_id: string
          created_at?: string | null
          current_value?: number | null
          enterprise_id: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          threshold_config_id?: string | null
          threshold_value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions_triggered?: Json | null
          alert_reason?: string
          alert_type?: string
          assessment_id?: string | null
          contract_id?: string
          created_at?: string | null
          current_value?: number | null
          enterprise_id?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          threshold_config_id?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "contract_risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_threshold_config_id_fkey"
            columns: ["threshold_config_id"]
            isOneToOne: false
            referencedRelation: "risk_threshold_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_factors: {
        Row: {
          assessment_id: string
          created_at: string | null
          evaluation_data: Json | null
          factor_id: string
          id: string
          notes: string | null
          raw_score: number
          triggered_rules: Json | null
          weighted_score: number
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          evaluation_data?: Json | null
          factor_id: string
          id?: string
          notes?: string | null
          raw_score: number
          triggered_rules?: Json | null
          weighted_score: number
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          evaluation_data?: Json | null
          factor_id?: string
          id?: string
          notes?: string | null
          raw_score?: number
          triggered_rules?: Json | null
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_factors_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "contract_risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_factors_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "risk_factor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_factor_definitions: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          enterprise_id: string
          evaluation_rules: Json
          id: string
          is_active: boolean | null
          max_score: number | null
          name: string
          thresholds: Json | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id: string
          evaluation_rules?: Json
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name: string
          thresholds?: Json | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id?: string
          evaluation_rules?: Json
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name?: string
          thresholds?: Json | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_factor_definitions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_mitigation_actions: {
        Row: {
          actual_risk_reduction: number | null
          assessment_id: string
          assigned_at: string | null
          assigned_to: string | null
          category: string
          completed_at: string | null
          completion_notes: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          enterprise_id: string
          expected_risk_reduction: number | null
          id: string
          priority: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_risk_reduction?: number | null
          assessment_id: string
          assigned_at?: string | null
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          completion_notes?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          enterprise_id: string
          expected_risk_reduction?: number | null
          id?: string
          priority: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_risk_reduction?: number | null
          assessment_id?: string
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_notes?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          enterprise_id?: string
          expected_risk_reduction?: number | null
          id?: string
          priority?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_mitigation_actions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "contract_risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_mitigation_actions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_mitigation_actions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_mitigation_actions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_mitigation_actions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_score_history: {
        Row: {
          assessment_id: string
          change_reason: string | null
          change_trigger: string | null
          contract_id: string
          id: string
          new_level: string
          new_score: number
          previous_level: string | null
          previous_score: number | null
          recorded_at: string | null
          recorded_by: string | null
        }
        Insert: {
          assessment_id: string
          change_reason?: string | null
          change_trigger?: string | null
          contract_id: string
          id?: string
          new_level: string
          new_score: number
          previous_level?: string | null
          previous_score?: number | null
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Update: {
          assessment_id?: string
          change_reason?: string | null
          change_trigger?: string | null
          contract_id?: string
          id?: string
          new_level?: string
          new_score?: number
          previous_level?: string | null
          previous_score?: number | null
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_score_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "contract_risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_score_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_score_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_score_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_threshold_configs: {
        Row: {
          actions_on_critical: Json | null
          actions_on_warning: Json | null
          category: string | null
          created_at: string | null
          created_by: string | null
          critical_threshold: number | null
          description: string | null
          enterprise_id: string
          factor_id: string | null
          id: string
          is_active: boolean | null
          name: string
          threshold_type: string
          updated_at: string | null
          warning_threshold: number | null
        }
        Insert: {
          actions_on_critical?: Json | null
          actions_on_warning?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          description?: string | null
          enterprise_id: string
          factor_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          threshold_type: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Update: {
          actions_on_critical?: Json | null
          actions_on_warning?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          description?: string | null
          enterprise_id?: string
          factor_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          threshold_type?: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_threshold_configs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_threshold_configs_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "risk_factor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          description: string | null
          enterprise_id: string
          filters: Json | null
          id: string
          is_public: boolean | null
          name: string
          query_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          query_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          query_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          created_at: string | null
          cron_expression: string
          handler_function: string
          id: string
          is_active: boolean | null
          job_name: string
          job_type: string
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          next_run_at: string | null
          parameters: Json | null
          retry_policy: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          handler_function: string
          id?: string
          is_active?: boolean | null
          job_name: string
          job_type: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          parameters?: Json | null
          retry_policy?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          handler_function?: string
          id?: string
          is_active?: boolean | null
          job_name?: string
          job_type?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          parameters?: Json | null
          retry_policy?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          cron_expression: string | null
          enterprise_id: string
          id: string
          input_data: Json | null
          interval_minutes: number | null
          is_active: boolean | null
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          schedule_type: string
          scheduled_at: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          enterprise_id: string
          id?: string
          input_data?: Json | null
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_type: string
          scheduled_at?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          enterprise_id?: string
          id?: string
          input_data?: Json | null
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_type?: string
          scheduled_at?: string | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workflows_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_action_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dimension_id: string | null
          due_date: string | null
          id: string
          metric_id: string | null
          priority: string
          scorecard_id: string
          status: string | null
          title: string
          updated_at: string | null
          vendor_contact_email: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimension_id?: string | null
          due_date?: string | null
          id?: string
          metric_id?: string | null
          priority: string
          scorecard_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          vendor_contact_email?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimension_id?: string | null
          due_date?: string | null
          id?: string
          metric_id?: string | null
          priority?: string
          scorecard_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          vendor_contact_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_action_items_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "scorecard_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_action_items_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "scorecard_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_action_items_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_dimensions: {
        Row: {
          created_at: string | null
          description: string | null
          dimension_type: string
          display_order: number | null
          id: string
          is_active: boolean | null
          max_score: number | null
          name: string
          template_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dimension_type: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name: string
          template_id: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dimension_type?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name?: string
          template_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_dimensions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_metric_values: {
        Row: {
          data_source: string | null
          entered_at: string | null
          entered_by: string | null
          evidence_documents: Json | null
          evidence_notes: string | null
          id: string
          metric_id: string
          normalized_score: number | null
          raw_value: number | null
          scorecard_id: string
          source_reference: string | null
        }
        Insert: {
          data_source?: string | null
          entered_at?: string | null
          entered_by?: string | null
          evidence_documents?: Json | null
          evidence_notes?: string | null
          id?: string
          metric_id: string
          normalized_score?: number | null
          raw_value?: number | null
          scorecard_id: string
          source_reference?: string | null
        }
        Update: {
          data_source?: string | null
          entered_at?: string | null
          entered_by?: string | null
          evidence_documents?: Json | null
          evidence_notes?: string | null
          id?: string
          metric_id?: string
          normalized_score?: number | null
          raw_value?: number | null
          scorecard_id?: string
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_metric_values_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "scorecard_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_metric_values_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_metrics: {
        Row: {
          calculation_formula: Json | null
          created_at: string | null
          data_source: string | null
          description: string | null
          dimension_id: string
          display_order: number | null
          id: string
          is_active: boolean | null
          max_score: number | null
          metric_code: string | null
          metric_type: string
          name: string
          scoring_method: string | null
          target_value: number | null
          threshold_high: number | null
          threshold_low: number | null
          unit: string | null
          weight: number | null
        }
        Insert: {
          calculation_formula?: Json | null
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          dimension_id: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          metric_code?: string | null
          metric_type: string
          name: string
          scoring_method?: string | null
          target_value?: number | null
          threshold_high?: number | null
          threshold_low?: number | null
          unit?: string | null
          weight?: number | null
        }
        Update: {
          calculation_formula?: Json | null
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          dimension_id?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          metric_code?: string | null
          metric_type?: string
          name?: string
          scoring_method?: string | null
          target_value?: number | null
          threshold_high?: number | null
          threshold_low?: number | null
          unit?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_metrics_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "scorecard_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_indexes: {
        Row: {
          content: string | null
          created_at: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          search_vector: unknown | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          enterprise_id: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          search_vector?: unknown | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          enterprise_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          search_vector?: unknown | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_indexes_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          created_at: string | null
          enterprise_id: string
          execution_time_ms: number | null
          filters: Json | null
          id: string
          query_text: string
          query_type: string | null
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          query_text: string
          query_type?: string | null
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          query_text?: string
          query_type?: string | null
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      search_suggestions: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          id: string
          suggestion_text: string
          suggestion_type: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          suggestion_text: string
          suggestion_type?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          suggestion_text?: string
          suggestion_type?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "search_suggestions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      section_301_exclusions: {
        Row: {
          created_at: string | null
          description: string | null
          exclusion_end_date: string | null
          exclusion_rate: number | null
          exclusion_start_date: string | null
          hts_code: string
          id: string
          is_active: boolean | null
          ustr_notice_number: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          exclusion_end_date?: string | null
          exclusion_rate?: number | null
          exclusion_start_date?: string | null
          hts_code: string
          id?: string
          is_active?: boolean | null
          ustr_notice_number?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          exclusion_end_date?: string | null
          exclusion_rate?: number | null
          exclusion_start_date?: string | null
          hts_code?: string
          id?: string
          is_active?: boolean | null
          ustr_notice_number?: string | null
        }
        Relationships: []
      }
      security_alert_recipients: {
        Row: {
          alert_type: string
          channel: string
          created_at: string | null
          enabled: boolean | null
          enterprise_id: string
          id: string
          recipient_type: string
          recipient_value: string
          severity_threshold: string
        }
        Insert: {
          alert_type: string
          channel: string
          created_at?: string | null
          enabled?: boolean | null
          enterprise_id: string
          id?: string
          recipient_type: string
          recipient_value: string
          severity_threshold: string
        }
        Update: {
          alert_type?: string
          channel?: string
          created_at?: string | null
          enabled?: boolean | null
          enterprise_id?: string
          id?: string
          recipient_type?: string
          recipient_value?: string
          severity_threshold?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alert_recipients_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          channels: string[]
          created_at: string | null
          event_count: number | null
          event_id: string
          id: string
          last_triggered: string | null
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          channels: string[]
          created_at?: string | null
          event_count?: number | null
          event_id: string
          id?: string
          last_triggered?: string | null
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          channels?: string[]
          created_at?: string | null
          event_count?: number | null
          event_id?: string
          id?: string
          last_triggered?: string | null
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "security_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "security_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          description: string
          endpoint: string | null
          enterprise_id: string | null
          event_type: string
          false_positive: boolean | null
          id: string
          metadata: Json | null
          request_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_ip: unknown
          title: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          endpoint?: string | null
          enterprise_id?: string | null
          event_type: string
          false_positive?: boolean | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_ip: unknown
          title: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          endpoint?: string | null
          enterprise_id?: string | null
          event_type?: string
          false_positive?: boolean | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: unknown
          title?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_metrics: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          event_type: string | null
          hour_bucket: number | null
          id: string
          metadata: Json | null
          metric_date: string
          severity: string | null
          total_events: number
          unique_ips: number
          unique_users: number
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          event_type?: string | null
          hour_bucket?: number | null
          id?: string
          metadata?: Json | null
          metric_date: string
          severity?: string | null
          total_events?: number
          unique_ips?: number
          unique_users?: number
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          event_type?: string | null
          hour_bucket?: number | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          severity?: string | null
          total_events?: number
          unique_ips?: number
          unique_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_metrics_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rules: {
        Row: {
          alert_channels: string[] | null
          created_at: string | null
          created_by: string
          description: string | null
          enabled: boolean | null
          enterprise_id: string | null
          event_types: string[]
          id: string
          name: string
          severity_threshold: string
          threshold_count: number
          time_window_minutes: number
          updated_at: string | null
        }
        Insert: {
          alert_channels?: string[] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          enabled?: boolean | null
          enterprise_id?: string | null
          event_types: string[]
          id?: string
          name: string
          severity_threshold: string
          threshold_count: number
          time_window_minutes: number
          updated_at?: string | null
        }
        Update: {
          alert_channels?: string[] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          enabled?: boolean | null
          enterprise_id?: string | null
          event_types?: string[]
          id?: string
          name?: string
          severity_threshold?: string
          threshold_count?: number
          time_window_minutes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      session_snapshots: {
        Row: {
          content_size: number | null
          created_at: string | null
          created_by: string | null
          document_html: string | null
          id: string
          last_operation_id: string | null
          operation_count: number
          participant_count: number | null
          session_id: string
          snapshot_name: string | null
          snapshot_type: string
          version_number: number
          yjs_state: string
          yjs_state_vector: string
        }
        Insert: {
          content_size?: number | null
          created_at?: string | null
          created_by?: string | null
          document_html?: string | null
          id?: string
          last_operation_id?: string | null
          operation_count: number
          participant_count?: number | null
          session_id: string
          snapshot_name?: string | null
          snapshot_type?: string
          version_number: number
          yjs_state: string
          yjs_state_vector: string
        }
        Update: {
          content_size?: number | null
          created_at?: string | null
          created_by?: string | null
          document_html?: string | null
          id?: string
          last_operation_id?: string | null
          operation_count?: number
          participant_count?: number | null
          session_id?: string
          snapshot_name?: string | null
          snapshot_type?: string
          version_number?: number
          yjs_state?: string
          yjs_state_vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_snapshots_last_operation_id_fkey"
            columns: ["last_operation_id"]
            isOneToOne: false
            referencedRelation: "document_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
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
      signature_certificates: {
        Row: {
          certificate_chain: Json | null
          certificate_fingerprint: string
          certificate_id: string | null
          certificate_serial: number
          certificate_subject_dn: Json
          certificate_valid_at_signing: boolean
          cms_signed_data: string | null
          created_at: string | null
          crl_snapshot: string | null
          id: string
          ocsp_response: string | null
          signatory_id: string | null
          signature_algorithm: string
          signature_event_id: string
          signature_value: string
          signed_data_hash: string
          signed_data_hash_algorithm: string
          timestamp_token_id: string | null
        }
        Insert: {
          certificate_chain?: Json | null
          certificate_fingerprint: string
          certificate_id?: string | null
          certificate_serial: number
          certificate_subject_dn: Json
          certificate_valid_at_signing?: boolean
          cms_signed_data?: string | null
          created_at?: string | null
          crl_snapshot?: string | null
          id?: string
          ocsp_response?: string | null
          signatory_id?: string | null
          signature_algorithm?: string
          signature_event_id: string
          signature_value: string
          signed_data_hash: string
          signed_data_hash_algorithm?: string
          timestamp_token_id?: string | null
        }
        Update: {
          certificate_chain?: Json | null
          certificate_fingerprint?: string
          certificate_id?: string | null
          certificate_serial?: number
          certificate_subject_dn?: Json
          certificate_valid_at_signing?: boolean
          cms_signed_data?: string | null
          created_at?: string | null
          crl_snapshot?: string | null
          id?: string
          ocsp_response?: string | null
          signatory_id?: string | null
          signature_algorithm?: string
          signature_event_id?: string
          signature_value?: string
          signed_data_hash?: string
          signed_data_hash_algorithm?: string
          timestamp_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_certificates_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_certificates_signatory_id_fkey"
            columns: ["signatory_id"]
            isOneToOne: false
            referencedRelation: "signature_signatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_certificates_signature_event_id_fkey"
            columns: ["signature_event_id"]
            isOneToOne: false
            referencedRelation: "signature_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_certificates_timestamp_token_id_fkey"
            columns: ["timestamp_token_id"]
            isOneToOne: false
            referencedRelation: "timestamp_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_documents: {
        Row: {
          created_at: string | null
          document_order: number | null
          document_version_id: string | null
          external_document_id: string | null
          file_hash: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          metadata: Json | null
          name: string
          signature_request_id: string
          signed_file_hash: string | null
          signed_file_path: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          document_order?: number | null
          document_version_id?: string | null
          external_document_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          name: string
          signature_request_id: string
          signed_file_hash?: string | null
          signed_file_path?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          document_order?: number | null
          document_version_id?: string | null
          external_document_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          signature_request_id?: string
          signed_file_hash?: string | null
          signed_file_path?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_documents_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_documents_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_message: string | null
          event_type: string
          external_event_id: string | null
          id: string
          ip_address: string | null
          location: Json | null
          provider_event_type: string | null
          provider_timestamp: string | null
          raw_event_data: Json | null
          signatory_id: string | null
          signature_request_id: string
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_message?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          ip_address?: string | null
          location?: Json | null
          provider_event_type?: string | null
          provider_timestamp?: string | null
          raw_event_data?: Json | null
          signatory_id?: string | null
          signature_request_id: string
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_message?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          ip_address?: string | null
          location?: Json | null
          provider_event_type?: string | null
          provider_timestamp?: string | null
          raw_event_data?: Json | null
          signatory_id?: string | null
          signature_request_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_signatory_id_fkey"
            columns: ["signatory_id"]
            isOneToOne: false
            referencedRelation: "signature_signatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_fields: {
        Row: {
          anchor_string: string | null
          anchor_x_offset: number | null
          anchor_y_offset: number | null
          created_at: string | null
          default_value: string | null
          external_field_id: string | null
          external_tab_label: string | null
          field_name: string | null
          field_type: string
          height: number | null
          id: string
          is_required: boolean | null
          metadata: Json | null
          options: Json | null
          page_number: number
          signatory_id: string
          signature_document_id: string
          validation_pattern: string | null
          width: number | null
          x_position: number
          y_position: number
        }
        Insert: {
          anchor_string?: string | null
          anchor_x_offset?: number | null
          anchor_y_offset?: number | null
          created_at?: string | null
          default_value?: string | null
          external_field_id?: string | null
          external_tab_label?: string | null
          field_name?: string | null
          field_type: string
          height?: number | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json | null
          page_number?: number
          signatory_id: string
          signature_document_id: string
          validation_pattern?: string | null
          width?: number | null
          x_position: number
          y_position: number
        }
        Update: {
          anchor_string?: string | null
          anchor_x_offset?: number | null
          anchor_y_offset?: number | null
          created_at?: string | null
          default_value?: string | null
          external_field_id?: string | null
          external_tab_label?: string | null
          field_name?: string | null
          field_type?: string
          height?: number | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json | null
          page_number?: number
          signatory_id?: string
          signature_document_id?: string
          validation_pattern?: string | null
          width?: number | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "signature_fields_signatory_id_fkey"
            columns: ["signatory_id"]
            isOneToOne: false
            referencedRelation: "signature_signatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_fields_signature_document_id_fkey"
            columns: ["signature_document_id"]
            isOneToOne: false
            referencedRelation: "signature_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_provider_configs: {
        Row: {
          account_id: string | null
          api_endpoint: string | null
          api_key_encrypted: string | null
          api_version: string | null
          branding_config: Json | null
          created_at: string | null
          created_by: string | null
          display_name: string
          enterprise_id: string
          id: string
          integration_key: string | null
          is_active: boolean | null
          is_default: boolean | null
          last_verified_at: string | null
          oauth_config: Json | null
          provider: string
          settings: Json | null
          updated_at: string | null
          verification_status: string | null
          webhook_events: string[] | null
          webhook_secret_encrypted: string | null
          webhook_url: string | null
        }
        Insert: {
          account_id?: string | null
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          api_version?: string | null
          branding_config?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_name: string
          enterprise_id: string
          id?: string
          integration_key?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_verified_at?: string | null
          oauth_config?: Json | null
          provider: string
          settings?: Json | null
          updated_at?: string | null
          verification_status?: string | null
          webhook_events?: string[] | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Update: {
          account_id?: string | null
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          api_version?: string | null
          branding_config?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          enterprise_id?: string
          id?: string
          integration_key?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_verified_at?: string | null
          oauth_config?: Json | null
          provider?: string
          settings?: Json | null
          updated_at?: string | null
          verification_status?: string | null
          webhook_events?: string[] | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_provider_configs_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          access_code: string | null
          audit_trail_url: string | null
          certificate_url: string | null
          completed_at: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          current_signer_order: number | null
          declined_at: string | null
          email_body: string | null
          email_subject: string | null
          enterprise_id: string
          expires_at: string | null
          external_envelope_id: string | null
          external_request_id: string | null
          external_url: string | null
          id: string
          last_reminder_sent_at: string | null
          message: string | null
          metadata: Json | null
          provider_config_id: string | null
          provider_metadata: Json | null
          reminder_frequency_days: number | null
          reminders_sent: number | null
          require_id_verification: boolean | null
          require_sms_auth: boolean | null
          sent_at: string | null
          sent_by: string | null
          signed_document_url: string | null
          signing_order: string | null
          status: string
          status_reason: string | null
          title: string
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          access_code?: string | null
          audit_trail_url?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          current_signer_order?: number | null
          declined_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          enterprise_id: string
          expires_at?: string | null
          external_envelope_id?: string | null
          external_request_id?: string | null
          external_url?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          metadata?: Json | null
          provider_config_id?: string | null
          provider_metadata?: Json | null
          reminder_frequency_days?: number | null
          reminders_sent?: number | null
          require_id_verification?: boolean | null
          require_sms_auth?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          signed_document_url?: string | null
          signing_order?: string | null
          status?: string
          status_reason?: string | null
          title: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          access_code?: string | null
          audit_trail_url?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          current_signer_order?: number | null
          declined_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          enterprise_id?: string
          expires_at?: string | null
          external_envelope_id?: string | null
          external_request_id?: string | null
          external_url?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          metadata?: Json | null
          provider_config_id?: string | null
          provider_metadata?: Json | null
          reminder_frequency_days?: number | null
          reminders_sent?: number | null
          require_id_verification?: boolean | null
          require_sms_auth?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          signed_document_url?: string | null
          signing_order?: string | null
          status?: string
          status_reason?: string | null
          title?: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "signature_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_signatories: {
        Row: {
          authentication_method: string | null
          company: string | null
          contact_id: string | null
          created_at: string | null
          decline_reason: string | null
          declined_at: string | null
          delivered_at: string | null
          email: string
          external_recipient_id: string | null
          external_routing_order: number | null
          id: string
          id_verification_status: string | null
          ip_address: string | null
          metadata: Json | null
          name: string
          phone: string | null
          role_name: string
          signatory_type: string
          signature_image_url: string | null
          signature_request_id: string
          signed_at: string | null
          signing_order: number | null
          status: string
          status_reason: string | null
          title: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          vendor_id: string | null
          viewed_at: string | null
        }
        Insert: {
          authentication_method?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          delivered_at?: string | null
          email: string
          external_recipient_id?: string | null
          external_routing_order?: number | null
          id?: string
          id_verification_status?: string | null
          ip_address?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          role_name: string
          signatory_type: string
          signature_image_url?: string | null
          signature_request_id: string
          signed_at?: string | null
          signing_order?: number | null
          status?: string
          status_reason?: string | null
          title?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          authentication_method?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          delivered_at?: string | null
          email?: string
          external_recipient_id?: string | null
          external_routing_order?: number | null
          id?: string
          id_verification_status?: string | null
          ip_address?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          role_name?: string
          signatory_type?: string
          signature_image_url?: string | null
          signature_request_id?: string
          signed_at?: string | null
          signing_order?: number | null
          status?: string
          status_reason?: string | null
          title?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_signatories_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_signatories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "signature_signatories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_signatories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "signature_signatories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_signatories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_requests: {
        Row: {
          budget_currency: string | null
          budget_max: number | null
          category: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          discovered_supplier_count: number | null
          enterprise_id: string
          id: string
          preferred_vendor_ids: string[] | null
          qualified_supplier_count: number | null
          quantity: number
          recommendations: Json | null
          required_by: string | null
          rfq_id: string | null
          specifications: string
          status: Database["public"]["Enums"]["sourcing_status"]
          title: string
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          budget_currency?: string | null
          budget_max?: number | null
          category: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discovered_supplier_count?: number | null
          enterprise_id: string
          id?: string
          preferred_vendor_ids?: string[] | null
          qualified_supplier_count?: number | null
          quantity: number
          recommendations?: Json | null
          required_by?: string | null
          rfq_id?: string | null
          specifications: string
          status?: Database["public"]["Enums"]["sourcing_status"]
          title: string
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          budget_currency?: string | null
          budget_max?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discovered_supplier_count?: number | null
          enterprise_id?: string
          id?: string
          preferred_vendor_ids?: string[] | null
          qualified_supplier_count?: number | null
          quantity?: number
          recommendations?: Json | null
          required_by?: string | null
          rfq_id?: string | null
          specifications?: string
          status?: Database["public"]["Enums"]["sourcing_status"]
          title?: string
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_requests_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_requests_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_aggregations: {
        Row: {
          aggregation_period: string
          aggregation_type: string
          budget_allocated: number | null
          budget_utilization: number | null
          budget_variance: number | null
          category_id: string | null
          computed_at: string | null
          contract_id: string | null
          department: string | null
          enterprise_id: string
          id: string
          period_end: string | null
          period_over_period_change: number | null
          period_start: string | null
          previous_period_spend: number | null
          spend_by_currency: Json | null
          spend_by_type: Json | null
          total_spend: number
          total_spend_usd: number | null
          transaction_count: number | null
          vendor_id: string | null
        }
        Insert: {
          aggregation_period: string
          aggregation_type: string
          budget_allocated?: number | null
          budget_utilization?: number | null
          budget_variance?: number | null
          category_id?: string | null
          computed_at?: string | null
          contract_id?: string | null
          department?: string | null
          enterprise_id: string
          id?: string
          period_end?: string | null
          period_over_period_change?: number | null
          period_start?: string | null
          previous_period_spend?: number | null
          spend_by_currency?: Json | null
          spend_by_type?: Json | null
          total_spend?: number
          total_spend_usd?: number | null
          transaction_count?: number | null
          vendor_id?: string | null
        }
        Update: {
          aggregation_period?: string
          aggregation_type?: string
          budget_allocated?: number | null
          budget_utilization?: number | null
          budget_variance?: number | null
          category_id?: string | null
          computed_at?: string | null
          contract_id?: string | null
          department?: string | null
          enterprise_id?: string
          id?: string
          period_end?: string | null
          period_over_period_change?: number | null
          period_start?: string | null
          previous_period_spend?: number | null
          spend_by_currency?: Json | null
          spend_by_type?: Json | null
          total_spend?: number
          total_spend_usd?: number | null
          transaction_count?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_aggregations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_aggregations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_aggregations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_aggregations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_categories: {
        Row: {
          annual_budget: number | null
          budget_currency: string | null
          category_type: string
          code: string | null
          cost_center: string | null
          created_at: string | null
          description: string | null
          enterprise_id: string
          gl_account_code: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          parent_category_id: string | null
          path: string[] | null
          updated_at: string | null
        }
        Insert: {
          annual_budget?: number | null
          budget_currency?: string | null
          category_type: string
          code?: string | null
          cost_center?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          gl_account_code?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          parent_category_id?: string | null
          path?: string[] | null
          updated_at?: string | null
        }
        Update: {
          annual_budget?: number | null
          budget_currency?: string | null
          category_type?: string
          code?: string | null
          cost_center?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          gl_account_code?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          parent_category_id?: string | null
          path?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_categories_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_records: {
        Row: {
          amount: number
          amount_usd: number | null
          category_id: string | null
          contract_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          enterprise_id: string
          exchange_rate: number | null
          fiscal_month: number | null
          fiscal_quarter: number | null
          fiscal_year: number | null
          id: string
          invoice_id: string | null
          line_items: Json | null
          po_number: string | null
          recorded_by: string | null
          spend_date: string
          spend_type: string
          status: string | null
          updated_at: string | null
          vendor_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          amount_usd?: number | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          enterprise_id: string
          exchange_rate?: number | null
          fiscal_month?: number | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          invoice_id?: string | null
          line_items?: Json | null
          po_number?: string | null
          recorded_by?: string | null
          spend_date: string
          spend_type: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          enterprise_id?: string
          exchange_rate?: number | null
          fiscal_month?: number | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          invoice_id?: string | null
          line_items?: Json | null
          po_number?: string | null
          recorded_by?: string | null
          spend_date?: string
          spend_type?: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_savings: {
        Row: {
          actual_amount: number
          approved_at: string | null
          approved_by: string | null
          baseline_amount: number
          category_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          enterprise_id: string
          evidence_documents: Json | null
          fiscal_year: number | null
          id: string
          is_hard_savings: boolean | null
          savings_amount: number | null
          savings_date: string
          savings_percentage: number | null
          savings_status: string | null
          savings_type: string
          vendor_id: string | null
        }
        Insert: {
          actual_amount: number
          approved_at?: string | null
          approved_by?: string | null
          baseline_amount: number
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          enterprise_id: string
          evidence_documents?: Json | null
          fiscal_year?: number | null
          id?: string
          is_hard_savings?: boolean | null
          savings_amount?: number | null
          savings_date: string
          savings_percentage?: number | null
          savings_status?: string | null
          savings_type: string
          vendor_id?: string | null
        }
        Update: {
          actual_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          baseline_amount?: number
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          enterprise_id?: string
          evidence_documents?: Json | null
          fiscal_year?: number | null
          id?: string
          is_hard_savings?: boolean | null
          savings_amount?: number | null
          savings_date?: string
          savings_percentage?: number | null
          savings_status?: string | null
          savings_type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_savings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_savings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_savings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_savings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          delinquent: boolean | null
          description: string | null
          email: string
          enterprise_id: string
          id: string
          metadata: Json | null
          name: string | null
          stripe_customer_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          delinquent?: boolean | null
          description?: string | null
          email: string
          enterprise_id: string
          id?: string
          metadata?: Json | null
          name?: string | null
          stripe_customer_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          delinquent?: boolean | null
          description?: string | null
          email?: string
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          stripe_customer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string | null
          description: string | null
          display_name: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          price_amount: number
          price_currency: string | null
          stripe_price_id: string
          stripe_product_id: string
          tier: string | null
          trial_period_days: number | null
          updated_at: string | null
        }
        Insert: {
          billing_interval: string
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          price_amount: number
          price_currency?: string | null
          stripe_price_id: string
          stripe_product_id: string
          tier?: string | null
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_interval?: string
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          price_amount?: number
          price_currency?: string | null
          stripe_price_id?: string
          stripe_product_id?: string
          tier?: string | null
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          enterprise_id: string
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          enterprise_id: string
          id?: string
          metadata?: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_type: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_type: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_metrics: {
        Row: {
          component: string | null
          id: string
          is_healthy: boolean | null
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
          threshold_critical: number | null
          threshold_warning: number | null
        }
        Insert: {
          component?: string | null
          id?: string
          is_healthy?: boolean | null
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
          threshold_critical?: number | null
          threshold_warning?: number | null
        }
        Update: {
          component?: string | null
          id?: string
          is_healthy?: boolean | null
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
          threshold_critical?: number | null
          threshold_warning?: number | null
        }
        Relationships: []
      }
      tariff_rate_changes: {
        Row: {
          affected_entity: string
          change_description: string | null
          change_type: string
          created_at: string | null
          effective_date: string | null
          id: string
          new_rate: number | null
          old_rate: number | null
        }
        Insert: {
          affected_entity: string
          change_description?: string | null
          change_type: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_rate?: number | null
          old_rate?: number | null
        }
        Update: {
          affected_entity?: string
          change_description?: string | null
          change_type?: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_rate?: number | null
          old_rate?: number | null
        }
        Relationships: []
      }
      taxonomy_aliases: {
        Row: {
          alias_description: string | null
          alias_name: string
          confidence: number | null
          created_at: string | null
          enterprise_id: string
          id: string
          last_used_at: string | null
          source: string | null
          taxonomy_code: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          alias_description?: string | null
          alias_name: string
          confidence?: number | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          last_used_at?: string | null
          source?: string | null
          taxonomy_code: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          alias_description?: string | null
          alias_name?: string
          confidence?: number | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          last_used_at?: string | null
          source?: string | null
          taxonomy_code?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_aliases_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_aliases_taxonomy_code_fkey"
            columns: ["taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      taxonomy_review_queue: {
        Row: {
          assigned_to: string | null
          best_confidence: number | null
          contract_id: string | null
          created_at: string | null
          due_date: string | null
          enterprise_id: string
          id: string
          item_description: string | null
          item_name: string
          line_item_id: string | null
          new_code_request_status: string | null
          priority: number | null
          raw_text: string | null
          requested_new_code_description: string | null
          requested_new_code_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selected_taxonomy_code: string | null
          status: string | null
          suggested_taxonomy_codes: Json
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          best_confidence?: number | null
          contract_id?: string | null
          created_at?: string | null
          due_date?: string | null
          enterprise_id: string
          id?: string
          item_description?: string | null
          item_name: string
          line_item_id?: string | null
          new_code_request_status?: string | null
          priority?: number | null
          raw_text?: string | null
          requested_new_code_description?: string | null
          requested_new_code_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selected_taxonomy_code?: string | null
          status?: string | null
          suggested_taxonomy_codes?: Json
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          best_confidence?: number | null
          contract_id?: string | null
          created_at?: string | null
          due_date?: string | null
          enterprise_id?: string
          id?: string
          item_description?: string | null
          item_name?: string
          line_item_id?: string | null
          new_code_request_status?: string | null
          priority?: number | null
          raw_text?: string | null
          requested_new_code_description?: string | null
          requested_new_code_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selected_taxonomy_code?: string | null
          status?: string | null
          suggested_taxonomy_codes?: Json
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_review_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "contract_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_review_queue_selected_taxonomy_code_fkey"
            columns: ["selected_taxonomy_code"]
            isOneToOne: false
            referencedRelation: "product_service_taxonomy"
            referencedColumns: ["code"]
          },
        ]
      }
      template_clause_mappings: {
        Row: {
          allow_alternatives: boolean | null
          clause_id: string
          condition_expression: Json | null
          created_at: string | null
          default_alternative_id: string | null
          id: string
          is_conditional: boolean | null
          is_editable: boolean | null
          is_required: boolean | null
          metadata: Json | null
          notes: string | null
          override_content: string | null
          override_content_html: string | null
          section_id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          allow_alternatives?: boolean | null
          clause_id: string
          condition_expression?: Json | null
          created_at?: string | null
          default_alternative_id?: string | null
          id?: string
          is_conditional?: boolean | null
          is_editable?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          notes?: string | null
          override_content?: string | null
          override_content_html?: string | null
          section_id: string
          sort_order?: number
          template_id: string
        }
        Update: {
          allow_alternatives?: boolean | null
          clause_id?: string
          condition_expression?: Json | null
          created_at?: string | null
          default_alternative_id?: string | null
          id?: string
          is_conditional?: boolean | null
          is_editable?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          notes?: string | null
          override_content?: string | null
          override_content_html?: string | null
          section_id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_clause_mappings_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clause_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clause_mappings_default_alternative_id_fkey"
            columns: ["default_alternative_id"]
            isOneToOne: false
            referencedRelation: "clause_alternatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clause_mappings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clause_mappings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_inheritance: {
        Row: {
          child_template_id: string
          created_at: string | null
          id: string
          inherit_header_footer: boolean | null
          inherit_sections: boolean | null
          inherit_variables: boolean | null
          parent_template_id: string
          section_overrides: Json | null
          variable_overrides: Json | null
        }
        Insert: {
          child_template_id: string
          created_at?: string | null
          id?: string
          inherit_header_footer?: boolean | null
          inherit_sections?: boolean | null
          inherit_variables?: boolean | null
          parent_template_id: string
          section_overrides?: Json | null
          variable_overrides?: Json | null
        }
        Update: {
          child_template_id?: string
          created_at?: string | null
          id?: string
          inherit_header_footer?: boolean | null
          inherit_sections?: boolean | null
          inherit_variables?: boolean | null
          parent_template_id?: string
          section_overrides?: Json | null
          variable_overrides?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "template_inheritance_child_template_id_fkey"
            columns: ["child_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_inheritance_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          condition_expression: Json | null
          created_at: string | null
          depth: number | null
          id: string
          intro_content: string | null
          intro_content_html: string | null
          is_conditional: boolean | null
          is_editable: boolean | null
          is_required: boolean | null
          metadata: Json | null
          name: string
          numbering_style: string | null
          outro_content: string | null
          outro_content_html: string | null
          page_break_before: boolean | null
          parent_section_id: string | null
          section_number: string | null
          sort_order: number
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          condition_expression?: Json | null
          created_at?: string | null
          depth?: number | null
          id?: string
          intro_content?: string | null
          intro_content_html?: string | null
          is_conditional?: boolean | null
          is_editable?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          name: string
          numbering_style?: string | null
          outro_content?: string | null
          outro_content_html?: string | null
          page_break_before?: boolean | null
          parent_section_id?: string | null
          section_number?: string | null
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          condition_expression?: Json | null
          created_at?: string | null
          depth?: number | null
          id?: string
          intro_content?: string | null
          intro_content_html?: string | null
          is_conditional?: boolean | null
          is_editable?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          name?: string
          numbering_style?: string | null
          outro_content?: string | null
          outro_content_html?: string | null
          page_break_before?: boolean | null
          parent_section_id?: string | null
          section_number?: string | null
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_analytics: {
        Row: {
          avg_approval_time_hours: number | null
          avg_completion_time_hours: number | null
          avg_contract_value: number | null
          avg_execution_time_hours: number | null
          clauses_modified_count: number | null
          contracts_abandoned: number | null
          contracts_created: number | null
          contracts_executed: number | null
          created_at: string | null
          enterprise_id: string
          id: string
          most_common_modifications: Json | null
          period_end: string
          period_start: string
          period_type: string
          sections_modified_count: number | null
          template_id: string
          total_contract_value: number | null
          unique_users: number | null
          variables_overridden_count: number | null
        }
        Insert: {
          avg_approval_time_hours?: number | null
          avg_completion_time_hours?: number | null
          avg_contract_value?: number | null
          avg_execution_time_hours?: number | null
          clauses_modified_count?: number | null
          contracts_abandoned?: number | null
          contracts_created?: number | null
          contracts_executed?: number | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          most_common_modifications?: Json | null
          period_end: string
          period_start: string
          period_type: string
          sections_modified_count?: number | null
          template_id: string
          total_contract_value?: number | null
          unique_users?: number | null
          variables_overridden_count?: number | null
        }
        Update: {
          avg_approval_time_hours?: number | null
          avg_completion_time_hours?: number | null
          avg_contract_value?: number | null
          avg_execution_time_hours?: number | null
          clauses_modified_count?: number | null
          contracts_abandoned?: number | null
          contracts_created?: number | null
          contracts_executed?: number | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          most_common_modifications?: Json | null
          period_end?: string
          period_start?: string
          period_type?: string
          sections_modified_count?: number | null
          template_id?: string
          total_contract_value?: number | null
          unique_users?: number | null
          variables_overridden_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_analytics_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_variables: {
        Row: {
          created_at: string | null
          default_expression: string | null
          default_value: string | null
          description: string | null
          display_format: string | null
          display_name: string
          format_pattern: string | null
          group_name: string | null
          help_text: string | null
          id: string
          is_required: boolean | null
          is_system: boolean | null
          metadata: Json | null
          options: Json | null
          placeholder: string | null
          sort_order: number | null
          template_id: string
          validation_rules: Json | null
          variable_name: string
          variable_type: string
        }
        Insert: {
          created_at?: string | null
          default_expression?: string | null
          default_value?: string | null
          description?: string | null
          display_format?: string | null
          display_name: string
          format_pattern?: string | null
          group_name?: string | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          template_id: string
          validation_rules?: Json | null
          variable_name: string
          variable_type: string
        }
        Update: {
          created_at?: string | null
          default_expression?: string | null
          default_value?: string | null
          description?: string | null
          display_format?: string | null
          display_name?: string
          format_pattern?: string | null
          group_name?: string | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          template_id?: string
          validation_rules?: Json | null
          variable_name?: string
          variable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_variables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_summary: string | null
          change_type: string | null
          clause_mappings_snapshot: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          footer_content: string | null
          header_content: string | null
          id: string
          is_current: boolean | null
          name: string
          sections_snapshot: Json
          signature_block_template: string | null
          template_id: string
          template_type: string
          variables_snapshot: Json
          version_label: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string | null
          change_type?: string | null
          clause_mappings_snapshot?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_current?: boolean | null
          name: string
          sections_snapshot?: Json
          signature_block_template?: string | null
          template_id: string
          template_type: string
          variables_snapshot?: Json
          version_label?: string | null
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string | null
          change_type?: string | null
          clause_mappings_snapshot?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_current?: boolean | null
          name?: string
          sections_snapshot?: Json
          signature_block_template?: string | null
          template_id?: string
          template_type?: string
          variables_snapshot?: Json
          version_label?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      temporal_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_user_id: string | null
          action_deadline: string | null
          alert_trigger_time: string | null
          alert_type: string
          auto_dismiss_at: string | null
          auto_dismiss_reason: string | null
          created_at: string | null
          description: string
          enterprise_id: string
          estimated_time_impact: unknown | null
          estimated_value_impact: number | null
          id: string
          impact_probability: number | null
          metadata: Json | null
          predicted_impact_date: string | null
          recommended_actions: Json | null
          related_budget_id: string | null
          related_contract_id: string | null
          related_pattern_id: string | null
          related_prediction_id: string | null
          related_vendor_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          severity: string
          status: string
          time_to_impact: unknown | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_user_id?: string | null
          action_deadline?: string | null
          alert_trigger_time?: string | null
          alert_type: string
          auto_dismiss_at?: string | null
          auto_dismiss_reason?: string | null
          created_at?: string | null
          description: string
          enterprise_id: string
          estimated_time_impact?: unknown | null
          estimated_value_impact?: number | null
          id?: string
          impact_probability?: number | null
          metadata?: Json | null
          predicted_impact_date?: string | null
          recommended_actions?: Json | null
          related_budget_id?: string | null
          related_contract_id?: string | null
          related_pattern_id?: string | null
          related_prediction_id?: string | null
          related_vendor_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity: string
          status?: string
          time_to_impact?: unknown | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_user_id?: string | null
          action_deadline?: string | null
          alert_trigger_time?: string | null
          alert_type?: string
          auto_dismiss_at?: string | null
          auto_dismiss_reason?: string | null
          created_at?: string | null
          description?: string
          enterprise_id?: string
          estimated_time_impact?: unknown | null
          estimated_value_impact?: number | null
          id?: string
          impact_probability?: number | null
          metadata?: Json | null
          predicted_impact_date?: string | null
          recommended_actions?: Json | null
          related_budget_id?: string | null
          related_contract_id?: string | null
          related_pattern_id?: string | null
          related_prediction_id?: string | null
          related_vendor_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string
          status?: string
          time_to_impact?: unknown | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temporal_alerts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_budget_id_fkey"
            columns: ["related_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_pattern_id_fkey"
            columns: ["related_pattern_id"]
            isOneToOne: false
            referencedRelation: "temporal_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_prediction_id_fkey"
            columns: ["related_prediction_id"]
            isOneToOne: false
            referencedRelation: "renewal_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporal_alerts_related_vendor_id_fkey"
            columns: ["related_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      temporal_metrics: {
        Row: {
          avg_value: number | null
          bucket_type: string
          count: number | null
          created_at: string | null
          enterprise_id: string
          id: string
          is_seasonal_peak: boolean | null
          max_value: number | null
          metadata: Json | null
          metric_category: string
          metric_name: string
          min_value: number | null
          period_over_period_change: number | null
          previous_period_value: number | null
          seasonal_index: number | null
          stddev_value: number | null
          sum_value: number | null
          time_bucket: string
          trend_direction: string | null
          trend_strength: number | null
          value: number
          year_over_year_change: number | null
        }
        Insert: {
          avg_value?: number | null
          bucket_type: string
          count?: number | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          is_seasonal_peak?: boolean | null
          max_value?: number | null
          metadata?: Json | null
          metric_category: string
          metric_name: string
          min_value?: number | null
          period_over_period_change?: number | null
          previous_period_value?: number | null
          seasonal_index?: number | null
          stddev_value?: number | null
          sum_value?: number | null
          time_bucket: string
          trend_direction?: string | null
          trend_strength?: number | null
          value: number
          year_over_year_change?: number | null
        }
        Update: {
          avg_value?: number | null
          bucket_type?: string
          count?: number | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          is_seasonal_peak?: boolean | null
          max_value?: number | null
          metadata?: Json | null
          metric_category?: string
          metric_name?: string
          min_value?: number | null
          period_over_period_change?: number | null
          previous_period_value?: number | null
          seasonal_index?: number | null
          stddev_value?: number | null
          sum_value?: number | null
          time_bucket?: string
          trend_direction?: string | null
          trend_strength?: number | null
          value?: number
          year_over_year_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "temporal_metrics_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      temporal_patterns: {
        Row: {
          amplitude: number | null
          anomaly_severity: number | null
          anomaly_type: string | null
          anomaly_z_score: number | null
          confidence_score: number | null
          correlated_metric_category: string | null
          correlated_metric_name: string | null
          correlation_coefficient: number | null
          correlation_lag: unknown | null
          created_at: string | null
          detected_at: string | null
          enterprise_id: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_observed: string | null
          metadata: Json | null
          metric_category: string
          metric_name: string
          pattern_description: string | null
          pattern_name: string
          pattern_type: string
          period_length: unknown | null
          period_unit: string | null
          phase_shift: number | null
          r_squared: number | null
          sample_count: number | null
          trend_direction: string | null
          trend_intercept: number | null
          trend_slope: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          amplitude?: number | null
          anomaly_severity?: number | null
          anomaly_type?: string | null
          anomaly_z_score?: number | null
          confidence_score?: number | null
          correlated_metric_category?: string | null
          correlated_metric_name?: string | null
          correlation_coefficient?: number | null
          correlation_lag?: unknown | null
          created_at?: string | null
          detected_at?: string | null
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_observed?: string | null
          metadata?: Json | null
          metric_category: string
          metric_name: string
          pattern_description?: string | null
          pattern_name: string
          pattern_type: string
          period_length?: unknown | null
          period_unit?: string | null
          phase_shift?: number | null
          r_squared?: number | null
          sample_count?: number | null
          trend_direction?: string | null
          trend_intercept?: number | null
          trend_slope?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          amplitude?: number | null
          anomaly_severity?: number | null
          anomaly_type?: string | null
          anomaly_z_score?: number | null
          confidence_score?: number | null
          correlated_metric_category?: string | null
          correlated_metric_name?: string | null
          correlation_coefficient?: number | null
          correlation_lag?: unknown | null
          created_at?: string | null
          detected_at?: string | null
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_observed?: string | null
          metadata?: Json | null
          metric_category?: string
          metric_name?: string
          pattern_description?: string | null
          pattern_name?: string
          pattern_type?: string
          period_length?: unknown | null
          period_unit?: string | null
          phase_shift?: number | null
          r_squared?: number | null
          sample_count?: number | null
          trend_direction?: string | null
          trend_intercept?: number | null
          trend_slope?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temporal_patterns_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      timestamp_tokens: {
        Row: {
          accuracy_micros: number | null
          accuracy_millis: number | null
          accuracy_seconds: number | null
          created_at: string | null
          enterprise_id: string
          id: string
          message_imprint: string
          message_imprint_algorithm: string
          nonce: string | null
          ordering: boolean | null
          serial_number: number
          signature_document_id: string | null
          signature_event_id: string | null
          timestamp_time: string
          timestamp_token: string
          tsa_name: string
          tsa_policy_oid: string | null
          tsa_url: string | null
          verification_error: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          accuracy_micros?: number | null
          accuracy_millis?: number | null
          accuracy_seconds?: number | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          message_imprint: string
          message_imprint_algorithm?: string
          nonce?: string | null
          ordering?: boolean | null
          serial_number: number
          signature_document_id?: string | null
          signature_event_id?: string | null
          timestamp_time: string
          timestamp_token: string
          tsa_name: string
          tsa_policy_oid?: string | null
          tsa_url?: string | null
          verification_error?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          accuracy_micros?: number | null
          accuracy_millis?: number | null
          accuracy_seconds?: number | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          message_imprint?: string
          message_imprint_algorithm?: string
          nonce?: string | null
          ordering?: boolean | null
          serial_number?: number
          signature_document_id?: string | null
          signature_event_id?: string | null
          timestamp_time?: string
          timestamp_token?: string
          tsa_name?: string
          tsa_policy_oid?: string | null
          tsa_url?: string | null
          verification_error?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timestamp_tokens_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timestamp_tokens_signature_document_id_fkey"
            columns: ["signature_document_id"]
            isOneToOne: false
            referencedRelation: "signature_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timestamp_tokens_signature_event_id_fkey"
            columns: ["signature_event_id"]
            isOneToOne: false
            referencedRelation: "signature_events"
            referencedColumns: ["id"]
          },
        ]
      }
      trace_spans: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          end_time: string | null
          enterprise_id: string
          id: string
          kind: number
          logs: Json | null
          operation_name: string
          parent_span_id: string | null
          service_name: string
          span_id: string
          start_time: string
          status: number
          tags: Json | null
          trace_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          enterprise_id: string
          id?: string
          kind?: number
          logs?: Json | null
          operation_name: string
          parent_span_id?: string | null
          service_name: string
          span_id: string
          start_time: string
          status?: number
          tags?: Json | null
          trace_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          enterprise_id?: string
          id?: string
          kind?: number
          logs?: Json | null
          operation_name?: string
          parent_span_id?: string | null
          service_name?: string
          span_id?: string
          start_time?: string
          status?: number
          tags?: Json | null
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trace_spans_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          access_count: number
          created_at: string
          enterprise_id: string
          fingerprint: string
          last_seen: string
          trust_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          enterprise_id: string
          fingerprint: string
          last_seen: string
          trust_level: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number
          created_at?: string
          enterprise_id?: string
          fingerprint?: string
          last_seen?: string
          trust_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          enabled_at: string | null
          id: string
          secret: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          id?: string
          secret: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          id?: string
          secret?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      usage_records: {
        Row: {
          created_at: string | null
          enterprise_id: string
          id: string
          metadata: Json | null
          metric_name: string
          quantity: number
          subscription_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          id?: string
          metadata?: Json | null
          metric_name: string
          quantity: number
          subscription_id: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          quantity?: number
          subscription_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_baselines: {
        Row: {
          baseline_value: number
          created_at: string | null
          enterprise_id: string
          id: string
          last_calculated: string | null
          metric_type: string
          sample_size: number
          user_id: string
          variance: number
        }
        Insert: {
          baseline_value: number
          created_at?: string | null
          enterprise_id: string
          id?: string
          last_calculated?: string | null
          metric_type: string
          sample_size: number
          user_id: string
          variance: number
        }
        Update: {
          baseline_value?: number
          created_at?: string | null
          enterprise_id?: string
          id?: string
          last_calculated?: string | null
          metric_type?: string
          sample_size?: number
          user_id?: string
          variance?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_baselines_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_baselines_user_id_fkey"
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
      user_positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          job_title_id: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          job_title_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          job_title_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_positions_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_positions_user_id_fkey"
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
      user_sessions: {
        Row: {
          ended_at: string | null
          enterprise_id: string
          id: string
          ip_address: unknown | null
          last_activity_at: string | null
          session_token: string | null
          started_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          enterprise_id: string
          id?: string
          ip_address?: unknown | null
          last_activity_at?: string | null
          session_token?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          enterprise_id?: string
          id?: string
          ip_address?: unknown | null
          last_activity_at?: string | null
          session_token?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
          last_comment_view_at: string | null
          last_login_at: string | null
          last_name: string | null
          phone_number: string | null
          primary_department_id: string | null
          primary_job_title_id: string | null
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
          last_comment_view_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          primary_department_id?: string | null
          primary_job_title_id?: string | null
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
          last_comment_view_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          primary_department_id?: string | null
          primary_job_title_id?: string | null
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
          {
            foreignKeyName: "users_primary_department_id_fkey"
            columns: ["primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_primary_job_title_id_fkey"
            columns: ["primary_job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_rules: {
        Row: {
          agent_type: string | null
          created_at: string | null
          created_by: string | null
          enterprise_id: string
          error_message: string | null
          field_path: string | null
          id: string
          is_active: boolean | null
          operation: string | null
          rule_config: Json
          rule_name: string
          rule_type: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type?: string | null
          created_at?: string | null
          created_by?: string | null
          enterprise_id: string
          error_message?: string | null
          field_path?: string | null
          id?: string
          is_active?: boolean | null
          operation?: string | null
          rule_config: Json
          rule_name: string
          rule_type: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string | null
          created_at?: string | null
          created_by?: string | null
          enterprise_id?: string
          error_message?: string | null
          field_path?: string | null
          id?: string
          is_active?: boolean | null
          operation?: string | null
          rule_config?: Json
          rule_name?: string
          rule_type?: string
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_rules_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_benchmarks: {
        Row: {
          average_value: number | null
          computed_at: string | null
          enterprise_id: string
          id: string
          max_value: number | null
          median_value: number | null
          metric_name: string
          min_value: number | null
          percentile_25: number | null
          percentile_75: number | null
          percentile_90: number | null
          period_start: string
          period_type: string
          sample_size: number | null
          vendor_category: string | null
        }
        Insert: {
          average_value?: number | null
          computed_at?: string | null
          enterprise_id: string
          id?: string
          max_value?: number | null
          median_value?: number | null
          metric_name: string
          min_value?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          period_start: string
          period_type: string
          sample_size?: number | null
          vendor_category?: string | null
        }
        Update: {
          average_value?: number | null
          computed_at?: string | null
          enterprise_id?: string
          id?: string
          max_value?: number | null
          median_value?: number | null
          metric_name?: string
          min_value?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          period_start?: string
          period_type?: string
          sample_size?: number | null
          vendor_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_benchmarks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_communications: {
        Row: {
          body: string
          communication_type: string
          created_at: string | null
          created_by: string | null
          delivery_error: string | null
          enterprise_id: string
          id: string
          metadata: Json | null
          recipient_email: string | null
          recipient_name: string | null
          response_data: Json | null
          response_date: string | null
          response_received: boolean | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          body: string
          communication_type: string
          created_at?: string | null
          created_by?: string | null
          delivery_error?: string | null
          enterprise_id: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_data?: Json | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          body?: string
          communication_type?: string
          created_at?: string | null
          created_by?: string | null
          delivery_error?: string | null
          enterprise_id?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_data?: Json | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          compliance_results: Json | null
          created_at: string | null
          deleted_at: string | null
          document_name: string
          document_type: string
          enterprise_id: string
          expiration_date: string | null
          extraction_results: Json | null
          file_size: number | null
          file_type: string | null
          id: string
          issue_date: string | null
          metadata: Json | null
          status: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string
          vendor_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          compliance_results?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          document_name: string
          document_type: string
          enterprise_id: string
          expiration_date?: string | null
          extraction_results?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          status?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by: string
          vendor_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          compliance_results?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          document_name?: string
          document_type?: string
          enterprise_id?: string
          expiration_date?: string | null
          extraction_results?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          status?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string
          vendor_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_issues: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          enterprise_id: string
          id: string
          issue_type: string
          metadata: Json | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          enterprise_id: string
          id?: string
          issue_type: string
          metadata?: Json | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          enterprise_id?: string
          id?: string
          issue_type?: string
          metadata?: Json | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_issues_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_issues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_issues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_issues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_issues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_issues_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_kpi_tracking: {
        Row: {
          created_at: string | null
          enterprise_id: string
          evidence: Json | null
          id: string
          measurement_date: string
          measurement_period: string | null
          metric_name: string
          metric_value: number
          notes: string | null
          recorded_by: string | null
          sla_id: string | null
          status: string | null
          target_value: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          evidence?: Json | null
          id?: string
          measurement_date?: string
          measurement_period?: string | null
          metric_name: string
          metric_value: number
          notes?: string | null
          recorded_by?: string | null
          sla_id?: string | null
          status?: string | null
          target_value?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          evidence?: Json | null
          id?: string
          measurement_date?: string
          measurement_period?: string | null
          metric_name?: string
          metric_value?: number
          notes?: string | null
          recorded_by?: string | null
          sla_id?: string | null
          status?: string | null
          target_value?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kpi_tracking_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "vendor_slas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kpi_tracking_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_match_suggestions: {
        Row: {
          batch_upload_item_id: string | null
          confidence_score: number
          confirmed_at: string | null
          confirmed_by: string | null
          contract_id: string | null
          created_at: string | null
          created_vendor_id: string | null
          enterprise_id: string
          id: string
          is_confirmed: boolean
          is_rejected: boolean
          match_type: string
          matched_vendor_id: string | null
          matching_algorithm: string | null
          metadata: Json | null
          similarity_details: Json | null
          suggested_vendor_data: Json | null
          suggested_vendor_name: string
        }
        Insert: {
          batch_upload_item_id?: string | null
          confidence_score: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_vendor_id?: string | null
          enterprise_id: string
          id?: string
          is_confirmed?: boolean
          is_rejected?: boolean
          match_type: string
          matched_vendor_id?: string | null
          matching_algorithm?: string | null
          metadata?: Json | null
          similarity_details?: Json | null
          suggested_vendor_data?: Json | null
          suggested_vendor_name: string
        }
        Update: {
          batch_upload_item_id?: string | null
          confidence_score?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_vendor_id?: string | null
          enterprise_id?: string
          id?: string
          is_confirmed?: boolean
          is_rejected?: boolean
          match_type?: string
          matched_vendor_id?: string | null
          matching_algorithm?: string | null
          metadata?: Json | null
          similarity_details?: Json | null
          suggested_vendor_data?: Json | null
          suggested_vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_match_suggestions_batch_upload_item_id_fkey"
            columns: ["batch_upload_item_id"]
            isOneToOne: false
            referencedRelation: "batch_upload_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_created_vendor_id_fkey"
            columns: ["created_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_created_vendor_id_fkey"
            columns: ["created_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_created_vendor_id_fkey"
            columns: ["created_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_created_vendor_id_fkey"
            columns: ["created_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_created_vendor_id_fkey"
            columns: ["created_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_match_suggestions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance_history: {
        Row: {
          active_contract_value: number | null
          average_lead_time_days: number | null
          average_response_time_hours: number | null
          certifications_count: number | null
          compliance_issues_count: number | null
          compliance_score: number | null
          computed_at: string | null
          contract_count: number | null
          cost_score: number | null
          defect_rate: number | null
          delivery_score: number | null
          enterprise_id: string
          escalations_count: number | null
          id: string
          on_time_delivery_rate: number | null
          open_risk_issues: number | null
          overall_score: number | null
          period_end: string
          period_start: string
          period_type: string
          price_variance: number | null
          quality_score: number | null
          responsiveness_score: number | null
          return_rate: number | null
          risk_score: number | null
          spend_growth_rate: number | null
          total_savings_realized: number | null
          total_spend: number | null
          vendor_id: string
        }
        Insert: {
          active_contract_value?: number | null
          average_lead_time_days?: number | null
          average_response_time_hours?: number | null
          certifications_count?: number | null
          compliance_issues_count?: number | null
          compliance_score?: number | null
          computed_at?: string | null
          contract_count?: number | null
          cost_score?: number | null
          defect_rate?: number | null
          delivery_score?: number | null
          enterprise_id: string
          escalations_count?: number | null
          id?: string
          on_time_delivery_rate?: number | null
          open_risk_issues?: number | null
          overall_score?: number | null
          period_end: string
          period_start: string
          period_type: string
          price_variance?: number | null
          quality_score?: number | null
          responsiveness_score?: number | null
          return_rate?: number | null
          risk_score?: number | null
          spend_growth_rate?: number | null
          total_savings_realized?: number | null
          total_spend?: number | null
          vendor_id: string
        }
        Update: {
          active_contract_value?: number | null
          average_lead_time_days?: number | null
          average_response_time_hours?: number | null
          certifications_count?: number | null
          compliance_issues_count?: number | null
          compliance_score?: number | null
          computed_at?: string | null
          contract_count?: number | null
          cost_score?: number | null
          defect_rate?: number | null
          delivery_score?: number | null
          enterprise_id?: string
          escalations_count?: number | null
          id?: string
          on_time_delivery_rate?: number | null
          open_risk_issues?: number | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          price_variance?: number | null
          quality_score?: number | null
          responsiveness_score?: number | null
          return_rate?: number | null
          risk_score?: number | null
          spend_growth_rate?: number | null
          total_savings_realized?: number | null
          total_spend?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_history_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_performance_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_performance_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_scorecard_templates: {
        Row: {
          applies_to_categories: string[] | null
          applies_to_tiers: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enterprise_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_score: number | null
          name: string
          passing_score: number | null
          scoring_method: string | null
          updated_at: string | null
        }
        Insert: {
          applies_to_categories?: string[] | null
          applies_to_tiers?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_score?: number | null
          name: string
          passing_score?: number | null
          scoring_method?: string | null
          updated_at?: string | null
        }
        Update: {
          applies_to_categories?: string[] | null
          applies_to_tiers?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_score?: number | null
          name?: string
          passing_score?: number | null
          scoring_method?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_scorecard_templates_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_scorecards: {
        Row: {
          created_at: string | null
          created_by: string | null
          dimension_scores: Json | null
          enterprise_id: string
          id: string
          overall_rating: string | null
          overall_score: number | null
          period_end: string
          period_start: string
          previous_score: number | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score_trend: string | null
          scorecard_period: string
          shared_at: string | null
          shared_with_vendor: boolean | null
          status: string | null
          template_id: string
          updated_at: string | null
          vendor_acknowledged: boolean | null
          vendor_acknowledged_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dimension_scores?: Json | null
          enterprise_id: string
          id?: string
          overall_rating?: string | null
          overall_score?: number | null
          period_end: string
          period_start: string
          previous_score?: number | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_trend?: string | null
          scorecard_period: string
          shared_at?: string | null
          shared_with_vendor?: boolean | null
          status?: string | null
          template_id: string
          updated_at?: string | null
          vendor_acknowledged?: boolean | null
          vendor_acknowledged_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dimension_scores?: Json | null
          enterprise_id?: string
          id?: string
          overall_rating?: string | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          previous_score?: number | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_trend?: string | null
          scorecard_period?: string
          shared_at?: string | null
          shared_with_vendor?: boolean | null
          status?: string | null
          template_id?: string
          updated_at?: string | null
          vendor_acknowledged?: boolean | null
          vendor_acknowledged_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_scorecards_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_scorecards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vendor_scorecard_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_scorecards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_scorecards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_scorecards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_scorecards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_scorecards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_slas: {
        Row: {
          breach_penalty: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          enterprise_id: string
          escalation_rules: Json | null
          id: string
          is_active: boolean | null
          measurement_period: string | null
          measurement_unit: string | null
          metric_name: string
          sla_name: string
          sla_type: string
          target_value: number
          threshold_breach: number
          threshold_warning: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          breach_penalty?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id: string
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          measurement_period?: string | null
          measurement_unit?: string | null
          metric_name: string
          sla_name: string
          sla_type: string
          target_value: number
          threshold_breach: number
          threshold_warning?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          breach_penalty?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id?: string
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          measurement_period?: string | null
          measurement_unit?: string | null
          metric_name?: string
          sla_name?: string
          sla_type?: string
          target_value?: number
          threshold_breach?: number
          threshold_warning?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_slas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_slas_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_category_hierarchy"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "vendor_subcategories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_subcategories_enterprise_id_fkey"
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
          archived_at: string | null
          archived_by: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          category_id: string | null
          certifications: Json | null
          city: string | null
          compliance_score: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          default_payment_terms: string | null
          deleted_at: string | null
          enterprise_id: string
          id: string
          is_demo: boolean | null
          last_audit_date: string | null
          last_review_date: string | null
          metadata: Json | null
          name: string
          next_audit_date: string | null
          next_review_date: string | null
          performance_score: number | null
          postal_code: string | null
          primary_address_id: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          risk_level: string | null
          state_province: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          street_address_1: string | null
          street_address_2: string | null
          subcategory_id: string | null
          total_contract_value: number | null
          updated_at: string | null
          vendor_tier: string | null
          website: string | null
        }
        Insert: {
          active_contracts?: number | null
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          category_id?: string | null
          certifications?: Json | null
          city?: string | null
          compliance_score?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          default_payment_terms?: string | null
          deleted_at?: string | null
          enterprise_id: string
          id?: string
          is_demo?: boolean | null
          last_audit_date?: string | null
          last_review_date?: string | null
          metadata?: Json | null
          name: string
          next_audit_date?: string | null
          next_review_date?: string | null
          performance_score?: number | null
          postal_code?: string | null
          primary_address_id?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          risk_level?: string | null
          state_province?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          street_address_1?: string | null
          street_address_2?: string | null
          subcategory_id?: string | null
          total_contract_value?: number | null
          updated_at?: string | null
          vendor_tier?: string | null
          website?: string | null
        }
        Update: {
          active_contracts?: number | null
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: Database["public"]["Enums"]["vendor_category"]
          category_id?: string | null
          certifications?: Json | null
          city?: string | null
          compliance_score?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          default_payment_terms?: string | null
          deleted_at?: string | null
          enterprise_id?: string
          id?: string
          is_demo?: boolean | null
          last_audit_date?: string | null
          last_review_date?: string | null
          metadata?: Json | null
          name?: string
          next_audit_date?: string | null
          next_review_date?: string | null
          performance_score?: number | null
          postal_code?: string | null
          primary_address_id?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          risk_level?: string | null
          state_province?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          street_address_1?: string | null
          street_address_2?: string | null
          subcategory_id?: string | null
          total_contract_value?: number | null
          updated_at?: string | null
          vendor_tier?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_category_hierarchy"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "fk_vendor_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "vendor_category_hierarchy"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "fk_vendor_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "vendor_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "vendors_primary_address_id_fkey"
            columns: ["primary_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
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
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
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
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
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
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
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
      workflow_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          conditions: Json | null
          context: Json | null
          created_at: string | null
          decision: string | null
          enterprise_id: string
          escalated_at: string | null
          id: string
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string | null
          required_approvers: string[] | null
          status: string
          step_id: string
          updated_at: string | null
          workflow_execution_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          conditions?: Json | null
          context?: Json | null
          created_at?: string | null
          decision?: string | null
          enterprise_id: string
          escalated_at?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string | null
          required_approvers?: string[] | null
          status?: string
          step_id: string
          updated_at?: string | null
          workflow_execution_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          conditions?: Json | null
          context?: Json | null
          created_at?: string | null
          decision?: string | null
          enterprise_id?: string
          escalated_at?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string | null
          required_approvers?: string[] | null
          status?: string
          step_id?: string
          updated_at?: string | null
          workflow_execution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          allowed_roles: string[] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          enterprise_id: string
          id: string
          is_active: boolean | null
          is_template: boolean | null
          metadata: Json | null
          name: string
          retry_policy: Json | null
          steps: Json
          timeout_ms: number | null
          triggers: Json | null
          updated_at: string | null
          variables: Json | null
          version: number
          workflow_type: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          metadata?: Json | null
          name: string
          retry_policy?: Json | null
          steps: Json
          timeout_ms?: number | null
          triggers?: Json | null
          updated_at?: string | null
          variables?: Json | null
          version?: number
          workflow_type: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          metadata?: Json | null
          name?: string
          retry_policy?: Json | null
          steps?: Json
          timeout_ms?: number | null
          triggers?: Json | null
          updated_at?: string | null
          variables?: Json | null
          version?: number
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          created_at: string | null
          enterprise_id: string
          error: string | null
          event_source: string | null
          event_type: string
          execution_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          status: string
          triggered_workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          error?: string | null
          event_source?: string | null
          event_type: string
          execution_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          status?: string
          triggered_workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          error?: string | null
          event_source?: string | null
          event_type?: string
          execution_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          triggered_workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_triggered_workflow_id_fkey"
            columns: ["triggered_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          budget_id: string | null
          completed_at: string | null
          context: Json | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          current_step: string | null
          deleted_at: string | null
          duration_ms: number | null
          enterprise_id: string
          error: string | null
          id: string
          last_modified_by: string | null
          metadata: Json | null
          started_at: string | null
          status: string
          step_results: Json | null
          updated_at: string | null
          vendor_id: string | null
          workflow_id: string
          workflow_version: number
        }
        Insert: {
          budget_id?: string | null
          completed_at?: string | null
          context?: Json | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          deleted_at?: string | null
          duration_ms?: number | null
          enterprise_id: string
          error?: string | null
          id: string
          last_modified_by?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          step_results?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          workflow_id: string
          workflow_version: number
        }
        Update: {
          budget_id?: string | null
          completed_at?: string | null
          context?: Json | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          deleted_at?: string | null
          duration_ms?: number | null
          enterprise_id?: string
          error?: string | null
          id?: string
          last_modified_by?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          step_results?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          workflow_id?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "workflow_executions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "workflow_executions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_results: {
        Row: {
          agent_id: string | null
          agent_task_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          execution_id: string
          id: string
          result: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
          step_id: string
          step_name: string | null
          step_type: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id: string
          id?: string
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_id: string
          step_name?: string | null
          step_type?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          execution_id?: string
          id?: string
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_id?: string
          step_name?: string | null
          step_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_results_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_results_agent_task_id_fkey"
            columns: ["agent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          enterprise_id: string | null
          id: string
          is_public: boolean | null
          last_used_at: string | null
          metadata: Json | null
          name: string
          output_schema: Json | null
          required_inputs: Json | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          workflow_definition: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          output_schema?: Json | null
          required_inputs?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_definition: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enterprise_id?: string | null
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          output_schema?: Json | null
          required_inputs?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_definition?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      zero_trust_audit_log: {
        Row: {
          action: string
          audit_trail: Json | null
          behavior_trust: string | null
          confidence: number | null
          created_at: string
          decision: string
          device_trust: string | null
          enterprise_id: string | null
          id: number
          location: Json | null
          metadata: Json | null
          network_trust: string | null
          reason: string | null
          resource: string
          risk_score: number | null
          session_id: string | null
          source_ip: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          audit_trail?: Json | null
          behavior_trust?: string | null
          confidence?: number | null
          created_at?: string
          decision: string
          device_trust?: string | null
          enterprise_id?: string | null
          id?: number
          location?: Json | null
          metadata?: Json | null
          network_trust?: string | null
          reason?: string | null
          resource: string
          risk_score?: number | null
          session_id?: string | null
          source_ip?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          audit_trail?: Json | null
          behavior_trust?: string | null
          confidence?: number | null
          created_at?: string
          decision?: string
          device_trust?: string | null
          enterprise_id?: string | null
          id?: number
          location?: Json | null
          metadata?: Json | null
          network_trust?: string | null
          reason?: string | null
          resource?: string
          risk_score?: number | null
          session_id?: string | null
          source_ip?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zero_trust_audit_log_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zero_trust_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      zero_trust_policies: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean
          enterprise_id: string
          id: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          actions: Json
          conditions: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          enterprise_id: string
          id?: string
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          enterprise_id?: string
          id?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zero_trust_policies_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_task_performance_metrics: {
        Row: {
          agent_id: string | null
          agent_type: string | null
          avg_processing_time: number | null
          avg_retry_count: number | null
          completed_tasks: number | null
          enterprise_id: string | null
          failed_tasks: number | null
          hour: string | null
          median_processing_time: number | null
          p95_processing_time: number | null
          task_type: string | null
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
            foreignKeyName: "agent_tasks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_task_queue_status: {
        Row: {
          agent_id: string | null
          agent_type: string | null
          avg_age_seconds: number | null
          enterprise_id: string | null
          max_priority: number | null
          next_scheduled: string | null
          status: string | null
          task_count: number | null
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
            foreignKeyName: "agent_tasks_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_analytics_summary: {
        Row: {
          auto_renewal_count: number | null
          avg_value: number | null
          contract_count: number | null
          contract_type: string | null
          earliest_contract: string | null
          enterprise_id: string | null
          expiring_soon_30d: number | null
          expiring_soon_60d: number | null
          expiring_soon_90d: number | null
          latest_contract: string | null
          max_value: number | null
          min_value: number | null
          status: Database["public"]["Enums"]["contract_status"] | null
          total_value: number | null
          view_updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_expiring_soon: {
        Row: {
          analysis_error: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"] | null
          analyzed_at: string | null
          approval_status: string | null
          compliance_score: number | null
          contract_duration_days: number | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          days_remaining: number | null
          deleted_at: string | null
          department_id: string | null
          effective_date: string | null
          end_date: string | null
          enterprise_id: string | null
          enterprise_name: string | null
          expiry_notification_sent_at: string | null
          file_name: string | null
          file_type: string | null
          id: string | null
          is_auto_renew: boolean | null
          last_modified_by: string | null
          last_renewal_date: string | null
          legal_address_id: string | null
          metadata: Json | null
          next_renewal_date: string | null
          notes: string | null
          notice_period_days: number | null
          owner_email: string | null
          owner_id: string | null
          parent_contract_id: string | null
          payment_terms: string | null
          renewal_notice_days: number | null
          renewal_notification_sent_at: string | null
          risk_score: number | null
          signed_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          storage_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          value: number | null
          vendor_category: Database["public"]["Enums"]["vendor_category"] | null
          vendor_id: string | null
          vendor_name: string | null
          version: number | null
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
            foreignKeyName: "contracts_legal_address_id_fkey"
            columns: ["legal_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
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
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      contracts_high_value: {
        Row: {
          analysis_error: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"] | null
          analyzed_at: string | null
          approval_status: string | null
          compliance_score: number | null
          contract_duration_days: number | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          department_id: string | null
          effective_date: string | null
          end_date: string | null
          enterprise_id: string | null
          enterprise_name: string | null
          expiry_notification_sent_at: string | null
          file_name: string | null
          file_type: string | null
          id: string | null
          is_auto_renew: boolean | null
          last_modified_by: string | null
          last_renewal_date: string | null
          legal_address_id: string | null
          metadata: Json | null
          next_renewal_date: string | null
          notes: string | null
          notice_period_days: number | null
          owner_id: string | null
          parent_contract_id: string | null
          payment_terms: string | null
          renewal_notice_days: number | null
          renewal_notification_sent_at: string | null
          risk_score: number | null
          signed_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          storage_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          value: number | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_performance: number | null
          version: number | null
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
            foreignKeyName: "contracts_legal_address_id_fkey"
            columns: ["legal_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
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
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_high_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
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
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
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
      performance_index_usage: {
        Row: {
          index_scans: number | null
          indexname: unknown | null
          schemaname: unknown | null
          tablename: unknown | null
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      performance_slow_queries: {
        Row: {
          calls: number | null
          max_exec_time: number | null
          mean_exec_time: number | null
          query: string | null
          rows: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
      trace_summaries: {
        Row: {
          enterprise_id: string | null
          error_count: number | null
          max_duration_ms: number | null
          service_breakdown: Json | null
          services_involved: string[] | null
          span_count: number | null
          total_duration_ms: number | null
          trace_end_time: string | null
          trace_id: string | null
          trace_start_time: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trace_spans_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_spend_summary: {
        Row: {
          avg_transaction_amount: number | null
          category_id: string | null
          category_name: string | null
          currency: string | null
          enterprise_id: string | null
          month: string | null
          total_spend: number | null
          total_spend_usd: number | null
          transaction_count: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_spend_ranking: {
        Row: {
          contract_count: number | null
          enterprise_id: string | null
          spend_rank: number | null
          spend_share_pct: number | null
          total_spend_usd: number | null
          transaction_count: number | null
          vendor_category: Database["public"]["Enums"]["vendor_category"] | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_records_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_analytics_summary"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_metrics_mv"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_error_summary: {
        Row: {
          agent_type: string | null
          avg_errors_per_request: number | null
          enterprise_id: string | null
          error_count: number | null
          error_hour: string | null
          most_common_error_field: string | null
          operation: string | null
          total_error_fields: number | null
          unique_error_messages: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_validation_errors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_analytics_summary: {
        Row: {
          active_contract_value: number | null
          active_contracts: number | null
          avg_active_contract_value: number | null
          category: Database["public"]["Enums"]["vendor_category"] | null
          compliance_score: number | null
          critical_issues: number | null
          enterprise_id: string | null
          estimated_annual_spend: number | null
          expired_contracts: number | null
          last_contract_date: string | null
          last_issue_date: string | null
          open_issues: number | null
          performance_score: number | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          total_contract_value: number | null
          total_contracts: number | null
          total_issues: number | null
          vendor_created_at: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_updated_at: string | null
          view_updated_at: string | null
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
      vendor_category_hierarchy: {
        Row: {
          category_active: boolean | null
          category_display_name: string | null
          category_id: string | null
          category_name: string | null
          enterprise_id: string | null
          is_system: boolean | null
          subcategory_active: boolean | null
          subcategory_display_name: string | null
          subcategory_id: string | null
          subcategory_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_locations: {
        Row: {
          category_id: string | null
          category_name: string | null
          city: string | null
          country: string | null
          enterprise_id: string | null
          formatted_address: string | null
          id: string | null
          name: string | null
          postal_code: string | null
          state_province: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          street_address_1: string | null
          street_address_2: string | null
          subcategory_id: string | null
          subcategory_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_category_hierarchy"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "fk_vendor_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "vendor_category_hierarchy"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "fk_vendor_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "vendor_subcategories"
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
      vendor_performance_summary: {
        Row: {
          active_contract_value: number | null
          active_contracts: number | null
          avg_contract_value: number | null
          category: Database["public"]["Enums"]["vendor_category"] | null
          compliance_score: number | null
          enterprise_id: string | null
          id: string | null
          name: string | null
          next_expiring_contract: string | null
          performance_score: number | null
          risk_level: string | null
          total_contract_value: number | null
          total_contracts: number | null
          vendor_tier: string | null
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
      add_vendor_category: {
        Args: {
          p_enterprise_id: string
          p_name: string
          p_display_name: string
          p_description?: string
          p_created_by?: string
        }
        Returns: string
      }
      add_vendor_subcategory: {
        Args: {
          p_category_id: string
          p_enterprise_id: string
          p_name: string
          p_display_name: string
          p_description?: string
          p_created_by?: string
        }
        Returns: string
      }
      advanced_search: {
        Args: {
          p_search_config: Json
          p_enterprise_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          entity_type: string
          entity_id: string
          title: string
          snippet: string
          metadata: Json
          score: number
        }[]
      }
      aggregate_contract_risks_weekly: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      aggregate_donna_feedback_metrics: {
        Args: {
          p_bucket_type?: string
          p_start_time?: string
          p_end_time?: string
        }
        Returns: number
      }
      aggregate_temporal_metrics: {
        Args: {
          p_enterprise_id: string
          p_bucket_type?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: number
      }
      analyze_contract_variance_monthly: {
        Args: Record<PropertyKey, never>
        Returns: {
          enterprise_id: string
          contract_id: string
          contract_title: string
          expected_value: number
          actual_allocated: number
          variance_amount: number
          variance_percent: number
          variance_type: string
        }[]
      }
      analyze_task_queue_health: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          agent_type: string
          pending_tasks: number
          processing_tasks: number
          avg_wait_time_minutes: number
          oldest_task_age_minutes: number
          high_priority_tasks: number
          failed_tasks_last_hour: number
          health_status: string
        }[]
      }
      analyze_trace_performance: {
        Args: {
          p_trace_id: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      analyze_validation_patterns: {
        Args: {
          p_enterprise_id: string
          p_time_window?: unknown
        }
        Returns: {
          agent_type: string
          operation: string
          total_errors: number
          unique_error_types: number
          most_common_errors: Json
          error_rate: number
          recommendations: string[]
        }[]
      }
      analyze_vendor_consolidation_weekly: {
        Args: Record<PropertyKey, never>
        Returns: {
          enterprise_id: string
          vendor_id: string
          vendor_name: string
          category: string
          contract_count: number
          total_value: number
          consolidation_score: number
          recommendation: string
        }[]
      }
      anonymize_memory_for_donna: {
        Args: {
          p_memory_content: string
          p_memory_context: Json
          p_memory_type: string
        }
        Returns: Json
      }
      apply_memory_decay: {
        Args: {
          decay_rate?: number
          cutoff_date?: string
          p_enterprise_id?: string
        }
        Returns: number
      }
      approve_extracted_data: {
        Args: {
          p_review_id: string
          p_user_id: string
          p_corrected_data?: Json
          p_review_notes?: string
        }
        Returns: boolean
      }
      approve_taxonomy_review: {
        Args: {
          p_review_id: string
          p_selected_code: string
          p_reviewer_id: string
          p_notes?: string
        }
        Returns: boolean
      }
      archive_contract: {
        Args: {
          p_contract_id: string
          p_user_id: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      assess_contract_completeness: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      assess_contract_completeness_fast: {
        Args: {
          p_title: string
          p_vendor_id: string
          p_start_date: string
          p_end_date: string
          p_value: number
          p_storage_id: string
        }
        Returns: boolean
      }
      assess_enterprise_risk: {
        Args: {
          p_enterprise_id: string
          p_risk_categories?: Json
        }
        Returns: Json
      }
      assign_tasks_to_agents_batch: {
        Args: {
          p_enterprise_id: string
          p_limit?: number
        }
        Returns: {
          task_id: string
          agent_type: string
          assigned_at: string
        }[]
      }
      audit_compliance_evidence_monthly: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      batch_update_expired_contracts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      batch_update_jsonb_field: {
        Args: {
          p_table_name: string
          p_ids: string[]
          p_field_name: string
          p_json_path: string[]
          p_new_value: Json
        }
        Returns: number
      }
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      bulk_soft_delete_contracts: {
        Args: {
          p_contract_ids: string[]
          p_enterprise_id: string
          p_user_id: string
        }
        Returns: {
          deleted_count: number
          failed_ids: string[]
          errors: string[]
        }[]
      }
      bulk_soft_delete_vendors: {
        Args: {
          p_vendor_ids: string[]
          p_enterprise_id: string
          p_user_id: string
        }
        Returns: {
          deleted_count: number
          failed_ids: string[]
          errors: string[]
        }[]
      }
      bulk_update_contract_status: {
        Args: {
          p_contract_ids: string[]
          p_new_status: string
          p_enterprise_id: string
          p_user_id: string
        }
        Returns: {
          updated_count: number
          failed_ids: string[]
          errors: string[]
        }[]
      }
      calculate_analysis_cost: {
        Args: {
          p_model_name: string
          p_tokens: number
        }
        Returns: number
      }
      calculate_bid_ranks: {
        Args: {
          p_rfq_id: string
        }
        Returns: undefined
      }
      calculate_budget_rollups: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          budget_id: string
          total_allocated: number
          total_spent: number
          total_remaining: number
          child_count: number
        }[]
      }
      calculate_contract_health: {
        Args: {
          contract_id: string
        }
        Returns: number
      }
      calculate_contract_risk: {
        Args: {
          p_contract_id: string
          p_assessment_type?: string
        }
        Returns: string
      }
      calculate_contract_tariff_totals: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      calculate_enterprise_price_stats: {
        Args: {
          p_enterprise_id: string
          p_taxonomy_code: string
        }
        Returns: {
          sample_count: number
          avg_unit_price: number
          median_unit_price: number
          min_unit_price: number
          max_unit_price: number
          std_dev: number
          price_range: number
        }[]
      }
      calculate_feedback_score: {
        Args: {
          p_user_response: string
          p_outcome_status: string
          p_confidence_score: number
        }
        Returns: number
      }
      calculate_line_item_tariff: {
        Args: {
          p_line_item_id: string
        }
        Returns: Json
      }
      calculate_market_indices: {
        Args: {
          p_taxonomy_code?: string
          p_period?: string
        }
        Returns: number
      }
      calculate_next_due_date: {
        Args: {
          p_frequency: string
          p_current_due: string
          p_recurring_day?: number
          p_recurring_config?: Json
        }
        Returns: string
      }
      calculate_obligation_cascade_impact: {
        Args: {
          p_obligation_id: string
          p_delay_days?: number
        }
        Returns: {
          affected_obligation_id: string
          affected_obligation_title: string
          dependency_path: string[]
          cascade_level: number
          original_due_date: string
          new_projected_due_date: string
          delay_days: number
          is_critical: boolean
          impact_severity: string
        }[]
      }
      calculate_renewal_probability: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          renewal_probability: number
          factors: Json
          confidence_score: number
        }[]
      }
      calculate_scorecard_scores: {
        Args: {
          p_scorecard_id: string
        }
        Returns: boolean
      }
      calculate_security_metrics: {
        Args: {
          p_enterprise_id?: string
          p_date?: string
        }
        Returns: number
      }
      calculate_subscription_usage: {
        Args: {
          p_subscription_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          metric_name: string
          total_quantity: number
          last_recorded: string
        }[]
      }
      calculate_template_complexity_score: {
        Args: {
          p_template_id: string
        }
        Returns: number
      }
      calculate_template_risk_score: {
        Args: {
          p_template_id: string
        }
        Returns: number
      }
      calculate_total_tariff_rate: {
        Args: {
          p_hts_code: string
          p_origin_country: string
          p_is_usmca_qualifying?: boolean
        }
        Returns: Json
      }
      calculate_vendor_analytics: {
        Args: {
          p_vendor_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: Json
      }
      calculate_vendor_relationship_score: {
        Args: {
          p_vendor_id: string
        }
        Returns: Json
      }
      calculate_vendor_scores_batch: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          vendor_id: string
          performance_score: number
          compliance_score: number
          updated_count: number
        }[]
      }
      cancel_auto_renewal: {
        Args: {
          p_contract_id: string
          p_cancellation_reason?: string
        }
        Returns: Json
      }
      check_and_queue_budget_alert_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_and_queue_contract_expiry_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_auto_renewal_contracts_daily: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_clause_conflicts: {
        Args: {
          p_contract_id: string
          p_document_version_id?: string
        }
        Returns: {
          conflict_rule_id: string
          clause_a_text: string
          clause_b_text: string
          severity: string
          conflict_type: string
          resolution_guidance: string
        }[]
      }
      check_data_quality_daily: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_expiring_vendor_documents: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_plan_limit: {
        Args: {
          p_enterprise_id: string
          p_feature: string
          p_current_usage?: number
        }
        Returns: boolean
      }
      check_risk_thresholds: {
        Args: {
          p_contract_id: string
          p_assessment_id: string
          p_score: number
          p_level: string
        }
        Returns: undefined
      }
      check_vendor_sla_compliance_daily: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_auth_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_cache_invalidation_stats: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_ml_predictions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_tariff_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rate_limit_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_security_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      compare_against_benchmarks: {
        Args: {
          p_enterprise_id: string
          p_metric_name: string
          p_value: number
        }
        Returns: {
          percentile: number
          vs_median: number
          vs_best_in_class: number
          improvement_potential: number
          industry_position: string
        }[]
      }
      compare_price_to_market: {
        Args: {
          p_taxonomy_code: string
          p_unit_price: number
          p_industry?: string
          p_region?: string
        }
        Returns: {
          comparison: string
          percentile_rank: number
          deviation_from_median: number
          deviation_from_avg: number
          market_median: number
          market_avg: number
          potential_savings: number
          confidence: number
        }[]
      }
      complete_collaborative_session: {
        Args: {
          p_session_id: string
          p_final_html?: string
          p_create_document_version?: boolean
        }
        Returns: string
      }
      complete_mitigation_action: {
        Args: {
          p_action_id: string
          p_completion_notes: string
          p_actual_reduction?: number
        }
        Returns: boolean
      }
      compute_spend_aggregations: {
        Args: {
          p_enterprise_id: string
          p_period_start?: string
          p_period_end?: string
        }
        Returns: number
      }
      consolidate_agent_memory: {
        Args: {
          agent_uuid: string
        }
        Returns: undefined
      }
      consolidate_user_memories: {
        Args: {
          p_user_id: string
          p_enterprise_id: string
          consolidation_threshold?: number
          importance_threshold?: number
        }
        Returns: number
      }
      contribute_price_data: {
        Args: {
          p_taxonomy_code: string
          p_unit_price: number
          p_enterprise_id: string
          p_industry: string
          p_company_size: string
          p_region?: string
          p_quantity_range?: string
          p_currency?: string
          p_pricing_model?: string
          p_pricing_frequency?: string
          p_contract_duration_months?: number
          p_negotiation_indicator?: string
          p_line_item_id?: string
        }
        Returns: string
      }
      create_certificate_authority: {
        Args: {
          p_enterprise_id: string
          p_name: string
          p_subject_dn: Json
          p_public_key_pem: string
          p_private_key_encrypted: string
          p_certificate_pem: string
          p_key_algorithm?: string
          p_validity_years?: number
          p_is_root?: boolean
          p_parent_ca_id?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_collaborative_session: {
        Args: {
          p_enterprise_id: string
          p_document_version_id: string
          p_session_type?: string
          p_session_name?: string
          p_initial_content?: string
          p_contract_id?: string
          p_redline_session_id?: string
          p_allow_external?: boolean
          p_created_by?: string
        }
        Returns: string
      }
      create_contract_with_analysis: {
        Args: {
          p_title: string
          p_file_name: string
          p_file_type: string
          p_storage_id: string
          p_vendor_id?: string
          p_notes?: string
          p_auto_analyze?: boolean
        }
        Returns: string
      }
      create_document_comparison: {
        Args: {
          p_base_version_id: string
          p_compare_version_id: string
          p_created_by?: string
        }
        Returns: string
      }
      create_document_version: {
        Args: {
          p_contract_id: string
          p_version_type: string
          p_content_text?: string
          p_content_html?: string
          p_source?: string
          p_change_summary?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_external_party_session: {
        Args: {
          p_token_id: string
          p_ip_address: string
          p_user_agent: string
          p_device_fingerprint?: string
          p_geo_location?: Json
        }
        Returns: {
          session_id: string
          session_token: string
          expires_at: string
        }[]
      }
      create_intake_form: {
        Args: {
          p_enterprise_id: string
          p_name: string
          p_form_code: string
          p_description?: string
          p_target_contract_type?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_mitigation_action: {
        Args: {
          p_assessment_id: string
          p_title: string
          p_description: string
          p_category: string
          p_priority: string
          p_expected_reduction?: number
          p_assigned_to?: string
          p_due_date?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_obligation_reminders: {
        Args: {
          p_obligation_id: string
        }
        Returns: number
      }
      create_ocr_job: {
        Args: {
          p_enterprise_id: string
          p_user_id: string
          p_job_name: string
          p_document_ids: string[]
          p_priority?: number
          p_ocr_options?: Json
        }
        Returns: string
      }
      create_signature_request: {
        Args: {
          p_contract_id: string
          p_title: string
          p_message?: string
          p_signatories?: Json
          p_expires_days?: number
          p_signing_order?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_template_version: {
        Args: {
          p_template_id: string
          p_change_summary?: string
          p_change_type?: string
          p_created_by?: string
        }
        Returns: string
      }
      create_user_certificate: {
        Args: {
          p_enterprise_id: string
          p_ca_id: string
          p_subject_dn: Json
          p_email: string
          p_user_id: string
          p_public_key_pem: string
          p_certificate_pem: string
          p_validity_days?: number
          p_created_by?: string
        }
        Returns: string
      }
      create_vendor_scorecard: {
        Args: {
          p_enterprise_id: string
          p_vendor_id: string
          p_template_id: string
          p_period_start: string
          p_period_end: string
          p_created_by: string
        }
        Returns: string
      }
      current_user_enterprise_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      detect_price_outliers: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      detect_user_anomalies: {
        Args: {
          p_user_id: string
          p_metric_type: string
          p_current_value: number
        }
        Returns: boolean
      }
      determine_contract_status: {
        Args: {
          p_contract_id: string
        }
        Returns: Database["public"]["Enums"]["contract_status"]
      }
      determine_contract_status_optimized: {
        Args: {
          p_contract_id: string
          p_title?: string
          p_vendor_id?: string
          p_start_date?: string
          p_end_date?: string
          p_value?: number
          p_storage_id?: string
          p_current_status?: Database["public"]["Enums"]["contract_status"]
        }
        Returns: Database["public"]["Enums"]["contract_status"]
      }
      enforce_approval_timeouts_daily: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      evaluate_approval_matrix: {
        Args: {
          p_enterprise_id: string
          p_entity_type: string
          p_entity_data: Json
        }
        Returns: {
          matrix_id: string
          rule_id: string
          approvers: Json
          approval_type: string
        }[]
      }
      evaluate_conditions: {
        Args: {
          p_conditions: Json
          p_data: Json
        }
        Returns: boolean
      }
      fetch_contracts_with_relations_batch: {
        Args: {
          p_contract_ids: string[]
        }
        Returns: {
          contract_id: string
          contract_data: Json
          vendor_data: Json
          budget_data: Json
        }[]
      }
      finalize_scorecard: {
        Args: {
          p_scorecard_id: string
          p_reviewed_by: string
          p_review_comments?: string
        }
        Returns: boolean
      }
      find_duplicate_vendors: {
        Args: {
          p_name: string
          p_enterprise_id: string
        }
        Returns: {
          vendor_id: string
          name: string
          similarity: number
          match_type: string
        }[]
      }
      find_similar_taxonomy: {
        Args: {
          p_embedding: string
          p_threshold?: number
          p_limit?: number
        }
        Returns: {
          id: string
          code: string
          name: string
          level: number
          similarity: number
        }[]
      }
      forecast_budget_usage: {
        Args: {
          p_budget_id: string
          p_months_ahead?: number
        }
        Returns: Json
      }
      format_address: {
        Args: {
          p_street_1: string
          p_street_2: string
          p_city: string
          p_state: string
          p_postal: string
          p_country: string
        }
        Returns: string
      }
      generate_demo_data: {
        Args: {
          p_scenario_name: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      generate_external_access_token: {
        Args: {
          p_enterprise_id: string
          p_token_type: string
          p_party_email: string
          p_party_name: string
          p_party_company?: string
          p_party_role?: string
          p_contract_id?: string
          p_signature_request_id?: string
          p_redline_session_id?: string
          p_expires_days?: number
          p_require_pin?: boolean
          p_custom_message?: string
          p_created_by?: string
        }
        Returns: {
          token_id: string
          raw_token: string
          token_prefix: string
        }[]
      }
      generate_rfq_number: {
        Args: {
          p_enterprise_id: string
          p_type: string
        }
        Returns: string
      }
      generate_search_suggestions: {
        Args: {
          p_partial_query: string
          p_enterprise_id: string
          p_limit?: number
        }
        Returns: {
          suggestion: string
          type: string
          score: number
        }[]
      }
      geocode_address: {
        Args: {
          p_address_id: string
        }
        Returns: undefined
      }
      get_active_certificate_for_user: {
        Args: {
          p_enterprise_id: string
          p_user_email: string
        }
        Returns: {
          certificate_id: string
          certificate_pem: string
          fingerprint: string
          expires_at: string
          ca_name: string
        }[]
      }
      get_agent_memories: {
        Args: {
          agent_uuid: string
          query_text: string
          mem_type?: string
          result_limit?: number
        }
        Returns: {
          id: string
          content: string
          memory_type: string
          importance_score: number
          access_count: number
          tags: string[]
          created_at: string
        }[]
      }
      get_agent_memory_context: {
        Args: {
          p_agent_type: string
          p_user_id: string
          p_enterprise_id: string
          p_context_window?: number
        }
        Returns: {
          memory_type: string
          content: string
          importance_score: number
          recency_score: number
          relevance_score: number
          source: string
        }[]
      }
      get_applicable_compliance_rules: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          rule_id: string
          rule_code: string
          rule_name: string
          rule_type: string
          severity: string
          failure_action: string
        }[]
      }
      get_approval_summary: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          total_approvals: number
          approved_count: number
          rejected_count: number
          pending_count: number
          has_final_approval: boolean
        }[]
      }
      get_approval_timeout_stats: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_changes_by_category: {
        Args: {
          p_comparison_id: string
        }
        Returns: {
          category: string
          change_count: number
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
        }[]
      }
      get_clause_category_path: {
        Args: {
          category_id: string
        }
        Returns: string
      }
      get_comparison_summary: {
        Args: {
          p_comparison_id: string
        }
        Returns: Json
      }
      get_compliance_summary: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          total_entities: number
          compliant_count: number
          non_compliant_count: number
          pending_review_count: number
          critical_risks: number
          high_risks: number
          compliance_percentage: number
        }[]
      }
      get_contract_analytics: {
        Args: {
          p_enterprise_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: Json
      }
      get_contract_compliance_summary: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      get_contract_external_access_summary: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          total_tokens: number
          active_tokens: number
          total_sessions: number
          total_actions: number
          parties: Json
        }[]
      }
      get_contract_line_items_with_tariffs: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          id: string
          line_number: number
          item_name: string
          item_description: string
          sku: string
          taxonomy_code: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          currency: string
          hts_code: string
          hts_description: string
          hts_confidence: number
          hts_match_method: string
          origin_country: string
          origin_country_name: string
          is_usmca_qualifying: boolean
          tariff_rate: number
          tariff_cost: number
          tariff_breakdown: Json
          tariff_calculated_at: string
        }[]
      }
      get_contract_line_items_with_taxonomy: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          id: string
          item_name: string
          item_description: string
          taxonomy_code: string
          taxonomy_name: string
          taxonomy_path: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          currency: string
          pricing_model: string
          pricing_frequency: string
          line_number: number
          is_optional: boolean
          is_recurring: boolean
          taxonomy_confidence: number
          extraction_source: string
        }[]
      }
      get_contract_risk_summary: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      get_contract_tariff_by_country: {
        Args: {
          p_contract_id: string
        }
        Returns: {
          origin_country: string
          origin_country_name: string
          item_count: number
          total_value: number
          total_tariff_cost: number
          avg_tariff_rate: number
        }[]
      }
      get_contract_version_history: {
        Args: {
          p_contract_id: string
          p_limit?: number
        }
        Returns: {
          id: string
          version_number: number
          version_label: string
          version_type: string
          status: string
          is_current: boolean
          change_summary: string
          changes_count: number
          created_by: string
          created_by_name: string
          created_at: string
          comparison_count: number
        }[]
      }
      get_crl_entries: {
        Args: {
          p_ca_id: string
        }
        Returns: {
          serial_number: number
          revocation_date: string
          reason: string
        }[]
      }
      get_cursor_color: {
        Args: {
          p_session_id: string
          p_user_id?: string
          p_external_email?: string
        }
        Returns: string
      }
      get_dashboard_stats: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_data_quality_stats: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_document_processing_stats: {
        Args: {
          p_enterprise_id: string
          p_days?: number
        }
        Returns: Json
      }
      get_donna_learning_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_patterns: number
          avg_confidence: number
          total_best_practices: number
          avg_success_rate: number
          total_queries: number
          feedback_rate: number
        }[]
      }
      get_enterprise_analytics: {
        Args: {
          p_enterprise_id: string
          p_period?: string
          p_lookback?: number
        }
        Returns: Json
      }
      get_enterprise_dashboard_stats: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_enterprise_donna_insights: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          insight_type: string
          insight_data: Json
          confidence: number
          created_at: string
        }[]
      }
      get_enterprise_tariff_by_country: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          origin_country: string
          country_name: string
          contract_count: number
          total_value: number
          total_tariff_cost: number
          avg_tariff_rate: number
        }[]
      }
      get_enterprise_tariff_summary: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_enterprise_users: {
        Args: {
          p_enterprise_id: string
          p_page?: number
          p_limit?: number
          p_role?: string
          p_status?: string
        }
        Returns: {
          users: Json
          total_count: number
          page: number
          limit_val: number
        }[]
      }
      get_entity_comment_count: {
        Args: {
          p_entity_type: string
          p_entity_id: string
          p_enterprise_id: string
        }
        Returns: number
      }
      get_index_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          schemaname: string
          tablename: string
          indexname: string
          idx_scan: number
          idx_tup_read: number
          idx_tup_fetch: number
          size: string
          unused: boolean
        }[]
      }
      get_industry_benchmarks: {
        Args: {
          p_industry: string
          p_metric_category?: string
          p_company_size?: string
          p_region?: string
        }
        Returns: {
          metric_name: string
          metric_category: string
          current_value: number
          p25: number
          p50: number
          p75: number
          p90: number
          unit: string
          confidence: number
          source: string
        }[]
      }
      get_line_items_by_taxonomy: {
        Args: {
          p_enterprise_id: string
          p_taxonomy_code: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          id: string
          contract_id: string
          vendor_name: string
          item_name: string
          quantity: number
          unit: string
          unit_price: number
          currency: string
          contract_date: string
          pricing_model: string
        }[]
      }
      get_line_items_needing_hts: {
        Args: {
          p_enterprise_id: string
          p_limit?: number
        }
        Returns: {
          id: string
          contract_id: string
          item_name: string
          item_description: string
          sku: string
          taxonomy_code: string
          origin_country: string
        }[]
      }
      get_market_benchmark: {
        Args: {
          p_taxonomy_code: string
          p_industry?: string
          p_region?: string
          p_company_size?: string
        }
        Returns: {
          taxonomy_code: string
          taxonomy_name: string
          avg_price: number
          median_price: number
          p25_price: number
          p75_price: number
          p90_price: number
          sample_count: number
          trend_direction: string
          price_change_pct: number
          confidence: number
          as_of_date: string
        }[]
      }
      get_negotiation_messages: {
        Args: {
          p_contract_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          message_id: string
          thread_id: string
          parent_message_id: string
          sender_type: string
          sender_name: string
          sender_email: string
          sender_company: string
          subject: string
          message_text: string
          is_important: boolean
          status: string
          created_at: string
          reply_count: number
        }[]
      }
      get_next_ca_serial: {
        Args: {
          p_ca_id: string
        }
        Returns: number
      }
      get_next_scheduled_workflows: {
        Args: {
          p_limit?: number
        }
        Returns: {
          workflow_id: string
          workflow_name: string
          next_run_at: string
          schedule_type: string
          enterprise_id: string
        }[]
      }
      get_next_submission_number: {
        Args: {
          p_enterprise_id: string
        }
        Returns: string
      }
      get_obligation_health_score: {
        Args: {
          p_obligation_id: string
        }
        Returns: {
          health_score: number
          health_status: string
          components: Json
        }[]
      }
      get_obligation_stats: {
        Args: {
          p_enterprise_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_obligations_calendar: {
        Args: {
          p_enterprise_id: string
          p_start_date: string
          p_end_date: string
          p_user_id?: string
          p_contract_id?: string
        }
        Returns: {
          id: string
          title: string
          obligation_type: string
          party_responsible: string
          due_date: string
          status: string
          priority: string
          contract_id: string
          contract_name: string
          vendor_name: string
          assignees: Json
        }[]
      }
      get_ocr_job_status: {
        Args: {
          p_job_id: string
        }
        Returns: {
          job_id: string
          status: string
          total_documents: number
          processed_documents: number
          progress_percentage: number
          pending_reviews: number
          approved_reviews: number
          estimated_time_remaining_seconds: number
        }[]
      }
      get_operations_since: {
        Args: {
          p_session_id: string
          p_since_clock?: number
          p_limit?: number
        }
        Returns: {
          operation_id: string
          operation_type: string
          operation_data: string
          user_id: string
          client_id: string
          clock: number
          created_at: string
        }[]
      }
      get_or_calculate_tariff: {
        Args: {
          p_enterprise_id: string
          p_hts_code: string
          p_origin_country: string
          p_is_usmca_qualifying?: boolean
        }
        Returns: Json
      }
      get_or_set_cache: {
        Args: {
          p_cache_key: string
          p_enterprise_id: string
          p_ttl_seconds?: number
        }
        Returns: Json
      }
      get_overdue_obligations: {
        Args: {
          p_enterprise_id: string
          p_user_id?: string
        }
        Returns: {
          id: string
          title: string
          obligation_type: string
          due_date: string
          days_overdue: number
          status: string
          priority: string
          contract_id: string
          contract_name: string
          vendor_name: string
          risk_score: number
          financial_impact: number
        }[]
      }
      get_pending_approvals: {
        Args: {
          p_user_id: string
          p_enterprise_id: string
        }
        Returns: {
          routing_id: string
          entity_type: string
          entity_id: string
          entity_title: string
          step_number: number
          routed_at: string
          due_date: string
          is_overdue: boolean
        }[]
      }
      get_pending_document_reviews: {
        Args: {
          p_enterprise_id: string
          p_limit?: number
        }
        Returns: {
          id: string
          file_name: string
          status: string
          document_classification: Json
          vendor_match_result: Json
          review_reason: string
          created_at: string
          user_name: string
        }[]
      }
      get_pending_signatures_for_user: {
        Args: {
          p_user_email: string
          p_limit?: number
        }
        Returns: {
          request_id: string
          contract_id: string
          contract_title: string
          request_title: string
          role_name: string
          signing_order: number
          expires_at: string
          created_at: string
        }[]
      }
      get_plan_features: {
        Args: {
          p_tier: string
        }
        Returns: Json
      }
      get_platform_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_playbook_effectiveness: {
        Args: {
          p_playbook_id: string
        }
        Returns: {
          clause_type: string
          total_negotiations: number
          won_count: number
          compromised_count: number
          lost_count: number
          win_rate: number
          avg_position_used: number
        }[]
      }
      get_playbook_with_rules: {
        Args: {
          p_playbook_id: string
        }
        Returns: Json
      }
      get_price_anomaly_summary: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          total_anomalies: number
          open_anomalies: number
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
          total_potential_savings: number
          avg_deviation_pct: number
        }[]
      }
      get_public_agent_statistics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_rate_limit_analytics: {
        Args: {
          p_time_range?: string
          p_enterprise_id?: string
        }
        Returns: Json
      }
      get_rate_limit_rules: {
        Args: {
          p_endpoint?: string
          p_user_tier?: string
          p_enterprise_id?: string
        }
        Returns: {
          id: string
          name: string
          strategy: string
          max_requests: number
          window_seconds: number
          scope: string
          endpoint: string
          user_tier: string
          burst_multiplier: number
          priority: number
        }[]
      }
      get_related_entities: {
        Args: {
          ent_type: string
          ent_id: string
          max_depth?: number
        }
        Returns: {
          entity_type: string
          entity_id: string
          entity_name: string
          relationship_type: string
          depth: number
        }[]
      }
      get_review_queue_summary: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          total_pending: number
          high_priority: number
          medium_priority: number
          low_priority: number
          avg_confidence: number
          oldest_pending_days: number
        }[]
      }
      get_rfq_statistics: {
        Args: {
          p_rfq_id: string
        }
        Returns: Json
      }
      get_security_events_enriched: {
        Args: {
          p_enterprise_id?: string
          p_time_range?: string
          p_severity?: string
          p_event_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          event_type: string
          severity: string
          title: string
          description: string
          source_ip: unknown
          user_email: string
          endpoint: string
          created_at: string
          ip_reputation: number
          country_code: string
          alert_count: number
        }[]
      }
      get_session_cursors: {
        Args: {
          p_session_id: string
        }
        Returns: {
          cursor_id: string
          user_id: string
          external_email: string
          client_id: string
          user_name: string
          color: string
          anchor: number
          head: number
          selection_type: string
          status: string
          current_action: string
          last_activity: string
        }[]
      }
      get_signature_request_summary: {
        Args: {
          p_request_id: string
        }
        Returns: Json
      }
      get_spend_analytics_dashboard: {
        Args: {
          p_enterprise_id: string
          p_period_months?: number
        }
        Returns: Json
      }
      get_task_throughput_stats: {
        Args: {
          p_enterprise_id: string
          p_time_range?: unknown
        }
        Returns: {
          agent_type: string
          total_tasks: number
          completed_tasks: number
          failed_tasks: number
          success_rate: number
          avg_completion_time_seconds: number
          tasks_per_hour: number
        }[]
      }
      get_taxonomy_path: {
        Args: {
          p_code: string
        }
        Returns: {
          level: number
          code: string
          name: string
        }[]
      }
      get_template_full: {
        Args: {
          p_template_id: string
        }
        Returns: Json
      }
      get_top_tariff_contracts: {
        Args: {
          p_enterprise_id: string
          p_limit?: number
        }
        Returns: {
          contract_id: string
          title: string
          vendor_id: string
          contract_value: number
          total_tariff_exposure: number
          tariff_percentage: number
          tariff_risk_level: string
          top_countries: Json
        }[]
      }
      get_trace_timeline: {
        Args: {
          p_trace_id: string
          p_enterprise_id: string
        }
        Returns: {
          span_id: string
          parent_span_id: string
          operation_name: string
          service_name: string
          start_time: string
          end_time: string
          duration_ms: number
          status: number
          depth: number
          path: string
        }[]
      }
      get_unresolved_comment_count: {
        Args: {
          p_entity_type: string
          p_entity_id: string
          p_enterprise_id: string
        }
        Returns: number
      }
      get_validation_rules: {
        Args: {
          p_agent_type: string
          p_operation: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_vendor_analytics_data: {
        Args: {
          p_vendor_id: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_vendor_performance_stats: {
        Args: {
          p_vendor_id: string
          p_enterprise_id: string
          p_time_range?: string
        }
        Returns: Json
      }
      get_vendor_spend_summary: {
        Args: {
          p_vendor_id: string
          p_period_months?: number
        }
        Returns: Json
      }
      get_vendor_with_metrics: {
        Args: {
          p_vendor_id: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      get_vendors_by_category_and_location: {
        Args: {
          p_enterprise_id: string
          p_category_id?: string
          p_subcategory_id?: string
          p_city?: string
          p_state?: string
          p_country?: string
        }
        Returns: {
          id: string
          name: string
          category_display_name: string
          subcategory_display_name: string
          city: string
          state_province: string
          country: string
          formatted_address: string
          performance_score: number
          compliance_score: number
          total_contract_value: number
          active_contracts: number
        }[]
      }
      get_vendors_with_metrics: {
        Args: {
          p_enterprise_id: string
          p_category?: string
          p_status?: string
          p_search?: string
          p_limit?: number
          p_offset?: number
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: {
          id: string
          enterprise_id: string
          name: string
          category: string
          status: string
          website: string
          description: string
          metadata: Json
          created_at: string
          updated_at: string
          created_by: string
          deleted_at: string
          active_contracts: number
          total_contracts: number
          total_contract_value: number
          compliance_score: number
          performance_score: number
        }[]
      }
      get_workflow_execution_summary: {
        Args: {
          p_enterprise_id: string
          p_time_range?: unknown
        }
        Returns: Json
      }
      grant_compliance_waiver: {
        Args: {
          p_issue_id: string
          p_reason: string
          p_expires_at: string
          p_approved_by: string
        }
        Returns: boolean
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      has_role_any: {
        Args: {
          required_roles: string[]
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      identify_vendor_consolidation_opportunities: {
        Args: Record<PropertyKey, never>
        Returns: {
          enterprise_id: string
          vendor_id: string
          vendor_name: string
          category: string
          contract_count: number
          total_value: number
          opportunity_score: number
          recommendation: string
        }[]
      }
      increment: {
        Args: {
          value: number
        }
        Returns: number
      }
      initialize_agent_system: {
        Args: {
          p_enterprise_id: string
        }
        Returns: {
          agent_system_id: string
          agents_created: number
        }[]
      }
      initialize_native_signature_provider: {
        Args: {
          p_enterprise_id: string
          p_created_by?: string
        }
        Returns: string
      }
      invalidate_enterprise_tariff_cache: {
        Args: {
          p_enterprise_id: string
        }
        Returns: number
      }
      invalidate_tariff_cache_by_country: {
        Args: {
          p_origin_country: string
        }
        Returns: number
      }
      invalidate_tariff_cache_by_hts: {
        Args: {
          p_hts_code: string
        }
        Returns: number
      }
      invite_user_to_enterprise: {
        Args: {
          p_email: string
          p_role: string
          p_enterprise_id: string
          p_invited_by: string
        }
        Returns: Json
      }
      is_feature_enabled: {
        Args: {
          p_flag_name: string
          p_user_id?: string
          p_enterprise_id?: string
        }
        Returns: boolean
      }
      issue_compliance_certification: {
        Args: {
          p_contract_id: string
          p_framework_id: string
          p_certification_type: string
          p_valid_until: string
          p_conditions: string[]
          p_exemptions: string[]
          p_notes: string
          p_certified_by: string
        }
        Returns: string
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      join_collaborative_session: {
        Args: {
          p_session_id: string
          p_user_id?: string
          p_external_email?: string
          p_user_name?: string
          p_client_id?: string
        }
        Returns: {
          cursor_id: string
          color: string
          yjs_state: string
          yjs_state_vector: string
          participant_count: number
        }[]
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      leave_collaborative_session: {
        Args: {
          p_cursor_id: string
        }
        Returns: boolean
      }
      list_webhooks: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      log_audit_event: {
        Args: {
          p_user_id: string
          p_action: string
          p_resource_type: string
          p_resource_id: string
          p_old_values: Json
          p_new_values: Json
          p_enterprise_id: string
        }
        Returns: string
      }
      log_batch_operation: {
        Args: {
          p_operation_name: string
          p_record_count: number
          p_start_time: string
          p_success?: boolean
          p_error_message?: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_external_party_action: {
        Args: {
          p_session_id: string
          p_action_type: string
          p_action_description?: string
          p_target_type?: string
          p_target_id?: string
          p_target_data?: Json
          p_previous_state?: Json
          p_new_state?: Json
          p_metadata?: Json
        }
        Returns: string
      }
      log_signature_event: {
        Args: {
          p_request_id: string
          p_signatory_id: string
          p_event_type: string
          p_event_message?: string
          p_actor_type?: string
          p_actor_id?: string
          p_raw_data?: Json
        }
        Returns: string
      }
      nanoid: {
        Args: {
          size?: number
        }
        Returns: string
      }
      optimize_budget_allocation: {
        Args: {
          p_enterprise_id: string
          p_optimization_target?: string
        }
        Returns: Json
      }
      process_approval_decision: {
        Args: {
          p_routing_id: string
          p_decision: string
          p_decision_by: string
          p_comment?: string
        }
        Returns: boolean
      }
      process_contract_approval: {
        Args: {
          p_contract_id: string
          p_approval_type: Database["public"]["Enums"]["approval_type"]
          p_approver_id: string
          p_decision: string
          p_comments?: string
          p_conditions?: Json
        }
        Returns: Json
      }
      process_daily_obligation_monitoring: {
        Args: {
          p_enterprise_id: string
        }
        Returns: Json
      }
      process_document_change: {
        Args: {
          p_change_id: string
          p_action: string
          p_user_id: string
          p_notes?: string
        }
        Returns: boolean
      }
      process_document_workflow: {
        Args: {
          p_document_id: string
          p_workflow_type: string
          p_user_id: string
        }
        Returns: Json
      }
      process_email_queue: {
        Args: {
          p_batch_size?: number
        }
        Returns: {
          processed: number
          sent: number
          failed: number
        }[]
      }
      process_notification_rules: {
        Args: {
          p_event_type: string
          p_event_data: Json
          p_enterprise_id: string
        }
        Returns: number
      }
      queue_contract_analyses_batch: {
        Args: {
          p_enterprise_id: string
          p_analysis_type?: string
        }
        Returns: {
          queued_count: number
          contract_ids: string[]
        }[]
      }
      queue_email_notification: {
        Args: {
          p_to_email: string
          p_subject: string
          p_template_name: string
          p_template_data: Json
          p_priority?: number
        }
        Returns: string
      }
      queue_for_taxonomy_review: {
        Args: {
          p_line_item_id: string
          p_suggestions: Json
          p_best_confidence: number
        }
        Returns: string
      }
      queue_vendor_communication: {
        Args: {
          p_vendor_id: string
          p_communication_type: string
          p_context?: Json
        }
        Returns: string
      }
      recalculate_all_contract_statuses: {
        Args: {
          p_enterprise_id?: string
          p_limit?: number
        }
        Returns: {
          contract_id: string
          old_status: Database["public"]["Enums"]["contract_status"]
          new_status: Database["public"]["Enums"]["contract_status"]
          updated: boolean
        }[]
      }
      recalculate_contract_tariffs: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      record_cache_invalidation_stat: {
        Args: {
          p_enterprise_id: string
          p_table_name: string
          p_operation_type: string
        }
        Returns: undefined
      }
      record_certificate_signature: {
        Args: {
          p_signature_event_id: string
          p_signatory_id: string
          p_certificate_id: string
          p_signature_value: string
          p_signed_data_hash: string
          p_cms_signed_data?: string
        }
        Returns: string
      }
      record_detected_conflict: {
        Args: {
          p_contract_id: string
          p_document_version_id: string
          p_conflict_rule_id: string
          p_clause_a_text: string
          p_clause_a_location: Json
          p_clause_b_text: string
          p_clause_b_location: Json
          p_detection_method: string
          p_confidence_score?: number
        }
        Returns: string
      }
      record_savings: {
        Args: {
          p_enterprise_id: string
          p_vendor_id: string
          p_contract_id: string
          p_savings_type: string
          p_baseline_amount: number
          p_actual_amount: number
          p_savings_date: string
          p_description?: string
          p_created_by?: string
        }
        Returns: string
      }
      record_spend: {
        Args: {
          p_enterprise_id: string
          p_vendor_id: string
          p_contract_id: string
          p_category_id: string
          p_amount: number
          p_currency: string
          p_spend_date: string
          p_spend_type: string
          p_description?: string
          p_recorded_by?: string
        }
        Returns: string
      }
      refresh_agent_task_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_vendor_metrics_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      register_webhook: {
        Args: {
          p_enterprise_id: string
          p_name: string
          p_url: string
          p_events: string[]
          p_headers?: Json
        }
        Returns: Json
      }
      render_template_content: {
        Args: {
          p_template_id: string
          p_variable_values?: Json
        }
        Returns: Json
      }
      resolve_compliance_issue: {
        Args: {
          p_issue_id: string
          p_resolution_type: string
          p_resolution_notes: string
          p_resolved_by: string
        }
        Returns: boolean
      }
      resolve_conflict: {
        Args: {
          p_conflict_id: string
          p_resolution_status: string
          p_resolution_notes: string
          p_resolved_by: string
        }
        Returns: boolean
      }
      revoke_certificate: {
        Args: {
          p_certificate_id: string
          p_reason?: string
          p_revoked_by?: string
        }
        Returns: boolean
      }
      revoke_external_access_token: {
        Args: {
          p_token_id: string
          p_reason?: string
          p_revoked_by?: string
        }
        Returns: boolean
      }
      route_contract_for_approval: {
        Args: {
          p_contract_id: string
        }
        Returns: Json
      }
      route_for_approval: {
        Args: {
          p_enterprise_id: string
          p_entity_type: string
          p_entity_id: string
          p_entity_data: Json
          p_initiated_by?: string
        }
        Returns: {
          routing_id: string
          step_number: number
          approver_type: string
          approver_id: string
          approver_name: string
        }[]
      }
      run_compliance_check: {
        Args: {
          p_contract_id: string
          p_check_type?: string
          p_triggered_by?: string
        }
        Returns: string
      }
      run_compliance_checks: {
        Args: {
          p_enterprise_id: string
          p_check_type?: string
        }
        Returns: Json
      }
      save_document_operation: {
        Args: {
          p_session_id: string
          p_operation_type: string
          p_operation_data: string
          p_user_id?: string
          p_external_email?: string
          p_client_id?: string
          p_change_summary?: string
        }
        Returns: string
      }
      save_session_snapshot: {
        Args: {
          p_session_id: string
          p_yjs_state: string
          p_yjs_state_vector: string
          p_snapshot_type?: string
          p_snapshot_name?: string
          p_document_html?: string
          p_created_by?: string
        }
        Returns: string
      }
      schedule_notification_digests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      search_clauses: {
        Args: {
          p_enterprise_id: string
          p_search_query?: string
          p_clause_type?: string
          p_risk_level?: string
          p_status?: string
          p_category_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          title: string
          slug: string
          clause_type: string
          category_id: string
          category_name: string
          category_path: string
          risk_level: string
          status: string
          is_standard: boolean
          tags: string[]
          created_at: string
          updated_at: string
          rank: number
        }[]
      }
      search_contracts_optimized: {
        Args: {
          p_enterprise_id: string
          p_search_term?: string
          p_status?: string
          p_vendor_id?: string
          p_min_value?: number
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          contract: Json
          vendor_name: string
          relevance_score: number
        }[]
      }
      search_entities: {
        Args: {
          p_query: string
          p_enterprise_id: string
          p_entity_types?: string[]
          p_filters?: Json
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          entity_type: string
          entity_id: string
          title: string
          snippet: string
          metadata: Json
          tags: string[]
          rank: number
          highlights: string
        }[]
      }
      search_hts_codes_by_embedding: {
        Args: {
          p_embedding: string
          p_match_threshold?: number
          p_limit?: number
        }
        Returns: {
          code: string
          description: string
          chapter: string
          general_rate_numeric: number
          unit: string
          similarity: number
        }[]
      }
      search_hts_codes_by_text: {
        Args: {
          p_query: string
          p_limit?: number
        }
        Returns: {
          code: string
          description: string
          chapter: string
          general_rate_numeric: number
          unit: string
          rank: number
        }[]
      }
      search_long_term_memory: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          p_category?: string
          p_user_id?: string
          p_enterprise_id?: string
        }
        Returns: {
          id: string
          content: string
          summary: string
          category: string
          context: Json
          importance_score: number
          access_count: number
          consolidation_count: number
          similarity_score: number
          created_at: string
        }[]
      }
      search_short_term_memory: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          p_user_id?: string
          p_enterprise_id?: string
        }
        Returns: {
          id: string
          content: string
          context: Json
          importance_score: number
          access_count: number
          similarity_score: number
          created_at: string
        }[]
      }
      search_taxonomy: {
        Args: {
          p_query: string
          p_level?: number
          p_limit?: number
        }
        Returns: {
          id: string
          code: string
          name: string
          description: string
          level: number
          parent_code: string
          relevance: number
        }[]
      }
      search_templates: {
        Args: {
          p_enterprise_id: string
          p_search_query?: string
          p_template_type?: string
          p_status?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          name: string
          slug: string
          description: string
          template_type: string
          status: string
          is_default: boolean
          risk_score: number
          complexity_score: number
          created_at: string
          updated_at: string
          section_count: number
          clause_count: number
          variable_count: number
          rank: number
        }[]
      }
      search_vendors_by_location: {
        Args: {
          p_enterprise_id: string
          p_city?: string
          p_state?: string
          p_country?: string
        }
        Returns: {
          id: string
          name: string
          category_display_name: string
          subcategory_display_name: string
          city: string
          state_province: string
          country: string
          formatted_address: string
        }[]
      }
      send_bulk_notifications: {
        Args: {
          p_user_ids: string[]
          p_title: string
          p_message: string
          p_type: string
          p_data?: Json
        }
        Returns: {
          notification_id: string
          user_id: string
          status: string
        }[]
      }
      send_negotiation_message: {
        Args: {
          p_enterprise_id: string
          p_contract_id: string
          p_sender_type: string
          p_sender_user_id?: string
          p_sender_token_id?: string
          p_message_text?: string
          p_parent_message_id?: string
          p_subject?: string
          p_is_important?: boolean
          p_related_clause_id?: string
        }
        Returns: string
      }
      send_smart_notification: {
        Args: {
          p_event_type: string
          p_event_data: Json
          p_enterprise_id: string
        }
        Returns: Json
      }
      send_vendor_document_expiration_notice: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_cache: {
        Args: {
          p_cache_key: string
          p_cache_value: Json
          p_enterprise_id: string
          p_ttl_seconds?: number
        }
        Returns: undefined
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      setup_new_user: {
        Args: {
          p_auth_id: string
          p_email: string
          p_first_name?: string
          p_last_name?: string
          p_metadata?: Json
        }
        Returns: {
          user_id: string
          enterprise_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      submit_intake_request: {
        Args: {
          p_enterprise_id: string
          p_form_id: string
          p_title: string
          p_form_data: Json
          p_submitted_by: string
        }
        Returns: string
      }
      suggest_playbook_for_contract: {
        Args: {
          p_enterprise_id: string
          p_contract_type: string
        }
        Returns: {
          playbook_id: string
          playbook_name: string
          match_score: number
          usage_count: number
          success_rate: number
        }[]
      }
      sync_vendor_metrics_from_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      system_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      transition_contract_after_analysis: {
        Args: {
          p_contract_id: string
          p_analysis_status: string
        }
        Returns: Json
      }
      unarchive_contract: {
        Args: {
          p_contract_id: string
          p_user_id: string
          p_enterprise_id: string
        }
        Returns: Json
      }
      update_alias_usage: {
        Args: {
          p_alias_id: string
        }
        Returns: undefined
      }
      update_benchmarks_from_learning: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_budget_status: {
        Args: {
          p_budget_id: string
        }
        Returns: undefined
      }
      update_contract_status_auto: {
        Args: {
          p_contract_id: string
        }
        Returns: Database["public"]["Enums"]["contract_status"]
      }
      update_contract_statuses: {
        Args: Record<PropertyKey, never>
        Returns: {
          updated_count: number
          expired_contracts: string[]
          expiring_soon: string[]
        }[]
      }
      update_cursor_position: {
        Args: {
          p_cursor_id: string
          p_anchor: number
          p_head: number
          p_selection_type?: string
          p_current_action?: string
        }
        Returns: boolean
      }
      update_ip_reputation: {
        Args: {
          p_ip_address: unknown
          p_event_type: string
          p_severity: string
        }
        Returns: undefined
      }
      update_search_index: {
        Args: {
          p_entity_type: string
          p_entity_id: string
          p_enterprise_id: string
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          p_user_id: string
          p_new_role: string
          p_enterprise_id: string
          p_updated_by: string
        }
        Returns: Json
      }
      update_vendor_performance_metrics: {
        Args: {
          p_vendor_id: string
        }
        Returns: undefined
      }
      user_has_role: {
        Args: {
          required_role: string
        }
        Returns: boolean
      }
      validate_external_access_token: {
        Args: {
          p_raw_token: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: {
          is_valid: boolean
          token_id: string
          token_type: string
          party_email: string
          party_name: string
          party_role: string
          contract_id: string
          signature_request_id: string
          redline_session_id: string
          document_version_id: string
          enterprise_id: string
          requires_pin: boolean
          requires_email_verification: boolean
          error_message: string
        }[]
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vendor_needs_audit: {
        Args: {
          vendor_id: string
        }
        Returns: boolean
      }
      void_signature_request: {
        Args: {
          p_request_id: string
          p_reason: string
          p_voided_by: string
        }
        Returns: boolean
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
      bid_status:
        | "invited"
        | "acknowledged"
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "rejected"
        | "awarded"
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
        | "pending_signature"
        | "pending_approval"
        | "renewed"
      rfq_status:
        | "draft"
        | "published"
        | "questions"
        | "bidding"
        | "evaluation"
        | "awarded"
        | "cancelled"
        | "closed"
      sourcing_status:
        | "draft"
        | "searching"
        | "evaluating"
        | "rfq_sent"
        | "completed"
        | "cancelled"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

