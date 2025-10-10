-- =====================================================
-- APLICAR ESTE SQL EN SUPABASE SQL EDITOR
-- =====================================================
-- Este script agrega las políticas RLS faltantes para
-- permitir insertar y eliminar en archived_tasks
-- =====================================================

-- 1. Crear política de INSERT para administradores
DROP POLICY IF EXISTS "Los admins pueden insertar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden insertar tareas archivadas"
ON public.archived_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- 2. Crear política de DELETE para administradores
DROP POLICY IF EXISTS "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden eliminar tareas archivadas"
ON public.archived_tasks
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- 3. Verificar políticas creadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'archived_tasks'
ORDER BY cmd;
