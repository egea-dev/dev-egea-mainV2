-- Dashboard section configuration for screens
ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS dashboard_section text,
  ADD COLUMN IF NOT EXISTS dashboard_order integer DEFAULT 0;

COMMENT ON COLUMN public.screens.dashboard_section IS 'Identificador de seccion del dashboard (p.e. confeccion, tapiceria, pendientes).';
COMMENT ON COLUMN public.screens.dashboard_order IS 'Orden relativo dentro de la seccion del dashboard.';
