-- MIGRATION: 20260107_create_invite_user_function.sql
-- Description: Creates a function to invite users by email (admin/manager only)

BEGIN;

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
    'pendiente'  -- Status pending until they accept invitation
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

COMMENT ON FUNCTION public.invite_user_by_email IS 
'Creates a pending profile for a new user. Admin must then invite the user through Supabase Dashboard Auth > Users > Invite User.';

COMMIT;
