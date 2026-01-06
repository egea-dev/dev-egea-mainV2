// Types generados para la base de datos de Egea Productivity App
// Basado en la estructura de la base de datos PostgreSQL

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue | null;
}
export type JsonArray = JsonValue[];
export type Json = JsonValue;

// =====================================================================
// TIPOS DE TABLAS PRINCIPALES
// =====================================================================

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: 'admin' | 'manager' | 'responsable' | 'operario' | 'produccion' | 'envios' | 'almacen' | 'comercial';
  status: 'activo' | 'vacaciones' | 'baja';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'jumper' | 'camion' | 'furgoneta' | 'otro';
  license_plate: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  template_type: string;
  category: string | null;
  fields: JsonArray;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Screen {
  id: string;
  name: string;
  screen_type: 'data' | 'display';
  screen_group: string | null;
  template_id: string | null;
  next_screen_id: string | null;
  refresh_interval_sec: number;
  header_color: string;
  is_active: boolean;
  dashboard_section: string | null;
  dashboard_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenData {
  id: string;
  screen_id: string;
  data: JsonObject;
  state: 'pendiente' | 'urgente' | 'en fabricacion' | 'a la espera' | 'terminado' | 'incidente' | 'arreglo';
  status: 'pendiente' | 'acabado' | 'en progreso';
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  location_metadata: JsonObject;
  responsible_profile_id: string | null;
  assigned_to: string | null;
  checkin_token: string | null;
  work_site_id: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSite {
  id: string;
  name: string;
  alias: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  notes: string | null;
  imagotipo_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskProfile {
  id: string;
  task_id: string;
  profile_id: string;
  assigned_at: string;
}

export interface TaskVehicle {
  id: string;
  task_id: string;
  vehicle_id: string;
  assigned_at: string;
}

export interface ArchivedTask {
  id: string;
  archived_at: string;
  data: JsonObject;
  status: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  responsible_profile_id: string | null;
  responsible_name: string | null;
  assigned_users: JsonArray;
  assigned_vehicles: JsonArray;
  archived_by: string | null;
}

export interface UserAvailability {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  status: 'disponible' | 'no disponible' | 'vacaciones';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedPlan {
  id: string;
  token: string;
  plan_date: string;
  tasks: JsonArray;
  expires_at: string;
  created_by: string | null;
  created_at: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: JsonValue;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// =====================================================================
// TIPOS DE GRUPOS Y COMUNICACIONES
// =====================================================================

export interface Group {
  id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileGroup {
  id: string;
  profile_id: string;
  group_id: string;
  role: 'líder' | 'miembro';
  joined_at: string;
}

export interface TaskNotification {
  id: string;
  profile_id: string;
  task_ids: string[];
  plan_date: string;
  access_token: string;
  sent_at: string;
  viewed_at: string | null;
  expires_at: string;
  created_by: string | null;
}

export interface UserSession {
  id: string;
  profile_id: string;
  session_token: string;
  last_seen: string;
  is_online: boolean;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  resource: string;
  action: string;
  granted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  type: 'whatsapp' | 'email' | 'push';
  recipient: string;
  subject: string | null;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  metadata: JsonObject;
  created_by: string | null;
  created_at: string;
}

// =====================================================================
// TIPOS DE VISTAS OPTIMIZADAS
// =====================================================================

export interface DetailedTask {
  id: string;
  created_at: string;
  updated_at: string;
  screen_id: string;
  data: JsonObject;
  state: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  location_metadata: JsonObject;
  work_site_id: string | null;
  responsible_profile_id: string | null;
  assigned_to: string | null;
  checkin_token: string | null;
  order: number;

  // Información del screen
  screen_name: string | null;
  screen_type: string | null;
  screen_group: string | null;
  next_screen_id: string | null;
  header_color: string | null;
  screen_is_active: boolean | null;
  refresh_interval_sec: number | null;

  // Información del work site
  work_site_name: string | null;
  work_site_alias: string | null;
  work_site_address: string | null;
  work_site_city: string | null;
  work_site_province: string | null;
  work_site_postal_code: string | null;
  work_site_latitude: number | null;
  work_site_longitude: number | null;
  work_site_maps_url: string | null;
  work_site_imagotipo_enabled: boolean | null;

  // Información del responsable
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone: string | null;
  responsible_role: string | null;
  responsible_status: string | null;
  responsible_avatar: string | null;

  // Información del asignado
  assigned_name: string | null;
  assigned_email: string | null;
  assigned_phone: string | null;
  assigned_role: string | null;
  assigned_status: string | null;

  // Campos JSON aplanados
  site: string | null;
  client: string | null;
  address: string | null;
  description: string | null;
  notes: string | null;
  vehicle_type: string | null;

  // Arrays agregados
  assigned_profiles: JsonArray;
  assigned_vehicles: JsonArray;
  assigned_profiles_count: number;
  assigned_vehicles_count: number;

  // Indicadores útiles
  is_completed: boolean;
  is_urgent: boolean;
  is_current: boolean;
  is_overdue: boolean;
  is_future: boolean;
  days_from_start: number | null;
  priority_order: number;
}

export interface UserWorkload {
  profile_id: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
  total_tasks: number;
  active_tasks: number;
  urgent_tasks: number;
  overdue_tasks: number;
  today_tasks: number;
  current_tasks: number;
  working_groups: string | null;
}

export interface VehicleUtilization {
  vehicle_id: string;
  name: string;
  type: string;
  license_plate: string | null;
  capacity: number;
  is_active: boolean;
  total_assignments: number;
  active_assignments: number;
  today_assignments: number;
  current_assignments: number;
  utilization_percentage: number;
}

export interface TaskSummary {
  screen_group: string | null;
  state: string;
  status: string;
  task_count: number;
  today_count: number;
  overdue_count: number;
  urgent_count: number;
  completed_count: number;
  completion_percentage: number;
}

// =====================================================================
// TIPOS PARA FORMULARIOS Y COMPONENTES
// =====================================================================

export interface TaskFormData {
  screen_id: string;
  data: JsonObject;
  state: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  location_metadata: JsonObject;
  work_site_id: string | null;
  responsible_profile_id: string | null;
  assigned_to: string | null;
  assigned_profiles: string[];
  assigned_vehicles: string[];
}

export interface ProfileFormData {
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatar_url?: string;
}

export interface VehicleFormData {
  name: string;
  type: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
}

export interface TemplateFormData {
  name: string;
  template_type: string;
  category: string;
  fields: JsonArray;
  is_active: boolean;
}

export interface ScreenFormData {
  name: string;
  screen_type: string;
  screen_group: string;
  template_id: string | null;
  next_screen_id: string | null;
  refresh_interval_sec: number;
  header_color: string;
  is_active: boolean;
}

// =====================================================================
// TIPOS PARA RESPUESTAS DE API
// =====================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  urgent_tasks: number;
  overdue_tasks: number;
  active_users: number;
  active_vehicles: number;
  completion_rate: number;
}

// =====================================================================
// TIPOS PARA COMUNICACIONES
// =====================================================================

export interface WhatsAppRequest {
  phoneNumbers: string[];
  message: string;
  taskId?: string;
  planDate?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
}

export interface NotificationSettings {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
  dailySummary: boolean;
  urgentTasks: boolean;
}

// =====================================================================
// TIPOS PARA FILTROS Y BÚSQUEDA
// =====================================================================

export interface TaskFilters {
  state?: string[];
  status?: string[];
  screen_group?: string[];
  responsible_profile_id?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  client_id?: string;
  selectedGroups?: string[];
}

export interface UserFilters {
  role?: string[];
  status?: string[];
  group_id?: string[];
  search?: string;
}

export interface VehicleFilters {
  type?: string[];
  is_active?: boolean;
  search?: string;
}

// =====================================================================
// TIPOS PARA CALENDARIO Y PLANIFICACIÓN
// =====================================================================

export interface CalendarEvent<
  Resource = unknown,
  ExtendedProps extends Record<string, unknown> = Record<string, unknown>
> {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: Resource;
  extendedProps?: ExtendedProps;
}

export interface PlanDay {
  date: string;
  tasks: DetailedTask[];
  total_tasks: number;
  completed_tasks: number;
  urgent_tasks: number;
}

// =====================================================================
// TIPOS PARA PERMISOS DE USUARIO
// =====================================================================

export interface UserPermission {
  id: string;
  user_id: string;
  module: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// TIPOS DE UNIÓN (DATABASE TYPES)
// =====================================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      vehicles: {
        Row: Vehicle;
        Insert: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>;
      };
      screens: {
        Row: Screen;
        Insert: Omit<Screen, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Screen, 'id' | 'created_at' | 'updated_at'>>;
      };
      screen_data: {
        Row: ScreenData;
        Insert: Omit<ScreenData, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ScreenData, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_profiles: {
        Row: TaskProfile;
        Insert: Omit<TaskProfile, 'id' | 'assigned_at'>;
        Update: Partial<Omit<TaskProfile, 'id' | 'assigned_at'>>;
      };
      task_vehicles: {
        Row: TaskVehicle;
        Insert: Omit<TaskVehicle, 'id' | 'assigned_at'>;
        Update: Partial<Omit<TaskVehicle, 'id' | 'assigned_at'>>;
      };
      archived_tasks: {
        Row: ArchivedTask;
        Insert: Omit<ArchivedTask, 'id' | 'archived_at'>;
        Update: Partial<Omit<ArchivedTask, 'id' | 'archived_at'>>;
      };
      user_availability: {
        Row: UserAvailability;
        Insert: Omit<UserAvailability, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserAvailability, 'id' | 'created_at' | 'updated_at'>>;
      };
      shared_plans: {
        Row: SharedPlan;
        Insert: Omit<SharedPlan, 'id' | 'created_at'>;
        Update: Partial<Omit<SharedPlan, 'id' | 'created_at'>>;
      };
      system_config: {
        Row: SystemConfig;
        Insert: Omit<SystemConfig, 'id' | 'updated_at'>;
        Update: Partial<Omit<SystemConfig, 'id' | 'updated_at'>>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Group, 'id' | 'created_at' | 'updated_at'>>;
      };
      profile_groups: {
        Row: ProfileGroup;
        Insert: Omit<ProfileGroup, 'id' | 'joined_at'>;
        Update: Partial<Omit<ProfileGroup, 'id' | 'joined_at'>>;
      };
      task_notifications: {
        Row: TaskNotification;
        Insert: Omit<TaskNotification, 'id' | 'sent_at'>;
        Update: Partial<Omit<TaskNotification, 'id' | 'sent_at'>>;
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSession, 'id' | 'created_at' | 'updated_at'>>;
      };
      role_permissions: {
        Row: RolePermission;
        Insert: Omit<RolePermission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RolePermission, 'id' | 'created_at' | 'updated_at'>>;
      };
      communication_logs: {
        Row: CommunicationLog;
        Insert: Omit<CommunicationLog, 'id' | 'created_at'>;
        Update: Partial<Omit<CommunicationLog, 'id' | 'created_at'>>;
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Omit<UserPermission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserPermission, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      detailed_tasks: {
        Row: DetailedTask;
      };
      user_workload_stats: {
        Row: {
          profile_id: string;
          active_tasks_count: number;
        };
      };
      user_workload: {
        Row: UserWorkload;
      };
      vehicle_utilization: {
        Row: VehicleUtilization;
      };
      task_summary: {
        Row: TaskSummary;
      };
    };
    Functions: {
      upsert_task: {
        Args: {
          p_task_id?: string;
          p_screen_id: string;
          p_data?: JsonObject;
          p_state?: string;
          p_status?: string;
          p_start_date?: string;
          p_end_date?: string;
          p_location?: string;
          p_location_metadata?: JsonObject;
          p_work_site_id?: string;
          p_responsible_profile_id?: string;
          p_assigned_to?: string;
          p_assigned_profiles?: string[];
          p_assigned_vehicles?: string[];
        };
        Returns: {
          result_task_id: string;
          result_action: string;
        };
      };
      archive_completed_tasks: {
        Args: {
          p_days_old?: number;
        };
        Returns: {
          archived_count: number;
          message: string;
        };
      };
      generate_checkin_token: {
        Args: {
          p_task_id: string;
        };
        Returns: string;
      };
      complete_checkin: {
        Args: {
          p_token: string;
          p_location?: string;
        };
        Returns: {
          success: boolean;
          message: string;
          task_id: string;
        };
      };
      get_dashboard_stats: {
        Args: {
          p_date_from?: string;
          p_date_to?: string;
        };
        Returns: DashboardStats;
      };
      get_user_groups: {
        Args: {
          user_profile_id: string;
        };
        Returns: {
          group_id: string;
          group_name: string;
          group_color: string;
          role: string;
        }[];
      };
      has_permission: {
        Args: {
          user_role: string;
          resource: string;
          action: string;
        };
        Returns: boolean;
      };
      register_arrival: {
        Args: {
          p_profile_id: string;
          p_task_id: string;
          p_start_location?: JsonObject;
          p_device_info?: JsonObject;
          p_metadata?: JsonObject;
        };
        Returns: string;
      };
      register_departure: {
        Args: {
          p_session_id: string;
          p_end_location?: JsonObject;
          p_metadata?: JsonObject;
        };
        Returns: boolean;
      };
    };
  };
};

// =====================================================================
// TIPOS UTILITARIOS
// =====================================================================

export type UserRole = 'admin' | 'manager' | 'responsable' | 'operario' | 'produccion' | 'envios' | 'almacen' | 'comercial';
export type UserStatus = 'activo' | 'vacaciones' | 'baja';
export type TaskState = 'pendiente' | 'urgente' | 'en fabricacion' | 'a la espera' | 'terminado' | 'incidente' | 'arreglo';
export type TaskStatus = 'pendiente' | 'acabado' | 'en progreso';
export type VehicleType = 'jumper' | 'camion' | 'furgoneta' | 'otro';
export type ScreenType = 'data' | 'display';
export type ScreenGroup = 'Instalaciones' | 'Confección' | 'Tapicería';
export type CommunicationType = 'whatsapp' | 'email' | 'push';
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export type SortDirection = 'asc' | 'desc';
export type SortField = 'created_at' | 'start_date' | 'end_date' | 'state' | 'client' | 'location';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface QueryOptions extends PaginationOptions {
  sort?: SortOption;
  filters?: TaskFilters | UserFilters | VehicleFilters;
}
