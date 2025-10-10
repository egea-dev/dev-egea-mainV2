-- ========= CORRECCIÓN DE POLÍTICAS RLS PARA PERFILES (USUARIOS) =========

-- Eliminamos todas las políticas posibles para esta tabla para evitar conflictos.
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los administradores pueden gestionar todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden gestionar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden crear perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden eliminar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden actualizar cualquier perfil" ON public.profiles;


-- SELECT: Permitir a cualquier usuario autenticado VER la lista de todos los perfiles.
CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE (Usuario individual): Los usuarios pueden actualizar su PROPIO perfil.
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT (Solo Admin): Solo los administradores pueden crear perfiles.
CREATE POLICY "Administradores pueden crear perfiles"
  ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));

-- DELETE (Solo Admin): Solo los administradores pueden eliminar perfiles.
CREATE POLICY "Administradores pueden eliminar perfiles"
  ON public.profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));

-- UPDATE (Admin): Los administradores también pueden actualizar cualquier perfil.
CREATE POLICY "Administradores pueden actualizar cualquier perfil"
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));


-- ========= CORRECCIÓN DE POLÍTICAS RLS PARA VEHÍCULOS =========

-- Eliminamos todas las políticas posibles para esta tabla.
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver los vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Los administradores pueden gestionar los vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede ver los vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Solo los administradores pueden gestionar vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Administradores pueden crear vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Administradores pueden actualizar vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Administradores pueden eliminar vehículos" ON public.vehicles;


-- SELECT: Permitir a cualquier usuario autenticado VER la lista de vehículos.
CREATE POLICY "Usuarios autenticados pueden ver los vehículos"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT (Solo Admin): Solo los administradores pueden crear vehículos.
CREATE POLICY "Administradores pueden crear vehículos"
  ON public.vehicles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));

-- UPDATE (Solo Admin): Solo los administradores pueden actualizar vehículos.
CREATE POLICY "Administradores pueden actualizar vehículos"
  ON public.vehicles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));

-- DELETE (Solo Admin): Solo los administradores pueden eliminar vehículos.
CREATE POLICY "Administradores pueden eliminar vehículos"
  ON public.vehicles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));
