-- VERIFICAR Y DESHABILITAR RLS - EJECUTAR EN PRODUCTIVITY DB
-- https://supabase.com/dashboard/project/zslcblcetrhbsdirkvza/sql

-- 1. VERIFICAR ESTADO ACTUAL DE RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%comercial%' 
   OR tablename LIKE '%produccion%' 
   OR tablename LIKE '%almacen%')
ORDER BY tablename;

-- 2. DESHABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.comercial_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_sla_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipment_items DISABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (tablename LIKE '%comercial%' 
           OR tablename LIKE '%produccion%' 
           OR tablename LIKE '%almacen%')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 4. VERIFICAR QUE RLS ESTÁ DESHABILITADO
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS ACTIVO' 
        ELSE '✅ RLS DESHABILITADO' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%comercial%' 
   OR tablename LIKE '%produccion%' 
   OR tablename LIKE '%almacen%')
ORDER BY tablename;

-- 5. VERIFICAR QUE NO HAY POLÍTICAS
SELECT 
    schemaname,
    tablename,
    COUNT(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE '%comercial%' 
   OR tablename LIKE '%produccion%' 
   OR tablename LIKE '%almacen%')
GROUP BY schemaname, tablename;
