-- FASE DE CORRECCIÓN: Actualizar RLS para la tabla 'profiles'

BEGIN;

-- Eliminar políticas antiguas para evitar conflictos.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores pueden gestionar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles (legacy)" ON public.profiles;


-- NUEVA POLÍTICA DE LECTURA (SELECT)
-- Permite a CUALQUIER usuario autenticado LEER la información de TODOS los perfiles.
-- Esto es necesario para funcionalidades como los menús desplegables de asignación de tareas.
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- POLÍTICA DE ACTUALIZACIÓN (UPDATE)
-- Permite a un usuario actualizar SU PROPIO perfil, vinculando su sesión (auth.uid())
-- con la columna 'auth_user_id' que creamos anteriormente.
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- POLÍTICAS DE GESTIÓN PARA ADMINISTRADORES (se mantienen conceptualmente)
-- Aseguramos que los administradores puedan seguir gestionando todos los perfiles.
CREATE POLICY "Admins can manage all profiles (legacy)"
  ON public.profiles FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');

COMMIT;