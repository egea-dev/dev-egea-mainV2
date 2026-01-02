-- Agregar política RLS para permitir INSERT en archived_tasks por parte de administradores

-- Primero verificamos si ya existe la política y la eliminamos si es necesario
DROP POLICY IF EXISTS "Los admins pueden insertar tareas archivadas" ON public.archived_tasks;

-- Crear política de INSERT para administradores
CREATE POLICY "Los admins pueden insertar tareas archivadas"
ON public.archived_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- Crear política de DELETE para administradores (por si acaso)
DROP POLICY IF EXISTS "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden eliminar tareas archivadas"
ON public.archived_tasks
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);
