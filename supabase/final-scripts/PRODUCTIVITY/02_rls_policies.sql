-- =====================================================================
-- SCRIPT CONSOLIDADO FINAL: POLÍTICAS RLS PRODUCTIVITY DATABASE
-- =====================================================================
-- Fecha: 12 de enero de 2026
-- Versión: 2.0 Final
-- Objetivo: Configurar políticas de seguridad RLS para PRODUCTIVITY Database
-- Base de datos: Supabase PRODUCTIVITY
-- IMPORTANTE: Ejecutar DESPUÉS de 01_schema.sql
-- =====================================================================

BEGIN;

-- =====================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================================

ALTER TABLE public.comercial_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- POLÍTICAS PARA comercial_orders
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_comercial_orders" ON public.comercial_orders;
CREATE POLICY "authenticated_can_view_comercial_orders"
  ON public.comercial_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_comercial_orders" ON public.comercial_orders;
CREATE POLICY "authenticated_can_insert_comercial_orders"
  ON public.comercial_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_comercial_orders" ON public.comercial_orders;
CREATE POLICY "authenticated_can_update_comercial_orders"
  ON public.comercial_orders FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_comercial_orders" ON public.comercial_orders;
CREATE POLICY "authenticated_can_delete_comercial_orders"
  ON public.comercial_orders FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- POLÍTICAS PARA order_documents
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_order_documents" ON public.order_documents;
CREATE POLICY "authenticated_can_view_order_documents"
  ON public.order_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_order_documents" ON public.order_documents;
CREATE POLICY "authenticated_can_insert_order_documents"
  ON public.order_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_order_documents" ON public.order_documents;
CREATE POLICY "authenticated_can_update_order_documents"
  ON public.order_documents FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_order_documents" ON public.order_documents;
CREATE POLICY "authenticated_can_delete_order_documents"
  ON public.order_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- POLÍTICAS PARA status_log
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_status_log" ON public.status_log;
CREATE POLICY "authenticated_can_view_status_log"
  ON public.status_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_status_log" ON public.status_log;
CREATE POLICY "authenticated_can_insert_status_log"
  ON public.status_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================
-- POLÍTICAS PARA produccion_work_orders
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_work_orders" ON public.produccion_work_orders;
CREATE POLICY "authenticated_can_view_work_orders"
  ON public.produccion_work_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_work_orders" ON public.produccion_work_orders;
CREATE POLICY "authenticated_can_insert_work_orders"
  ON public.produccion_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_work_orders" ON public.produccion_work_orders;
CREATE POLICY "authenticated_can_update_work_orders"
  ON public.produccion_work_orders FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_work_orders" ON public.produccion_work_orders;
CREATE POLICY "authenticated_can_delete_work_orders"
  ON public.produccion_work_orders FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- POLÍTICAS PARA materials
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_materials" ON public.materials;
CREATE POLICY "authenticated_can_view_materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_materials" ON public.materials;
CREATE POLICY "authenticated_can_insert_materials"
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_materials" ON public.materials;
CREATE POLICY "authenticated_can_update_materials"
  ON public.materials FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_materials" ON public.materials;
CREATE POLICY "authenticated_can_delete_materials"
  ON public.materials FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- POLÍTICAS PARA logistics
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_logistics" ON public.logistics;
CREATE POLICY "authenticated_can_view_logistics"
  ON public.logistics FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_logistics" ON public.logistics;
CREATE POLICY "authenticated_can_insert_logistics"
  ON public.logistics FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_logistics" ON public.logistics;
CREATE POLICY "authenticated_can_update_logistics"
  ON public.logistics FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_logistics" ON public.logistics;
CREATE POLICY "authenticated_can_delete_logistics"
  ON public.logistics FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- POLÍTICAS PARA incidencias
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_incidencias" ON public.incidencias;
CREATE POLICY "authenticated_can_view_incidencias"
  ON public.incidencias FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_insert_incidencias" ON public.incidencias;
CREATE POLICY "authenticated_can_insert_incidencias"
  ON public.incidencias FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_update_incidencias" ON public.incidencias;
CREATE POLICY "authenticated_can_update_incidencias"
  ON public.incidencias FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_delete_incidencias" ON public.incidencias;
CREATE POLICY "authenticated_can_delete_incidencias"
  ON public.incidencias FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================================
-- PERMISOS DE TABLA
-- =====================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.comercial_orders TO authenticated;
GRANT ALL ON public.order_documents TO authenticated;
GRANT ALL ON public.status_log TO authenticated;
GRANT ALL ON public.produccion_work_orders TO authenticated;
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.logistics TO authenticated;
GRANT ALL ON public.incidencias TO authenticated;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Todas las tablas tienen RLS habilitado
-- 2. Por ahora, todos los usuarios autenticados tienen acceso completo
-- 3. En producción, se recomienda refinar las políticas por rol:
--    - Comercial: Solo managers pueden editar pedidos
--    - Producción: Operarios ven sus órdenes, managers gestionan
--    - Logística: Usuarios de almacén pueden ver/editar
--    - Incidencias: Todos pueden reportar, admins gestionan
-- 4. Las políticas actuales son permisivas para facilitar desarrollo
-- 5. Se recomienda implementar políticas más restrictivas en producción
-- =====================================================================
