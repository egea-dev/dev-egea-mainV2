-- MIGRATION: 20260107_fix_user_management_complete.sql
-- Description: Complete fix for user management - combines all necessary changes
-- This is a consolidated migration that fixes all user management issues

BEGIN;

-- ============================================================
-- PART 1: Remove role constraint to allow any role
-- ============================================================
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

DO $$ BEGIN
  RAISE NOTICE 'Step 1/3: Role constraint removed - any role is now allowed';
END $$;

-- ============================================================
-- PART 2: Fix admin_upsert_profile function (without whatsapp)
-- ============================================================

-- Drop all possible variations
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create the correct version
CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario'
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  -- Get the current authenticated user's profile
  SELECT * INTO v_actor
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
    INSERT INTO public.profiles (full_name, email, phone, status, role)
    VALUES (
      p_full_name,
      p_email,
      p_phone,
      COALESCE(p_status, 'activo'),
      COALESCE(p_role, 'operario')
    )
    RETURNING * INTO v_result;
  ELSE
    -- UPDATE operation
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
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
              WHEN p_role IN ('responsable', 'operario', 'produccion', 'envios', 'almacen', 'comercial') 
                THEN COALESCE(p_role, v_target.role)
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

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Step 2/3: admin_upsert_profile function updated (without whatsapp field)';
END $$;

-- ============================================================
-- PART 3: Create invite_user_by_email function
-- ============================================================

CREATE OR REPLACE FUNCTION public.invite_user_by_email(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'operario'
)
RETURNS JSONB AS $$
DECLARE
  v_actor public.profiles;
  v_new_profile public.profiles;
BEGIN
  -- Get the current authenticated user's profile
  SELECT * INTO v_actor
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  -- RBAC Check: Only admin or manager can invite users
  IF v_actor.role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'No tienes permisos para invitar usuarios';
  END IF;

  -- Validate email
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'El email es obligatorio';
  END IF;

  -- Check if profile with this email already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'Ya existe un usuario con este email';
  END IF;

  -- Create profile (without auth_user_id, will be linked when user accepts invitation)
  INSERT INTO public.profiles (
    full_name,
    email,
    role,
    status
  )
  VALUES (
    COALESCE(p_full_name, p_email),
    p_email,
    COALESCE(p_role, 'operario'),
    'pendiente'
  )
  RETURNING * INTO v_new_profile;

  -- Return success message with profile info
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Perfil creado. El usuario debe ser invitado manualmente desde Supabase Dashboard.',
    'profile_id', v_new_profile.id,
    'email', v_new_profile.email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.invite_user_by_email TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Step 3/3: invite_user_by_email function created';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'User management migration completed successfully!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '✓ Role constraint removed (any role allowed)';
  RAISE NOTICE '✓ admin_upsert_profile function fixed';
  RAISE NOTICE '✓ invite_user_by_email function created';
  RAISE NOTICE '=================================================';
END $$;

COMMIT;
