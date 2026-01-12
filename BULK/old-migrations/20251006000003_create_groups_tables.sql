-- =====================================================================
-- MIGRACIÓN: TABLAS DE GESTIÓN DE GRUPOS
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestión de grupos de usuarios
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR TABLA groups
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PASO 2: CREAR TABLA profile_groups (tabla de unión)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role_in_group TEXT DEFAULT 'member', -- member, leader
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede estar una vez en cada grupo
  UNIQUE(profile_id, group_id)
);

-- =====================================================================
-- PASO 3: CREAR ÍNDICES
-- =====================================================================

-- Índices para groups
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at);

-- Índices para profile_groups
CREATE INDEX IF NOT EXISTS idx_profile_groups_profile_id ON public.profile_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_group_id ON public.profile_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_role ON public.profile_groups(role_in_group);

-- =====================================================================
-- PASO 4: HABILITAR RLS
-- =====================================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 5: POLÍTICAS RLS PARA groups
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_groups" ON public.groups FOR SELECT
  TO authenticated
  USING (true);

-- Gestión solo para admins
CREATE POLICY "manage_groups" ON public.groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÍTICAS RLS PARA profile_groups
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_profile_groups" ON public.profile_groups FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios pueden ver sus propias asignaciones a grupos
CREATE POLICY "read_own_profile_groups" ON public.profile_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_groups.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- Gestión solo para admins
CREATE POLICY "manage_profile_groups" ON public.profile_groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 7: TRIGGER PARA updated_at
-- =====================================================================

-- Trigger para groups
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- PASO 8: DATOS DE EJEMPLO (opcional)
-- =====================================================================

-- Insertar algunos grupos de ejemplo
INSERT INTO public.groups (name, color, description) VALUES
  ('Equipo Alpha', '#EF4444', 'Equipo especializado en instalaciones complejas'),
  ('Equipo Beta', '#10B981', 'Equipo de mantenimiento y soporte'),
  ('Equipo Gamma', '#F59E0B', 'Equipo de proyectos especiales')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PASO 9: FUNCIONES ÚTILES
-- =====================================================================

-- Función para obtener grupos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_groups(user_profile_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  role_in_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.color,
    pg.role_in_group
  FROM public.groups g
  JOIN public.profile_groups pg ON g.id = pg.group_id
  WHERE pg.profile_id = user_profile_id
  ORDER BY g.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener miembros de un grupo
CREATE OR REPLACE FUNCTION public.get_group_members(group_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  role_in_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.status,
    pg.role_in_group
  FROM public.profiles p
  JOIN public.profile_groups pg ON p.id = pg.profile_id
  WHERE pg.group_id = group_id
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMENTARIOS
-- =====================================================================

COMMENT ON TABLE public.groups IS 'Tabla para definir grupos de usuarios con colores y descripciones';
COMMENT ON TABLE public.profile_groups IS 'Tabla de unión entre perfiles y grupos (muchos a muchos)';
COMMENT ON COLUMN public.groups.color IS 'Color hexadecimal para identificar visualmente el grupo';
COMMENT ON COLUMN public.profile_groups.role_in_group IS 'Rol del usuario dentro del grupo: member, leader';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta migración crea las tablas necesarias para la gestión de grupos
-- 2. Los grupos pueden tener un color para identificación visual
-- 3. Los usuarios pueden pertenecer a múltiples grupos
-- 4. Cada usuario tiene un rol dentro de cada grupo (member, leader)
-- 5. Se incluyen funciones útiles para consultas comunes
-- 6. Las políticas RLS permiten que todos vean los grupos pero solo los admins los gestionen
-- =====================================================================