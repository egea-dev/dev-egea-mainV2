-- =====================================================
-- Crear tabla de configuración del sistema
-- =====================================================

-- Tabla para almacenar configuraciones generales del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general'
);

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y modificar configuraciones
CREATE POLICY "Admins can view system config"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can insert system config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update system config"
ON public.system_config
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can delete system config"
ON public.system_config
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- Insertar configuraciones por defecto
INSERT INTO public.system_config (key, value, description, category)
VALUES
  ('company_name', '"EGEA Productivity"'::jsonb, 'Nombre de la empresa', 'general'),
  ('company_logo', '""'::jsonb, 'URL del logo de la empresa', 'general'),
  ('company_email', '"info@egea.com"'::jsonb, 'Email de contacto', 'general'),
  ('company_phone', '"+34 XXX XXX XXX"'::jsonb, 'Teléfono de contacto', 'general'),
  ('app_version', '"1.0.0-alpha"'::jsonb, 'Versión de la aplicación', 'system'),
  ('theme_primary_color', '"#0ea5e9"'::jsonb, 'Color primario del tema', 'appearance'),
  ('enable_notifications', 'true'::jsonb, 'Habilitar notificaciones', 'features'),
  ('default_task_duration', '8'::jsonb, 'Duración por defecto de tareas (horas)', 'tasks')
ON CONFLICT (key) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION update_system_config_timestamp();
