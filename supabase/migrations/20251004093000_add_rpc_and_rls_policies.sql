-- FASE 1, TAREA 1.2: Creación de Funciones RPC, Políticas de Seguridad y configuración de Cron Job

BEGIN;

-- 1. POLÍTICAS DE SEGURIDAD PARA LAS NUEVAS TABLAS

-- Tabla: user_availability (Disponibilidad de usuarios)
-- Objetivo: Permitir que los administradores gestionen todas las ausencias y que los usuarios vean las suyas.
CREATE POLICY "Los admins pueden gestionar toda la disponibilidad" ON public.user_availability
  FOR ALL USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');
CREATE POLICY "Los usuarios pueden ver su propia disponibilidad" ON public.user_availability
  FOR SELECT USING ((SELECT auth_user_id FROM public.profiles WHERE id = profile_id) = auth.uid());

-- Tabla: archived_tasks (Tareas archivadas)
-- Objetivo: Permitir que solo los administradores consulten el historial de tareas.
CREATE POLICY "Los admins pueden ver las tareas archivadas" ON public.archived_tasks
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');

-- Tabla: shared_plans (Planes compartidos)
-- Objetivo: Permitir la lectura pública de planes a través de un token y que solo los admins puedan crearlos/eliminarlos.
CREATE POLICY "Permitir lectura pública de planes compartidos" ON public.shared_plans
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Los admins pueden gestionar los planes compartidos" ON public.shared_plans
  FOR ALL USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');


-- 2. FUNCIÓN RPC PARA CALCULAR LA SOBRECARGA DE TRABAJO DE UN USUARIO

-- Objetivo: Contar cuántas tareas activas tiene asignado un operario como responsable en una fecha específica.
CREATE OR REPLACE FUNCTION get_user_workload(user_id uuid, target_date date)
RETURNS int AS $$
DECLARE
  task_count int;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM public.screen_data
  WHERE responsible_profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  AND state <> 'terminado'; -- Excluimos las tareas ya terminadas.
  
  RETURN task_count;
END;
$$ LANGUAGE plpgsql STABLE;


-- 3. FUNCIÓN RPC PARA OBTENER EL ESTADO DE UN USUARIO EN UNA FECHA DADA

-- Objetivo: Determinar si un usuario está 'activo', 'de vacaciones' o 'de baja' en una fecha específica.
CREATE OR REPLACE FUNCTION get_user_status(user_id uuid, target_date date)
RETURNS text AS $$
DECLARE
  current_status text;
BEGIN
  -- Primero, revisamos si hay una entrada de disponibilidad (vacaciones/baja) para esa fecha.
  SELECT status INTO current_status
  FROM public.user_availability
  WHERE profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  LIMIT 1;

  -- Si encontramos un estado en la tabla de disponibilidad, lo devolvemos.
  IF FOUND THEN
    RETURN current_status;
  END IF;

  -- Si no, obtenemos el estado general del perfil.
  SELECT status INTO current_status
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN current_status;
END;
$$ LANGUAGE plpgsql STABLE;


-- 4. FUNCIÓN PARA EL ARCHIVADO AUTOMÁTICO DE TAREAS

-- Objetivo: Mover tareas terminadas de la tabla principal a la de archivados para mantener el rendimiento.
-- Esta función será llamada por un Cron Job.
CREATE OR REPLACE FUNCTION archive_completed_tasks()
RETURNS void AS $$
BEGIN
  -- Insertar en la tabla de archivados las tareas terminadas cuya fecha de finalización ya pasó.
  INSERT INTO public.archived_tasks (id, data, status, state, start_date, end_date, location, responsible_profile_id, responsible_name, assigned_users, assigned_vehicles)
  SELECT 
    sd.id,
    sd.data,
    sd.status,
    sd.state,
    sd.start_date,
    sd.end_date,
    sd.location,
    sd.responsible_profile_id,
    p.full_name,
    (SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'full_name', pr.full_name)) FROM public.task_profiles tp JOIN public.profiles pr ON tp.profile_id = pr.id WHERE tp.task_id = sd.id),
    (SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name)) FROM public.task_vehicles tv JOIN public.vehicles v ON tv.vehicle_id = v.id WHERE tv.task_id = sd.id)
  FROM public.screen_data sd
  LEFT JOIN public.profiles p ON sd.responsible_profile_id = p.id
  WHERE sd.state = 'terminado' AND sd.end_date < (NOW() - INTERVAL '1 day');
  
  -- Eliminar las tareas que acabamos de archivar de la tabla principal.
  DELETE FROM public.screen_data
  WHERE id IN (SELECT id FROM public.archived_tasks WHERE archived_at >= NOW() - INTERVAL '1 minute');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;