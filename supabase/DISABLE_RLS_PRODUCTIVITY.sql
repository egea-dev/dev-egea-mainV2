-- DESHABILITAR RLS TEMPORALMENTE PARA DESARROLLO
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- Opción 1: Deshabilitar RLS completamente (SOLO PARA DESARROLLO)
ALTER TABLE public.comercial_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_sla_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipment_items DISABLE ROW LEVEL SECURITY;

-- Opción 2: Crear políticas permisivas (RECOMENDADO)
-- Descomentar si prefieres mantener RLS activo con políticas permisivas

-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.comercial_orders;
-- CREATE POLICY "Enable all for authenticated users" 
--   ON public.comercial_orders 
--   FOR ALL 
--   TO anon, authenticated
--   USING (true) 
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.comercial_customers;
-- CREATE POLICY "Enable all for authenticated users" 
--   ON public.comercial_customers 
--   FOR ALL 
--   TO anon, authenticated
--   USING (true) 
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.produccion_work_orders;
-- CREATE POLICY "Enable all for authenticated users" 
--   ON public.produccion_work_orders 
--   FOR ALL 
--   TO anon, authenticated
--   USING (true) 
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.almacen_inventory;
-- CREATE POLICY "Enable all for authenticated users" 
--   ON public.almacen_inventory 
--   FOR ALL 
--   TO anon, authenticated
--   USING (true) 
--   WITH CHECK (true);

-- VERIFICAR ESTADO DE RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%comercial%' 
   OR tablename LIKE '%produccion%' 
   OR tablename LIKE '%almacen%'
ORDER BY tablename;
