import type { JsonObject, JsonValue, TaskState, TaskStatus, VehicleType } from '@/integrations/supabase/types';

export type Profile = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  public_url?: string | null;
  role: 'admin' | 'manager' | 'responsable' | 'operario' | 'produccion' | 'envios' | 'almacen' | 'comercial';
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: 'activo' | 'baja' | 'vacaciones';
  active_tasks_count?: number;
};

export type Vehicle = {
  id: string;
  name: string;
  type: VehicleType | string;
  license_plate?: string | null;
  capacity?: number;
  is_active?: boolean;
  km?: number;
  status?: 'normal' | 'accidentado' | 'revision';
};

export interface TaskData extends JsonObject {
  site?: string | null;
  description?: string | null;
}

export type Task = {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  order: number;
  state: TaskState;
  status: TaskStatus;
  location: string | null;
  location_metadata?: JsonObject;
  work_site_id?: string | null;
  work_site_name?: string | null;
  work_site_alias?: string | null;
  work_site_address?: string | null;
  work_site_city?: string | null;
  work_site_province?: string | null;
  work_site_postal_code?: string | null;
  work_site_latitude?: number | null;
  work_site_longitude?: number | null;
  work_site_maps_url?: string | null;
  work_site_imagotipo_enabled?: boolean | null;
  data: TaskData;
  responsible_profile_id: string | null;

  // Relaciones anidadas que vienen de Supabase
  responsible?: Profile | null;
  assigned_users: Profile[];
  assigned_vehicles: Vehicle[];

  // Campos aplanados para conveniencia en el frontend
  site?: string;
  description?: string;

  // Estos campos vienen de las tablas de unión y pueden no estar siempre presentes
  task_profiles?: { profiles: Profile }[];
  task_vehicles?: { vehicles: Vehicle }[];
};

export type SessionLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  source?: 'geolocation' | 'manual';
  note?: string | null;
  collected_at?: string;
};

export type WorkSession = {
  id: string;
  profile_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  start_location: JsonObject | null;
  end_location: JsonObject | null;
  device_info: JsonObject | null;
  status: 'active' | 'completed' | 'cancelled' | string;
  metadata: JsonValue | null;
  created_at: string;
  updated_at: string;
};
