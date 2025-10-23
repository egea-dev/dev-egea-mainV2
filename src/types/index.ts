import type { JsonObject, JsonValue, TaskState, TaskStatus, VehicleType } from '@/integrations/supabase/types';

export type Profile = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  public_url?: string | null;
  role: 'admin' | 'manager' | 'responsable' | 'operario';
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: 'activo' | 'baja' | 'vacaciones';
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
