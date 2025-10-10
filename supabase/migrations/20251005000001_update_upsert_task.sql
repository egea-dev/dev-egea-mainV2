-- Actualizar función upsert_task para usar start_date/end_date en lugar de due_date
CREATE OR REPLACE FUNCTION public.upsert_task(
    task_id_in uuid,
    start_date_in date,
    end_date_in date,
    site_in text,
    description_in text,
    location_in text,
    responsible_profile_id_in uuid,
    state_in text,
    user_ids uuid[],
    vehicle_ids uuid[]
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    -- Insertar o actualizar la tarea en la tabla screen_data
    IF task_id_in IS NULL THEN
        -- Insertar nueva tarea si no se proporciona ID
        INSERT INTO public.screen_data (
            start_date,
            end_date,
            data,
            status,
            state,
            location,
            responsible_profile_id
        )
        VALUES (
            start_date_in,
            end_date_in,
            jsonb_build_object('site', site_in, 'description', description_in),
            'pendiente',
            COALESCE(state_in, 'pendiente'),
            location_in,
            responsible_profile_id_in
        )
        RETURNING id INTO new_task_id;
    ELSE
        -- Actualizar tarea existente
        UPDATE public.screen_data
        SET
            start_date = start_date_in,
            end_date = end_date_in,
            data = jsonb_build_object('site', site_in, 'description', description_in),
            location = location_in,
            responsible_profile_id = responsible_profile_id_in,
            state = COALESCE(state_in, state)
        WHERE id = task_id_in
        RETURNING id INTO new_task_id;
    END IF;

    -- Gestionar relaciones con operarios (profiles)
    -- Primero, eliminar relaciones existentes para esta tarea
    DELETE FROM public.task_profiles WHERE task_id = new_task_id;
    -- Luego, insertar las nuevas relaciones si se proporcionaron IDs de usuario
    IF array_length(user_ids, 1) > 0 THEN
        INSERT INTO public.task_profiles (task_id, profile_id)
        SELECT new_task_id, unnest(user_ids);
    END IF;

    -- Gestionar relaciones con vehículos
    DELETE FROM public.task_vehicles WHERE task_id = new_task_id;
    IF array_length(vehicle_ids, 1) > 0 THEN
        INSERT INTO public.task_vehicles (task_id, vehicle_id)
        SELECT new_task_id, unnest(vehicle_ids);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.upsert_task(uuid, date, date, text, text, text, uuid, text, uuid[], uuid[]) TO authenticated;
