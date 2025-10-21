-- ================================================================
-- Esquemas propuestos: sesiones de trabajo, incidencias y ubicaciones
-- Ejecutar en Supabase SQL Editor o añadir a una migración.
-- ================================================================

-- Dependencias habituales
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- Tabla: work_sessions
-- Rastrea las sesiones laborales (check-in/out) de cada operario.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.screen_data (id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  start_location jsonb,
  end_location jsonb,
  device_info jsonb,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_sessions_status_check
    CHECK (status IN ('active', 'completed', 'aborted'))
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_profile_started
  ON public.work_sessions (profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_sessions_task
  ON public.work_sessions (task_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_sessions_profile_active
  ON public.work_sessions (profile_id)
  WHERE status = 'active' AND ended_at IS NULL;

-- Trigger para mantener updated_at sincronizado
CREATE OR REPLACE FUNCTION public.handle_work_sessions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_work_sessions_updated_at ON public.work_sessions;
CREATE TRIGGER handle_work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_work_sessions_updated_at();

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según roles/roles de negocio)
CREATE POLICY "work_sessions_select_own"
  ON public.work_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = work_sessions.profile_id
        AND p.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "work_sessions_insert_self"
  ON public.work_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "work_sessions_update_self"
  ON public.work_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ================================================================
-- Tabla: incident_reports
-- Incidencias vinculadas a sesiones de trabajo o tareas.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.work_sessions (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.screen_data (id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  description text,
  attachments jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incident_reports_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT incident_reports_status_check
    CHECK (status IN ('new', 'in_review', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_session
  ON public.incident_reports (session_id);

CREATE INDEX IF NOT EXISTS idx_incident_reports_task
  ON public.incident_reports (task_id);

CREATE INDEX IF NOT EXISTS idx_incident_reports_status
  ON public.incident_reports (status);

CREATE OR REPLACE FUNCTION public.handle_incident_reports_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_incident_reports_updated_at ON public.incident_reports;
CREATE TRIGGER handle_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_incident_reports_updated_at();

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_reports_select_related"
  ON public.incident_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = incident_reports.reported_by
        AND p.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "incident_reports_insert_self"
  ON public.incident_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = reported_by
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "incident_reports_update_admin"
  ON public.incident_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  );

-- ================================================================
-- Tabla: location_updates
-- Órdenes de ubicación enviadas desde el panel admin a operarios.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.work_sessions (id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  location jsonb NOT NULL,
  note text,
  delivery_channel text NOT NULL DEFAULT 'in_app',
  acknowledged_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_updates_profile
  ON public.location_updates (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_updates_session
  ON public.location_updates (session_id);

CREATE INDEX IF NOT EXISTS idx_location_updates_ack
  ON public.location_updates (acknowledged_at)
  WHERE acknowledged_at IS NULL;

ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_updates_select_related"
  ON public.location_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = location_updates.profile_id
        AND p.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "location_updates_insert_admin"
  ON public.location_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.auth_user_id = auth.uid()
        AND p_admin.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "location_updates_update_ack"
  ON public.location_updates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ================================================================
-- Comentarios y documentación
-- ================================================================
COMMENT ON TABLE public.work_sessions IS 'Sesiones laborales de operarios (check-in/check-out).';
COMMENT ON COLUMN public.work_sessions.status IS 'active | completed | aborted';
COMMENT ON COLUMN public.work_sessions.start_location IS 'JSON con lat/lng, precisión, fuente.';
COMMENT ON COLUMN public.work_sessions.metadata IS 'Campos flexibles (turno, notas, etc.).';

COMMENT ON TABLE public.incident_reports IS 'Incidencias vinculadas a sesiones y tareas.';
COMMENT ON COLUMN public.incident_reports.severity IS 'low | medium | high | critical.';
COMMENT ON COLUMN public.incident_reports.status IS 'new | in_review | resolved.';

COMMENT ON TABLE public.location_updates IS 'Solicitudes de ubicación enviadas a operarios.';
COMMENT ON COLUMN public.location_updates.location IS 'JSON con lat/lng y datos del proveedor.';
