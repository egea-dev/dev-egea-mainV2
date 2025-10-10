-- ========= DESACOPLAR LA TABLA PROFILES DE AUTH.USERS =========

-- 1. Eliminar la restricción de clave foránea en la columna "assigned_to" de las tareas
-- para poder modificar la tabla "profiles" sin problemas.
ALTER TABLE public.screen_data
  DROP CONSTRAINT IF EXISTS screen_data_assigned_to_fkey;

-- 2. Eliminar la política de RLS de actualización que depende de la estructura antigua.
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;

-- 3. Eliminar la restricción de clave foránea que une "profiles.id" con "auth.users.id".
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Añadir una nueva columna "auth_user_id" que SÍ estará vinculada a auth.users.
-- Esta columna puede ser nula, permitiendo que existan perfiles sin una cuenta de login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
  
-- 5. Añadir una columna de email para poder vincular la cuenta más tarde.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 6. Cambiar la clave primaria "id" para que se autogenere.
-- Esto requiere eliminarla y volver a crearla.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- 7. Volver a crear la restricción de clave foránea en "screen_data.assigned_to"
-- apuntando a la nueva clave primaria autogenerada de "profiles".
ALTER TABLE public.screen_data
  ADD CONSTRAINT screen_data_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8. Volver a crear la política de RLS de actualización con la nueva estructura.
-- Ahora, los usuarios actualizan su perfil si su ID de autenticación coincide con "auth_user_id".
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
