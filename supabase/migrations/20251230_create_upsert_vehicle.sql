-- Function to upsert (insert or update) a vehicle
CREATE OR REPLACE FUNCTION public.upsert_vehicle(
    p_vehicle_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_license_plate TEXT DEFAULT NULL,
    p_capacity INTEGER DEFAULT 1,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_km INTEGER DEFAULT 0,
    p_status TEXT DEFAULT 'normal'
)
RETURNS TABLE (
    result_vehicle_id UUID,
    result_action TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_action TEXT;
BEGIN
    -- Check if we are updating (ID provided) or inserting
    IF p_vehicle_id IS NOT NULL THEN
        -- UPDATE
        UPDATE public.vehicles
        SET
            name = COALESCE(p_name, name),
            type = COALESCE(p_type, type),
            license_plate = COALESCE(p_license_plate, license_plate),
            capacity = COALESCE(p_capacity, capacity),
            is_active = COALESCE(p_is_active, is_active),
            km = COALESCE(p_km, km),
            status = COALESCE(p_status, status),
            updated_at = NOW()
        WHERE id = p_vehicle_id
        RETURNING id INTO v_new_id;
        
        IF v_new_id IS NULL THEN
             RAISE EXCEPTION 'Vehicle with ID % not found', p_vehicle_id;
        END IF;
        
        v_action := 'updated';
    ELSE
        -- INSERT
        INSERT INTO public.vehicles (
            name,
            type,
            license_plate,
            capacity,
            is_active,
            km,
            status
        ) VALUES (
            p_name,
            p_type,
            p_license_plate,
            p_capacity,
            p_is_active,
            p_km,
            p_status
        )
        RETURNING id INTO v_new_id;
        
        v_action := 'created';
    END IF;

    RETURN QUERY SELECT v_new_id, v_action;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_vehicle TO service_role;
