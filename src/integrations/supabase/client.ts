import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

// Custom fetch with retry logic and increased timeout
const fetchWithRetry = async (url: RequestInfo | URL, options: RequestInit = {}, retries = 3): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);

    // Retry on network errors or timeouts
    if (retries > 0 && error instanceof Error &&
        (error.name === 'AbortError' ||
         error.name === 'TypeError' ||
         error.message.includes('fetch') ||
         error.message.includes('network'))) {
      console.warn(`Fetch failed (${error.name}), retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'egea-productivity'
    },
    fetch: fetchWithRetry
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
})

// Tipos básicos para compatibilidad
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          full_name: string
          email: string | null
          phone: string | null
          role: 'admin' | 'responsable' | 'operario'
          status: 'activo' | 'vacaciones' | 'baja'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      vehicles: {
        Row: {
          id: string
          name: string
          type: 'jumper' | 'camion' | 'furgoneta' | 'otro'
          license_plate: string | null
          capacity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      templates: {
        Row: {
          id: string
          name: string
          template_type: string
          category: string | null
          fields: any[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['templates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['templates']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      screens: {
        Row: {
          id: string
          name: string
          screen_type: 'data' | 'display'
          screen_group: string | null
          template_id: string | null
          next_screen_id: string | null
          refresh_interval_sec: number
          header_color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['screens']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['screens']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      screen_data: {
        Row: {
          id: string
          screen_id: string
          data: Record<string, any>
          state: 'pendiente' | 'urgente' | 'en fabricacion' | 'a la espera' | 'terminado' | 'incidente' | 'arreglo'
          status: 'pendiente' | 'acabado' | 'en progreso'
          start_date: string | null
          end_date: string | null
          location: string | null
          responsible_profile_id: string | null
          assigned_to: string | null
          checkin_token: string | null
          order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['screen_data']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['screen_data']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      task_profiles: {
        Row: {
          id: string
          task_id: string
          profile_id: string
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_profiles']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Omit<Database['public']['Tables']['task_profiles']['Row'], 'id' | 'assigned_at'>>
      }
      task_vehicles: {
        Row: {
          id: string
          task_id: string
          vehicle_id: string
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_vehicles']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Omit<Database['public']['Tables']['task_vehicles']['Row'], 'id' | 'assigned_at'>>
      }
      archived_tasks: {
        Row: {
          id: string
          archived_at: string
          data: Record<string, any>
          status: string
          state: string
          start_date: string | null
          end_date: string | null
          location: string | null
          responsible_profile_id: string | null
          responsible_name: string | null
          assigned_users: any[]
          assigned_vehicles: any[]
          archived_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['archived_tasks']['Row'], 'id' | 'archived_at'>
        Update: Partial<Omit<Database['public']['Tables']['archived_tasks']['Row'], 'id' | 'archived_at'>>
      }
      user_availability: {
        Row: {
          id: string
          profile_id: string
          start_date: string
          end_date: string
          status: 'disponible' | 'no disponible' | 'vacaciones'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_availability']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['user_availability']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      shared_plans: {
        Row: {
          id: string
          token: string
          plan_date: string
          tasks: any[]
          expires_at: string
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shared_plans']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['shared_plans']['Row'], 'id' | 'created_at'>>
      }
      system_config: {
        Row: {
          id: string
          key: string
          value: any
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['system_config']['Row'], 'id' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['system_config']['Row'], 'id' | 'updated_at'>>
      }
      groups: {
        Row: {
          id: string
          name: string
          color: string
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      profile_groups: {
        Row: {
          id: string
          profile_id: string
          group_id: string
          role: 'líder' | 'miembro'
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['profile_groups']['Row'], 'id' | 'joined_at'>
        Update: Partial<Omit<Database['public']['Tables']['profile_groups']['Row'], 'id' | 'joined_at'>>
      }
      task_notifications: {
        Row: {
          id: string
          profile_id: string
          task_ids: string[]
          plan_date: string
          access_token: string
          sent_at: string
          viewed_at: string | null
          expires_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['task_notifications']['Row'], 'id' | 'sent_at'>
        Update: Partial<Omit<Database['public']['Tables']['task_notifications']['Row'], 'id' | 'sent_at'>>
      }
      user_sessions: {
        Row: {
          id: string
          profile_id: string
          session_token: string
          last_seen: string
          is_online: boolean
          user_agent: string | null
          ip_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['user_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      role_permissions: {
        Row: {
          id: string
          role: 'admin' | 'responsable' | 'operario'
          page: string
          can_view: boolean
          can_edit: boolean
          can_delete: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['role_permissions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['role_permissions']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      communication_logs: {
        Row: {
          id: string
          type: 'whatsapp' | 'email' | 'push'
          recipient: string
          subject: string | null
          message: string
          status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
          sent_at: string | null
          delivered_at: string | null
          error_message: string | null
          metadata: Record<string, any>
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['communication_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['communication_logs']['Row'], 'id' | 'created_at'>>
      }
    }
    Views: {
      detailed_tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          screen_id: string
          data: Record<string, any>
          state: string
          status: string
          start_date: string | null
          end_date: string | null
          location: string | null
          responsible_profile_id: string | null
          assigned_to: string | null
          checkin_token: string | null
          order: number
          screen_name: string | null
          screen_type: string | null
          screen_group: string | null
          next_screen_id: string | null
          header_color: string | null
          screen_is_active: boolean | null
          refresh_interval_sec: number | null
          responsible_name: string | null
          responsible_email: string | null
          responsible_phone: string | null
          responsible_role: string | null
          responsible_status: string | null
          responsible_avatar: string | null
          assigned_name: string | null
          assigned_email: string | null
          assigned_phone: string | null
          assigned_role: string | null
          assigned_status: string | null
          site: string | null
          client: string | null
          address: string | null
          description: string | null
          notes: string | null
          vehicle_type: string | null
          assigned_profiles: any[]
          assigned_vehicles: any[]
          assigned_profiles_count: number
          assigned_vehicles_count: number
          is_completed: boolean
          is_urgent: boolean
          is_current: boolean
          is_overdue: boolean
          is_future: boolean
          days_from_start: number | null
          priority_order: number
        }
      }
      user_workload: {
        Row: {
          profile_id: string
          full_name: string
          email: string | null
          role: string
          status: string
          total_tasks: number
          active_tasks: number
          urgent_tasks: number
          overdue_tasks: number
          today_tasks: number
          current_tasks: number
          working_groups: string | null
        }
      }
      vehicle_utilization: {
        Row: {
          vehicle_id: string
          name: string
          type: string
          license_plate: string | null
          capacity: number
          is_active: boolean
          total_assignments: number
          active_assignments: number
          today_assignments: number
          current_assignments: number
          utilization_percentage: number
        }
      }
      task_summary: {
        Row: {
          screen_group: string | null
          state: string
          status: string
          task_count: number
          today_count: number
          overdue_count: number
          urgent_count: number
          completed_count: number
          completion_percentage: number
        }
      }
    }
    Functions: {
      upsert_task: {
        Args: {
          p_task_id?: string
          p_screen_id: string
          p_data?: Record<string, any>
          p_state?: string
          p_status?: string
          p_start_date?: string
          p_end_date?: string
          p_location?: string
          p_responsible_profile_id?: string
          p_assigned_to?: string
          p_assigned_profiles?: string[]
          p_assigned_vehicles?: string[]
        }
        Returns: {
          task_id: string
          action: string
        }
      }
      archive_completed_tasks: {
        Args: {
          p_days_old?: number
        }
        Returns: {
          archived_count: number
          message: string
        }
      }
      generate_checkin_token: {
        Args: {
          p_task_id: string
        }
        Returns: string
      }
      complete_checkin: {
        Args: {
          p_token: string
          p_location?: string
        }
        Returns: {
          success: boolean
          message: string
          task_id: string
        }
      }
      get_dashboard_stats: {
        Args: {
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          total_tasks: number
          completed_tasks: number
          pending_tasks: number
          urgent_tasks: number
          overdue_tasks: number
          active_users: number
          active_vehicles: number
          completion_rate: number
        }
      }
      get_user_groups: {
        Args: {
          user_profile_id: string
        }
        Returns: {
          group_id: string
          group_name: string
          group_color: string
          role: string
        }[]
      }
      has_permission: {
        Args: {
          user_role: string
          page: string
          permission: string
        }
        Returns: boolean
      }
    }
  }
}

// Exportar tipos para uso en componentes
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type Screen = Database['public']['Tables']['screens']['Row']
export type ScreenData = Database['public']['Tables']['screen_data']['Row']
export type DetailedTask = Database['public']['Views']['detailed_tasks']['Row']
export type UserWorkload = Database['public']['Views']['user_workload']['Row']
export type VehicleUtilization = Database['public']['Views']['vehicle_utilization']['Row']
export type TaskSummary = Database['public']['Views']['task_summary']['Row']

// Tipos de formularios
export type TaskFormData = {
  screen_id: string
  data: Record<string, any>
  state: string
  status: string
  start_date: string | null
  end_date: string | null
  location: string | null
  responsible_profile_id: string | null
  assigned_to: string | null
  assigned_profiles: string[]
  assigned_vehicles: string[]
}

export type ProfileFormData = {
  auth_user_id?: string
  full_name: string
  email: string
  phone: string
  role: string
  status: string
  avatar_url?: string
}

export type VehicleFormData = {
  name: string
  type: string
  license_plate: string
  capacity: number
  is_active: boolean
}

export type TemplateFormData = {
  name: string
  template_type: string
  category: string
  fields: any[]
  is_active: boolean
}

export type ScreenFormData = {
  name: string
  screen_type: string
  screen_group: string
  template_id: string | null
  next_screen_id: string | null
  refresh_interval_sec: number
  header_color: string
  is_active: boolean
}

// Tipos de filtros
export interface TaskFilters {
  state?: string[]
  status?: string[]
  screen_group?: string[]
  responsible_profile_id?: string[]
  date_from?: string
  date_to?: string
  search?: string
}

export interface UserFilters {
  role?: string[]
  status?: string[]
  group_id?: string[]
  search?: string
}

export interface VehicleFilters {
  type?: string[]
  is_active?: boolean
  search?: string
}

// Tipos de utilidad
export type UserRole = 'admin' | 'responsable' | 'operario'
export type UserStatus = 'activo' | 'vacaciones' | 'baja'
export type TaskState = 'pendiente' | 'urgente' | 'en fabricacion' | 'a la espera' | 'terminado' | 'incidente' | 'arreglo'
export type TaskStatus = 'pendiente' | 'acabado' | 'en progreso'
export type VehicleType = 'jumper' | 'camion' | 'furgoneta' | 'otro'
export type ScreenType = 'data' | 'display'
export type ScreenGroup = 'Instalaciones' | 'Confección' | 'Tapicería'
export type CommunicationType = 'whatsapp' | 'email' | 'push'
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

export type SortDirection = 'asc' | 'desc'
export type SortField = 'created_at' | 'start_date' | 'end_date' | 'state' | 'client' | 'location'

export interface SortOption {
  field: SortField
  direction: SortDirection
}

export interface PaginationOptions {
  page: number
  pageSize: number
}

export interface QueryOptions extends PaginationOptions {
  sort?: SortOption
  filters?: TaskFilters | UserFilters | VehicleFilters
}