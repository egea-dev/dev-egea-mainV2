-- =====================================================================
-- MIGRACIÓN: Políticas para inserción/eliminación en archived_tasks
-- =====================================================================
-- Fuente: supabase/20251005_fix_archived_tasks_insert_policy.sql
-- Objetivo: asegurar que sólo administradores puedan insertar/eliminar
--           registros en archived_tasks mediante RLS oficial.
-- =====================================================================

BEGIN;

DROP POLICY IF EXISTS "Los admins pueden insertar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden insertar tareas archivadas"
ON public.archived_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden eliminar tareas archivadas"
ON public.archived_tasks
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

COMMIT;
