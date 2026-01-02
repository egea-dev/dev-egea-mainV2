-- ==================================================================================
-- FIX COMPLETO FINAL - Crear función upsert_task SIN columna status
-- ==================================================================================
-- EJECUTAR EN: Dashboard Supabase > SQL Editor
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- =============================================

DO $$
DECLARE
  has_status BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'screen_data'
    AND column_name = 'status'
  ) INTO has_status;

  RAISE NOTICE 'La columna status existe: %', has_status;
END $$;

-- =============================================
-- PASO 2: ELIMINAR FUNCIÓN ANTERIOR SI EXISTE
-- =============================================

DROP FUNCTION IF EXISTS public.upsert_task(uuid, date, date, text, text, text, uuid, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.upsert_task(uuid, date, text, text, uuid[], uuid[]);

-- =============================================
-- PASO 3: CREAR FUNCIÓN upsert_task (SIN STATUS)
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_task(
    task_id_in uuid,
    start_date_in date,
    end_date_in date,
    site_in text,
    description_in text,
    location_in text,
    responsible_id_in uuid,
    user_ids uuid[],
    vehicle_ids uuid[]
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    -- Insertar o actualizar la tarea
    IF task_id_in IS NULL THEN
        -- Insertar nueva tarea
        INSERT INTO public.screen_data (
            start_date,
            end_date,
            data,
            state,
            location,
            responsible_profile_id
        )
        VALUES (
            start_date_in,
            end_date_in,
            jsonb_build_object('site', site_in, 'description', description_in),
            'pendiente',
            location_in,
            responsible_id_in
        )
        RETURNING id INTO new_task_id;

        RAISE NOTICE 'Nueva tarea creada con ID: %', new_task_id;
    ELSE
        -- Actualizar tarea existente
        UPDATE public.screen_data
        SET
            start_date = start_date_in,
            end_date = end_date_in,
            data = jsonb_build_object('site', site_in, 'description', description_in),
            location = location_in,
            responsible_profile_id = responsible_id_in
        WHERE id = task_id_in
        RETURNING id INTO new_task_id;

        RAISE NOTICE 'Tarea actualizada con ID: %', new_task_id;
    END IF;

    -- Gestionar relaciones con operarios
    DELETE FROM public.task_profiles WHERE task_id = new_task_id;
    IF user_ids IS NOT NULL AND array_length(user_ids, 1) > 0 THEN
        INSERT INTO public.task_profiles (task_id, profile_id)
        SELECT new_task_id, unnest(user_ids);
        RAISE NOTICE 'Asignados % operarios', array_length(user_ids, 1);
    END IF;

    -- Gestionar relaciones con vehículos
    DELETE FROM public.task_vehicles WHERE task_id = new_task_id;
    IF vehicle_ids IS NOT NULL AND array_length(vehicle_ids, 1) > 0 THEN
        INSERT INTO public.task_vehicles (task_id, vehicle_id)
        SELECT new_task_id, unnest(vehicle_ids);
        RAISE NOTICE 'Asignados % vehículos', array_length(vehicle_ids, 1);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.upsert_task(uuid, date, date, text, text, text, uuid, uuid[], uuid[]) TO authenticated, anon;

-- =============================================
-- PASO 4: VERIFICAR QUE LA FUNCIÓN SE CREÓ
-- =============================================

SELECT
  p.proname as nombre_funcion,
  pg_get_function_arguments(p.oid) as parametros,
  pg_get_functiondef(p.oid) as definicion
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname = 'upsert_task';

COMMIT;

-- =============================================
-- ✅ MENSAJE FINAL
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Función upsert_task creada correctamente';
  RAISE NOTICE 'Ahora recarga la app con Ctrl+Shift+R';
  RAISE NOTICE '====================================';
END $$;
