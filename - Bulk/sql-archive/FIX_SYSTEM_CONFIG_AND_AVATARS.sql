-- =====================================================
-- FIX COMPLETO: System Config y Avatares
-- =====================================================
-- Este script soluciona los errores 400 en system_config
-- y prepara la base de datos para el bucket de avatares
-- =====================================================

-- PASO 1: Verificar y crear/actualizar tabla system_config
-- =====================================================

DO $$
BEGIN
  -- Crear tabla si no existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_config') THEN
    CREATE TABLE public.system_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general'
    );
    
    RAISE NOTICE 'Tabla system_config creada';
  ELSE
    RAISE NOTICE 'Tabla system_config ya existe';
    
    -- Agregar columna category si no existe
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'system_config'
      AND column_name = 'category'
    ) THEN
      ALTER TABLE public.system_config ADD COLUMN category TEXT DEFAULT 'general';
      RAISE NOTICE 'Columna category agregada a system_config';
    END IF;
  END IF;
END $$;

-- PASO 2: Habilitar RLS
-- =====================================================

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- PASO 3: Eliminar políticas antiguas si existen
-- =====================================================

DROP POLICY IF EXISTS "Admins can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can delete system config" ON public.system_config;
DROP POLICY IF EXISTS "Allow authenticated users to read system_config" ON public.system_config;

-- PASO 4: Crear políticas RLS mejoradas
-- =====================================================

-- Permitir a TODOS los usuarios autenticados LEER configuraciones
-- (Necesario para que la app funcione correctamente)
CREATE POLICY "Allow authenticated users to read system_config"
ON public.system_config
FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar configuraciones
CREATE POLICY "Admins can insert system config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Solo admins pueden actualizar configuraciones
CREATE POLICY "Admins can update system config"
ON public.system_config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Solo admins pueden eliminar configuraciones
CREATE POLICY "Admins can delete system config"
ON public.system_config
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- PASO 5: Insertar configuraciones por defecto
-- =====================================================

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
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- PASO 6: Crear trigger para actualizar timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_config_updated_at ON public.system_config;

CREATE TRIGGER system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION update_system_config_timestamp();

-- PASO 7: Verificar resultado
-- =====================================================

DO $$
DECLARE
  config_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.system_config;
  SELECT COUNT(*) INTO policy_count FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'system_config';
  
  RAISE NOTICE '✅ Configuraciones creadas: %', config_count;
  RAISE NOTICE '✅ Políticas RLS activas: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔥 IMPORTANTE: Ahora debes crear el bucket de Storage manualmente:';
  RAISE NOTICE '1. Ve a Storage en tu dashboard de Supabase';
  RAISE NOTICE '2. Crea un nuevo bucket llamado "avatars"';
  RAISE NOTICE '3. Márcalo como PUBLIC';
  RAISE NOTICE '4. Luego ejecuta las políticas de Storage que siguen abajo';
END $$;

-- =====================================================
-- SIGUIENTE PASO: CREAR BUCKET Y POLÍTICAS DE STORAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a Storage en tu dashboard de Supabase';
  RAISE NOTICE '2. Crea un bucket llamado "avatars" (marcar como PUBLIC)';
  RAISE NOTICE '3. Ejecuta el script: supabase/APLICAR_POLITICAS_STORAGE.sql';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Consulta SOLUCION_RAPIDA_ERRORES.md para más detalles';
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================