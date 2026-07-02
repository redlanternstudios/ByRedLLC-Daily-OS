export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      byred_activities: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          object_id: string
          object_type: string
          summary: string
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          object_id: string
          object_type: string
          summary: string
          tenant_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          object_id?: string
          object_type?: string
          summary?: string
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "byred_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_daily_briefs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          summary: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          summary: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          summary?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "byred_daily_briefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_leads: {
        Row: {
          assigned_user_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          revenue_potential: number | null
          source: string | null
          stage: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          revenue_potential?: number | null
          source?: string | null
          stage?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          revenue_potential?: number | null
          source?: string | null
          stage?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "byred_leads_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_leads_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_tasks: {
        Row: {
          ai_mode: string
          blocked_by_task_id: string | null
          blocker_flag: boolean | null
          blocker_reason: string | null
          completed_at: string | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          owner_user_id: string | null
          priority: string
          revenue_impact_score: number | null
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
          urgency_score: number | null
        }
        Insert: {
          ai_mode?: string
          blocked_by_task_id?: string | null
          blocker_flag?: boolean | null
          blocker_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          owner_user_id?: string | null
          priority?: string
          revenue_impact_score?: number | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          urgency_score?: number | null
        }
        Update: {
          ai_mode?: string
          blocked_by_task_id?: string | null
          blocker_flag?: boolean | null
          blocker_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          owner_user_id?: string | null
          priority?: string
          revenue_impact_score?: number | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "byred_tasks_blocked_by_task_id_fkey"
            columns: ["blocked_by_task_id"]
            isOneToOne: false
            referencedRelation: "byred_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          comment?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "byred_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "byred_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_tenants: {
        Row: {
          active: boolean | null
          color: string
          created_at: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          color: string
          created_at?: string | null
          id: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      byred_user_tenants: {
        Row: {
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "byred_user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "byred_user_tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
        ]
      }
      byred_users: {
        Row: {
          active: boolean | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          default_ai_mode: string
          email: string
          id: string
          name: string
          role: string
          slack_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          default_ai_mode?: string
          email: string
          id?: string
          name: string
          role?: string
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          default_ai_mode?: string
          email?: string
          id?: string
          name?: string
          role?: string
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      byred_import_batches: {
        Row: {
          id: string
          source: string
          status: string
          total_rows: number
          imported_rows: number
          failed_rows: number
          error_message: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          source?: string
          status?: string
          total_rows?: number
          imported_rows?: number
          failed_rows?: number
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          source?: string
          status?: string
          total_rows?: number
          imported_rows?: number
          failed_rows?: number
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      os_calendar_events: {
        Row: {
          id: string
          tenant_id: string
          task_id: string | null
          title: string
          description: string | null
          event_type: string
          status: string
          start_at: string
          end_at: string | null
          all_day: boolean
          owner_user_id: string | null
          calendar_color: string | null
          calendar_label: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          task_id?: string | null
          title: string
          description?: string | null
          event_type?: string
          status?: string
          start_at: string
          end_at?: string | null
          all_day?: boolean
          owner_user_id?: string | null
          calendar_color?: string | null
          calendar_label?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          task_id?: string | null
          title?: string
          description?: string | null
          event_type?: string
          status?: string
          start_at?: string
          end_at?: string | null
          all_day?: boolean
          owner_user_id?: string | null
          calendar_color?: string | null
          calendar_label?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      os_calendar_event_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string
          rsvp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          rsvp?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          rsvp?: string
          created_at?: string | null
        }
        Relationships: []
      }
      os_agent_receipts: {
        Row: {
          agent_family: string
          created_at: string
          created_by_user_id: string | null
          framework_scope: string
          id: string
          lesson: string
          proof_url_or_path: string
          receipt_type: string
          related_project_id: string | null
          related_task_id: string | null
          source_surface: string
          summary: string
          tenant_id: string
          verification_status: string
        }
        Insert: {
          agent_family?: string
          created_at?: string
          created_by_user_id?: string | null
          framework_scope?: string
          id?: string
          lesson: string
          proof_url_or_path: string
          receipt_type: string
          related_project_id?: string | null
          related_task_id?: string | null
          source_surface: string
          summary: string
          tenant_id: string
          verification_status?: string
        }
        Update: {
          agent_family?: string
          created_at?: string
          created_by_user_id?: string | null
          framework_scope?: string
          id?: string
          lesson?: string
          proof_url_or_path?: string
          receipt_type?: string
          related_project_id?: string | null
          related_task_id?: string | null
          source_surface?: string
          summary?: string
          tenant_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_agent_receipts_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_agent_receipts_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "os_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_agent_receipts_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "byred_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_agent_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      os_ai_provider_runs: {
        Row: {
          completion_tokens: number | null
          context_chars: number
          created_at: string
          created_by_user_id: string | null
          estimated_codex_minutes_saved: number
          estimated_codex_tokens_saved: number
          failure_reason: string | null
          id: string
          lane: string
          metadata: Json
          model: string
          mutation_allowed: boolean
          outcome_summary: string | null
          prompt_chars: number
          prompt_tokens: number | null
          provider: string
          purpose: string
          related_receipt_id: string | null
          status: string
          tenant_id: string
          total_tokens: number | null
          verification_status: string
          weakness: string | null
        }
        Insert: {
          completion_tokens?: number | null
          context_chars?: number
          created_at?: string
          created_by_user_id?: string | null
          estimated_codex_minutes_saved?: number
          estimated_codex_tokens_saved?: number
          failure_reason?: string | null
          id?: string
          lane: string
          metadata?: Json
          model: string
          mutation_allowed?: boolean
          outcome_summary?: string | null
          prompt_chars?: number
          prompt_tokens?: number | null
          provider: string
          purpose: string
          related_receipt_id?: string | null
          status: string
          tenant_id: string
          total_tokens?: number | null
          verification_status?: string
          weakness?: string | null
        }
        Update: {
          completion_tokens?: number | null
          context_chars?: number
          created_at?: string
          created_by_user_id?: string | null
          estimated_codex_minutes_saved?: number
          estimated_codex_tokens_saved?: number
          failure_reason?: string | null
          id?: string
          lane?: string
          metadata?: Json
          model?: string
          mutation_allowed?: boolean
          outcome_summary?: string | null
          prompt_chars?: number
          prompt_tokens?: number | null
          provider?: string
          purpose?: string
          related_receipt_id?: string | null
          status?: string
          tenant_id?: string
          total_tokens?: number | null
          verification_status?: string
          weakness?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_ai_provider_runs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "byred_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ai_provider_runs_related_receipt_id_fkey"
            columns: ["related_receipt_id"]
            isOneToOne: false
            referencedRelation: "os_agent_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ai_provider_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "byred_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      byred_current_user_id: { Args: Record<PropertyKey, never>; Returns: string }
      byred_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases for byred_os tables
export type ByredTenant = Database["public"]["Tables"]["byred_tenants"]["Row"]
export type ByredTenantInsert = Database["public"]["Tables"]["byred_tenants"]["Insert"]
export type ByredTenantUpdate = Database["public"]["Tables"]["byred_tenants"]["Update"]

export type ByredUser = Database["public"]["Tables"]["byred_users"]["Row"]
export type ByredUserInsert = Database["public"]["Tables"]["byred_users"]["Insert"]
export type ByredUserUpdate = Database["public"]["Tables"]["byred_users"]["Update"]

export type ByredUserTenant = Database["public"]["Tables"]["byred_user_tenants"]["Row"]
export type ByredUserTenantInsert = Database["public"]["Tables"]["byred_user_tenants"]["Insert"]
export type ByredUserTenantUpdate = Database["public"]["Tables"]["byred_user_tenants"]["Update"]

export type ByredTask = Database["public"]["Tables"]["byred_tasks"]["Row"]
export type ByredTaskInsert = Database["public"]["Tables"]["byred_tasks"]["Insert"]
export type ByredTaskUpdate = Database["public"]["Tables"]["byred_tasks"]["Update"]

export type ByredTaskComment = Database["public"]["Tables"]["byred_task_comments"]["Row"]
export type ByredTaskCommentInsert = Database["public"]["Tables"]["byred_task_comments"]["Insert"]

export type ByredLead = Database["public"]["Tables"]["byred_leads"]["Row"]
export type ByredLeadInsert = Database["public"]["Tables"]["byred_leads"]["Insert"]
export type ByredLeadUpdate = Database["public"]["Tables"]["byred_leads"]["Update"]

export type ByredActivity = Database["public"]["Tables"]["byred_activities"]["Row"]
export type ByredActivityInsert = Database["public"]["Tables"]["byred_activities"]["Insert"]
export type ByredActivityUpdate = Database["public"]["Tables"]["byred_activities"]["Update"]

export type ByredDailyBrief = Database["public"]["Tables"]["byred_daily_briefs"]["Row"]
export type ByredDailyBriefInsert = Database["public"]["Tables"]["byred_daily_briefs"]["Insert"]
export type ByredDailyBriefUpdate = Database["public"]["Tables"]["byred_daily_briefs"]["Update"]

export type OsAgentReceipt = Database["public"]["Tables"]["os_agent_receipts"]["Row"]
export type OsAgentReceiptInsert = Database["public"]["Tables"]["os_agent_receipts"]["Insert"]
export type OsAgentReceiptUpdate = Database["public"]["Tables"]["os_agent_receipts"]["Update"]

export type OsAiProviderRun = Database["public"]["Tables"]["os_ai_provider_runs"]["Row"]
export type OsAiProviderRunInsert = Database["public"]["Tables"]["os_ai_provider_runs"]["Insert"]
export type OsAiProviderRunUpdate = Database["public"]["Tables"]["os_ai_provider_runs"]["Update"]

// Daily brief summary structure
export type DailyBriefSummary = {
  headline: string
  top_3: Array<string | { title: string }>
  warnings: string[]
  next_action: string
}

// Task status and priority enums
export const TASK_STATUSES = ["not_started", "in_progress", "overdue", "done", "blocked", "cancelled"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const AI_MODES = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"] as const
export type AiMode = (typeof AI_MODES)[number]

// Lead stages
export const LEAD_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST"] as const
export type LeadStage = (typeof LEAD_STAGES)[number]

// User roles
export const USER_ROLES = ["admin", "member", "viewer"] as const
export type UserRole = (typeof USER_ROLES)[number]

// Tenant types
export const TENANT_TYPES = ["parent", "service", "product"] as const
export type TenantType = (typeof TENANT_TYPES)[number]

// Calendar event types
export type OsCalendarEvent = Database["public"]["Tables"]["os_calendar_events"]["Row"]
export type OsCalendarEventInsert = Database["public"]["Tables"]["os_calendar_events"]["Insert"]
export type OsCalendarEventAttendee = Database["public"]["Tables"]["os_calendar_event_attendees"]["Row"]

// Import batch types
export type ByredImportBatch = Database["public"]["Tables"]["byred_import_batches"]["Row"]
export type ByredImportBatchInsert = Database["public"]["Tables"]["byred_import_batches"]["Insert"]
