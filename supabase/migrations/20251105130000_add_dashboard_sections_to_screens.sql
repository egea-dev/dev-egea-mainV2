-- =====================================================================
-- MIGRACIÓN: Campos dashboard_section y dashboard_order en screens
-- =====================================================================
-- Fuente: supabase/sql/dashboard_sections.sql
-- Objetivo: formalizar las columnas utilizadas para agrupar pantallas
--           por secciones del dashboard y definir su orden.
-- =====================================================================

BEGIN;

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS dashboard_section text,
  ADD COLUMN IF NOT EXISTS dashboard_order integer DEFAULT 0;

COMMENT ON COLUMN public.screens.dashboard_section IS 'Identificador de sección del dashboard (p.e. confección, tapicería, pendientes).';
COMMENT ON COLUMN public.screens.dashboard_order IS 'Orden relativo dentro de la sección del dashboard.';

COMMIT;
