-- =====================================================================
-- MIGRATE_FINAL_MAIN.sql - Script de Estabilización Definitivo para DB MAIN
-- Objetivo: Restaurar compatibilidad total con el frontend y resolver roles.
-- Fecha: 2025-12-24
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. LIMPIEZA DE OBJETOS QUE VAMOS A REDEFINIR
-- =====================================================================
DROP VIEW IF EXISTS public.detailed_tasks CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.can_manage_role(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_dashboard_stats(DATE, DATE);
DROP FUNCTION IF EXISTS public.generate_checkin_token(UUID);

-- =====================================================================
-- 2. AJUSTES EN TABLAS EXISTENTES
-- =====================================================================

-- Asegurar columnas en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Asegurar columnas en screen_data
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS checkin_token TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Asegurar columnas en screens (la vista las necesita)
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS dashboard_section TEXT;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS dashboard_order INTEGER;

-- Asegurar tabla user_availability y relación con profiles
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'activo',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forzar la relación si la tabla existe pero le falta la FK (Caso error PGRST200)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_availability_profile_id_fkey' 
        AND table_name = 'user_availability'
    ) THEN
        ALTER TABLE public.user_availability 
        ADD CONSTRAINT user_availability_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Asegurar columnas en profiles que podrían faltar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo';

-- Crear tabla work_sessions (la App la prefiere sobre user_sessions)
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3. FUNCIONES RPC CRÍTICAS
-- =====================================================================

-- Función has_permission (Nombre de parámetros alineados con PermissionGuardEnhanced.tsx)
CREATE OR REPLACE FUNCTION public.has_permission(
  user_role TEXT,
  resource TEXT,
  action TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN := false;
BEGIN
  -- Si es admin, tiene todo por defecto si no hay reglas que lo prohíban
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT allowed INTO has_perm
  FROM public.role_permissions
  WHERE role = user_role 
    AND (public.role_permissions.resource = has_permission.resource OR public.role_permissions.resource = '*')
    AND (public.role_permissions.action = has_permission.action OR public.role_permissions.action = '*');
  
  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función can_manage_role (Requerida por PermissionGuardEnhanced.tsx)
CREATE OR REPLACE FUNCTION public.can_manage_role(
  p_manager_role TEXT,
  p_target_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Jerarquía simple: admin > manager > responsable > operario
  IF p_manager_role = 'admin' THEN RETURN true; END IF;
  IF p_manager_role = 'manager' AND p_target_role IN ('responsable', 'operario') THEN RETURN true; END IF;
  IF p_manager_role = 'responsable' AND p_target_role = 'operario' THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función get_dashboard_stats para useDashboardStats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  urgent_tasks BIGINT,
  overdue_tasks BIGINT,
  active_users BIGINT,
  active_vehicles BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
  v_completed BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total 
  FROM public.screen_data 
  WHERE (p_date_from IS NULL OR start_date >= p_date_from)
    AND (p_date_to IS NULL OR start_date <= p_date_to);

  SELECT COUNT(*) INTO v_completed 
  FROM public.screen_data 
  WHERE state = 'terminado'
    AND (p_date_from IS NULL OR start_date >= p_date_from)
    AND (p_date_to IS NULL OR start_date <= p_date_to);

  RETURN QUERY SELECT
    v_total as total_tasks,
    v_completed as completed_tasks,
    (v_total - v_completed) as pending_tasks,
    (SELECT COUNT(*) FROM public.screen_data WHERE state = 'urgente') as urgent_tasks,
    (SELECT COUNT(*) FROM public.screen_data WHERE end_date < CURRENT_DATE AND state != 'terminado') as overdue_tasks,
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'activo') as active_users,
    (SELECT COUNT(*) FROM public.vehicles WHERE is_active = true) as active_vehicles,
    CASE WHEN v_total > 0 THEN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100, 2) ELSE 0 END as completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar tokens de check-in
CREATE OR REPLACE FUNCTION public.generate_checkin_token(p_task_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(16), 'hex');
  UPDATE public.screen_data SET checkin_token = v_token WHERE id = p_task_id;
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 4. VISTA DETALLADA (COMPLETA)
-- =====================================================================

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  sd.id,
  sd.screen_id,
  sd.title,
  sd.description,
  sd.description AS address, -- Alias para búsqueda en frontend
  sd.status,
  sd.state,
  sd.priority,
  sd.start_date,
  sd.end_date,
  sd.client_name,
  sd.client_name AS client, -- Alias para búsqueda en frontend
  sd.client_address,
  sd.client_phone,
  sd.order_data,
  sd.metadata,
  sd.created_at,
  sd.updated_at,
  sd.checkin_token,
  sd."order",
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.dashboard_section,
  s.dashboard_order,
  -- Responsable
  rp.full_name AS responsible_name,
  rp.id AS responsible_profile_id,
  -- Flags calculados
  CASE WHEN sd.state = 'urgente' THEN true ELSE false END AS is_urgent,
  -- Agregados de asignación
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.full_name, p.name),
      'full_name', COALESCE(p.full_name, p.name),
      'role', p.role,
      'avatar_url', p.avatar_url,
      'status', p.status
    ))
    FROM public.task_profiles tp
    JOIN public.profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_profiles,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'full_name', COALESCE(p.full_name, p.name),
      'status', p.status
    ))
    FROM public.task_profiles tp
    JOIN public.profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_users, -- Alias para compatibilidad
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', v.id,
      'name', v.name,
      'plate', v.plate,
      'type', v.vehicle_type
    ))
    FROM public.task_vehicles tv
    JOIN public.vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_vehicles
FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.assigned_to = rp.id;

-- =====================================================================
-- 5. PERMISOS Y RLS
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_checkin_token TO authenticated;

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_sessions_select" ON public.work_sessions;
CREATE POLICY "work_sessions_select" ON public.work_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "work_sessions_all" ON public.work_sessions;
CREATE POLICY "work_sessions_all" ON public.work_sessions FOR ALL TO authenticated USING (public.is_admin());

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sessions TO authenticated;

COMMIT;
