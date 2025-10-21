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
  // El campo 'status' ahora se calcula dinámicamente, por lo que puede ser opcional o añadido en el frontend.
  status?: 'activo' | 'baja' | 'vacaciones';
};

export type Vehicle = {
  id: string;
  name: string;
  type: string;
  license_plate?: string | null;
  capacity?: number;
  is_active?: boolean;
  km?: number;
  status?: 'normal' | 'accidentado' | 'revision';
};

export type TaskData = {
  site?: string;
  description?: string;
  [key: string]: string | number | null;
};

export type Task = {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  order: number;
  state: 'urgente' | 'pendiente' | 'a la espera' | 'en fabricacion' | 'terminado';
  location: 'en la isla' | 'fuera';
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
  start_location: Record<string, unknown> | null;
  end_location: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  status: 'active' | 'completed' | 'cancelled' | string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
