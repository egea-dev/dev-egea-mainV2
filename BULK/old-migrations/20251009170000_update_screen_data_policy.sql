-- Update screen_data SELECT policy to include rate limiting for anonymous access
-- Migration: 20251009170000_update_screen_data_policy

-- =====================================================================
-- ACTUALIZAR POLÍTICA PARA screen_data
-- =====================================================================

-- Eliminar la política anterior
DROP POLICY IF EXISTS "anyone_can_view_screen_data" ON public.screen_data;

-- Crear nueva política con rate limiting para acceso anónimo
CREATE POLICY "rate_limited_screen_data_access"
  ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (
    -- Pantalla debe estar activa
    EXISTS (
      SELECT 1 FROM public.screens
      WHERE screens.id = screen_data.screen_id
      AND screens.is_active = true
    )
    AND
    -- Verificar rate limiting y registrar acceso
    public.check_screen_access(
      screen_data.screen_id,
      CASE WHEN auth.uid() IS NOT NULL THEN 'authenticated' ELSE 'anonymous' END
    )
  );

-- Mantener las otras políticas para admins
-- (Ya existen de migraciones anteriores)