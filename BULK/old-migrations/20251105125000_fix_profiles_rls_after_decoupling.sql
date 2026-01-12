-- =====================================================================
-- MIGRACIÓN: Actualización de políticas RLS para profiles
-- =====================================================================
-- Contenido proveniente de supabase/20251004100000_fix_profile_rls_after_decoupling.sql
-- Objetivo: asegurar que las políticas vivan en la secuencia oficial de migraciones.
-- =====================================================================

BEGIN;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden gestionar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles (legacy)" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can manage all profiles (legacy)"
  ON public.profiles FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');

COMMIT;
