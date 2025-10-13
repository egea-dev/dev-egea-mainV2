-- =====================================================================
-- Actualizar políticas de profiles para permitir gestión a responsables
-- =====================================================================
-- Fecha: 2025-10-11
-- Motivo: Permitir que usuarios con rol 'responsable' gestionen perfiles
--         (además de admin/manager) y evitar errores 400 al crear/editar.
-- =====================================================================

BEGIN;

-- Función helper para roles con permisos de gestión de perfiles
CREATE OR REPLACE FUNCTION public.has_profile_management_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'responsable')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Mantener compatibilidad con funciones existentes que consultan este helper
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'responsable')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Reemplazar políticas de gestión
DROP POLICY IF EXISTS "admin_manager_can_view_all_profiles" ON public.profiles;
CREATE POLICY "management_can_view_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_profile_management_role());

DROP POLICY IF EXISTS "admin_manager_can_manage_profiles" ON public.profiles;
CREATE POLICY "management_can_manage_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.has_profile_management_role()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles actor
        WHERE actor.auth_user_id = auth.uid()
          AND actor.role = 'admin'
      )
      OR public.profiles.role != 'admin'
    )
  )
  WITH CHECK (
    public.has_profile_management_role()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles actor
        WHERE actor.auth_user_id = auth.uid()
          AND actor.role = 'admin'
      )
      OR public.profiles.role != 'admin'
    )
  );

COMMIT;

