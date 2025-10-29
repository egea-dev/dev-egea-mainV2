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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      archived_tasks: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          assigned_users: Json | null
          assigned_vehicles: Json | null
          data: Json | null
          end_date: string | null
          id: string
          location: string | null
          responsible_name: string | null
          responsible_profile_id: string | null
          start_date: string | null
          state: string | null
          status: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_users?: Json | null
          assigned_vehicles?: Json | null
          data?: Json | null
          end_date?: string | null
          id: string
          location?: string | null
          responsible_name?: string | null
          responsible_profile_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_users?: Json | null
          assigned_vehicles?: Json | null
          data?: Json | null
          end_date?: string | null
          id?: string
          location?: string | null
          responsible_name?: string | null
          responsible_profile_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_tasks_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_tasks_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profile_groups: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          profile_id: string
          role: string | null
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          profile_id: string
          role?: string | null
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_groups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_groups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          page: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          page: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          page?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      screen_data: {
        Row: {
          assigned_to: string | null
          checkin_token: string | null
          created_at: string | null
          data: Json | null
          end_date: string | null
          id: string
          location: string | null
          location_metadata: Json
          order: number | null
          responsible_profile_id: string | null
          screen_id: string
          start_date: string | null
          state: string
          status: string
          updated_at: string | null
          work_site_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          checkin_token?: string | null
          created_at?: string | null
          data?: Json | null
          end_date?: string | null
          id?: string
          location?: string | null
          location_metadata?: Json
          order?: number | null
          responsible_profile_id?: string | null
          screen_id: string
          start_date?: string | null
          state?: string
          status?: string
          updated_at?: string | null
          work_site_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          checkin_token?: string | null
          created_at?: string | null
          data?: Json | null
          end_date?: string | null
          id?: string
          location?: string | null
          location_metadata?: Json
          order?: number | null
          responsible_profile_id?: string | null
          screen_id?: string
          start_date?: string | null
          state?: string
          status?: string
          updated_at?: string | null
          work_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_data_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_data_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "screen_data_responsible_profile_id_fkey"
            columns: ["responsible_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_data_responsible_profile_id_fkey"
            columns: ["responsible_profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "screen_data_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_data_work_site_id_fkey"
            columns: ["work_site_id"]
            isOneToOne: false
            referencedRelation: "work_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          created_at: string | null
          header_color: string | null
          id: string
          is_active: boolean | null
          name: string
          next_screen_id: string | null
          refresh_interval_sec: number | null
          screen_group: string | null
          screen_type: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          header_color?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          next_screen_id?: string | null
          refresh_interval_sec?: number | null
          screen_group?: string | null
          screen_type: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          header_color?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          next_screen_id?: string | null
          refresh_interval_sec?: number | null
          screen_group?: string | null
          screen_type?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_next_screen_id_fkey"
            columns: ["next_screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          plan_date: string
          tasks: Json | null
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_date: string
          tasks?: Json | null
          token: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_date?: string
          tasks?: Json | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      system_config: {
        Row: {
          category: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          depends_on_task_id: string
          task_id: string
        }
        Insert: {
          depends_on_task_id: string
          task_id: string
        }
        Update: {
          depends_on_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "detailed_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "screen_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "detailed_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "screen_data"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          access_token: string
          created_by: string | null
          expires_at: string | null
          id: string
          plan_date: string
          profile_id: string
          sent_at: string | null
          task_ids: string[] | null
          viewed_at: string | null
        }
        Insert: {
          access_token: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_date: string
          profile_id: string
          sent_at?: string | null
          task_ids?: string[] | null
          viewed_at?: string | null
        }
        Update: {
          access_token?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_date?: string
          profile_id?: string
          sent_at?: string | null
          task_ids?: string[] | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "task_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      task_profiles: {
        Row: {
          assigned_at: string | null
          id: string
          profile_id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          profile_id: string
          task_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "task_profiles_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "detailed_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_profiles_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "screen_data"
            referencedColumns: ["id"]
          },
        ]
      }
      task_vehicles: {
        Row: {
          assigned_at: string | null
          id: string
          task_id: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          task_id: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          task_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_vehicles_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "detailed_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_vehicles_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "screen_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_utilization"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "task_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          created_at: string | null
          fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      work_sites: {
        Row: {
          address: string | null
          alias: string | null
          city: string | null
          created_at: string | null
          id: string
          imagotipo_enabled: boolean
          is_active: boolean
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          notes: string | null
          postal_code: string | null
          province: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          alias?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          imagotipo_enabled?: boolean
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          notes?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          alias?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          imagotipo_enabled?: boolean
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_availability: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          profile_id: string
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          profile_id: string
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          profile_id?: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          is_online: boolean | null
          last_seen: string | null
          profile_id: string
          session_token: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_seen?: string | null
          profile_id: string
          session_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_seen?: string | null
          profile_id?: string
          session_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          license_plate: string | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      detailed_tasks: {
        Row: {
          address: string | null
          assigned_email: string | null
          assigned_name: string | null
          assigned_phone: string | null
          assigned_profiles: Json | null
          assigned_profiles_count: number | null
          assigned_role: string | null
          assigned_status: string | null
          assigned_to: string | null
          assigned_vehicles: Json | null
          assigned_vehicles_count: number | null
          checkin_token: string | null
          client: string | null
          created_at: string | null
          data: Json | null
          days_from_start: number | null
          description: string | null
          end_date: string | null
          header_color: string | null
          id: string | null
          is_completed: boolean | null
          is_current: boolean | null
          is_future: boolean | null
          is_overdue: boolean | null
          is_urgent: boolean | null
          location: string | null
          location_metadata: Json | null
          next_screen_id: string | null
          notes: string | null
          order: number | null
          priority_order: number | null
          refresh_interval_sec: number | null
          responsible_avatar: string | null
          responsible_email: string | null
          responsible_name: string | null
          responsible_phone: string | null
          responsible_profile_id: string | null
          responsible_role: string | null
          responsible_status: string | null
          screen_group: string | null
          screen_id: string | null
          screen_is_active: boolean | null
          screen_name: string | null
          screen_type: string | null
          site: string | null
          start_date: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          work_site_address: string | null
          work_site_alias: string | null
          work_site_city: string | null
          work_site_id: string | null
          work_site_imagotipo_enabled: boolean | null
          work_site_latitude: number | null
          work_site_longitude: number | null
          work_site_maps_url: string | null
          work_site_name: string | null
          work_site_postal_code: string | null
          work_site_province: string | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_data_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_data_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "screen_data_responsible_profile_id_fkey"
            columns: ["responsible_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_data_responsible_profile_id_fkey"
            columns: ["responsible_profile_id"]
            isOneToOne: false
            referencedRelation: "user_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "screen_data_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_next_screen_id_fkey"
            columns: ["next_screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      task_summary: {
        Row: {
          completed_count: number | null
          completion_percentage: number | null
          overdue_count: number | null
          screen_group: string | null
          state: string | null
          status: string | null
          task_count: number | null
          today_count: number | null
          urgent_count: number | null
        }
        Relationships: []
      }
      user_workload: {
        Row: {
          active_tasks: number | null
          current_tasks: number | null
          email: string | null
          full_name: string | null
          overdue_tasks: number | null
          profile_id: string | null
          role: string | null
          status: string | null
          today_tasks: number | null
          total_tasks: number | null
          urgent_tasks: number | null
          working_groups: string | null
        }
        Relationships: []
      }
      vehicle_utilization: {
        Row: {
          name: string | null
          total_tasks_assigned: number | null
          type: string | null
          vehicle_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_upsert_profile: {
        Args: {
          p_email?: string
          p_full_name: string
          p_phone?: string
          p_profile_id?: string
          p_role?: string
          p_status?: string
        }
        Returns: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: string
          status: string
          updated_at: string | null
        }
      }
      archive_completed_tasks: {
        Args: { p_days_old?: number }
        Returns: {
          archived_count: number
          message: string
        }[]
      }
      archive_task_by_id: {
        Args: { p_task_id: string }
        Returns: {
          archived: boolean
          message: string
        }[]
      }
      can_access_task: {
        Args: { task_id: string }
        Returns: boolean
      }
      complete_checkin: {
        Args: { p_location?: string; p_token: string }
        Returns: {
          message: string
          success: boolean
          task_id: string
        }[]
      }
      current_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_user_id: string
          avatar_url: string
          email: string
          full_name: string
          id: string
          role: string
          status: string
        }[]
      }
      generate_checkin_token: {
        Args: { p_task_id: string }
        Returns: string
      }
      get_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_dashboard_stats: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          active_users: number
          active_vehicles: number
          completed_tasks: number
          completion_rate: number
          overdue_tasks: number
          pending_tasks: number
          total_tasks: number
          urgent_tasks: number
        }[]
      }
      get_user_groups: {
        Args: { user_profile_id: string }
        Returns: {
          group_color: string
          group_id: string
          group_name: string
          role: string
        }[]
      }
      has_permission: {
        Args:
          | { action: string; resource: string; user_role: string }
          | { p_permission: string }
        Returns: boolean
      }
      has_profile_management_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      upsert_task: {
        Args:
          | {
              p_assigned_profiles?: string[]
              p_assigned_to?: string
              p_work_site_id?: string
              p_assigned_vehicles?: string[]
              p_data?: Json
              p_end_date?: string
              p_location?: string
              p_location_metadata?: Json
              p_responsible_profile_id?: string
              p_screen_id?: string
              p_start_date?: string
              p_state?: string
              p_status?: string
              p_task_id?: string
            }
          | {
              p_assigned_users_ids: string[]
              p_assigned_vehicles_ids: string[]
              p_data: Json
              p_date: string
              p_dependencies_ids: string[]
              p_id: string
              p_order: number
              p_responsible_profile_id: string
              p_screen_id: string
              p_state: string
              p_status: string
            }
        Returns: undefined
      }
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
