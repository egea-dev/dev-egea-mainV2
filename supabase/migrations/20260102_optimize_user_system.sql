-- MIGRATION: 20260102_optimize_user_system.sql
-- Description: Adds whatsapp field and workload tracking functionality to the user system.

BEGIN;

-- 1. Add whatsapp column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- 2. Create or Update get_user_workload function
-- Calculates how many active (not completed) tasks a user is responsible for on a given date.
CREATE OR REPLACE FUNCTION public.get_user_workload(p_user_id UUID, p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.screen_data
  WHERE (responsible_profile_id = p_user_id OR assigned_to = p_user_id)
  AND (p_target_date BETWEEN start_date AND end_date)
  AND (state <> 'terminado');
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Update admin_upsert_profile to handle whatsapp
-- We drop the previous one if exists to avoid signature issues
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario',
  p_whatsapp TEXT DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  -- Get the current authenticated user's profile
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  -- RBAC Check: Only admin, manager, or responsable can manage profiles
  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar perfiles';
  END IF;

  -- Validate target profile if updating
  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Perfil no encontrado';
    END IF;
    
    -- Restriction: Non-admins cannot modify admins
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores';
    END IF;
  END IF;

  -- Restriction: Non-admins cannot assign the admin role
  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin';
  END IF;

  IF p_profile_id IS NULL THEN
    -- CREATE operation
    INSERT INTO public.profiles (full_name, email, phone, whatsapp, status, role)
    VALUES (
      p_full_name,
      p_email,
      p_phone,
      p_whatsapp,
      COALESCE(p_status, 'activo'),
      COALESCE(p_role, 'operario')
    )
    RETURNING * INTO v_result;
  ELSE
    -- UPDATE operation
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        whatsapp = COALESCE(p_whatsapp, whatsapp),
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN
            CASE
              WHEN p_role = 'admin' THEN v_target.role
              ELSE COALESCE(p_role, v_target.role)
            END
          WHEN v_actor.role = 'responsable' THEN
            CASE
              WHEN p_role IN ('responsable', 'operario', 'produccion', 'envios', 'almacen', 'comercial') THEN COALESCE(p_role, v_target.role)
              ELSE v_target.role
            END
          ELSE v_target.role
        END,
        updated_at = NOW()
    WHERE id = p_profile_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_workload TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

-- 4. Create a View for easier workload tracking in the frontend
CREATE OR REPLACE VIEW public.user_workload_stats AS
SELECT 
  p.id as profile_id,
  (
    SELECT COUNT(*) :: INTEGER
    FROM public.screen_data sd
    WHERE (sd.responsible_profile_id = p.id OR sd.assigned_to = p.id)
    AND (CURRENT_DATE BETWEEN sd.start_date AND sd.end_date)
    AND (sd.state <> 'terminado' AND sd.status <> 'acabado')
  ) as active_tasks_count
FROM public.profiles p;

GRANT SELECT ON public.user_workload_stats TO authenticated;

COMMIT;
