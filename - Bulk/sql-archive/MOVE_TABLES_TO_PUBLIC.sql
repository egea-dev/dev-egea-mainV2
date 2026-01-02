-- LIMPIEZA TOTAL Y MIGRACIÓN A PUBLIC
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- 1. ELIMINAR TODAS LAS TABLAS POSIBLES EN PUBLIC (originales y renombradas)
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.sla_config CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.production_activity CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.shipments CASCADE;
DROP TABLE IF EXISTS public.shipment_items CASCADE;

-- Eliminar también las versiones renombradas si existen
DROP TABLE IF EXISTS public.comercial_orders CASCADE;
DROP TABLE IF EXISTS public.comercial_customers CASCADE;
DROP TABLE IF EXISTS public.comercial_sla_config CASCADE;
DROP TABLE IF EXISTS public.produccion_work_orders CASCADE;
DROP TABLE IF EXISTS public.produccion_activity CASCADE;
DROP TABLE IF EXISTS public.almacen_inventory CASCADE;
DROP TABLE IF EXISTS public.almacen_shipments CASCADE;
DROP TABLE IF EXISTS public.almacen_shipment_items CASCADE;

-- 2. MOVER TABLAS DE COMERCIAL A PUBLIC
ALTER TABLE IF EXISTS comercial.orders SET SCHEMA public;
ALTER TABLE IF EXISTS comercial.customers SET SCHEMA public;
ALTER TABLE IF EXISTS comercial.sla_config SET SCHEMA public;

-- 3. RENOMBRAR EN PUBLIC
ALTER TABLE IF EXISTS public.orders RENAME TO comercial_orders;
ALTER TABLE IF EXISTS public.customers RENAME TO comercial_customers;
ALTER TABLE IF EXISTS public.sla_config RENAME TO comercial_sla_config;

-- 4. MOVER TABLAS DE PRODUCCION
ALTER TABLE IF EXISTS produccion.work_orders SET SCHEMA public;
ALTER TABLE IF EXISTS produccion.production_activity SET SCHEMA public;

ALTER TABLE IF EXISTS public.work_orders RENAME TO produccion_work_orders;
ALTER TABLE IF EXISTS public.production_activity RENAME TO produccion_activity;

-- 5. MOVER TABLAS DE ALMACEN
ALTER TABLE IF EXISTS almacen.inventory SET SCHEMA public;
ALTER TABLE IF EXISTS almacen.shipments SET SCHEMA public;
ALTER TABLE IF EXISTS almacen.shipment_items SET SCHEMA public;

ALTER TABLE IF EXISTS public.inventory RENAME TO almacen_inventory;
ALTER TABLE IF EXISTS public.shipments RENAME TO almacen_shipments;
ALTER TABLE IF EXISTS public.shipment_items RENAME TO almacen_shipment_items;

-- 6. RECREAR FOREIGN KEYS
ALTER TABLE public.comercial_orders 
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey,
  DROP CONSTRAINT IF EXISTS comercial_orders_customer_id_fkey,
  ADD CONSTRAINT comercial_orders_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.comercial_customers(id);

ALTER TABLE public.produccion_work_orders
  DROP CONSTRAINT IF EXISTS work_orders_order_id_fkey,
  DROP CONSTRAINT IF EXISTS produccion_work_orders_order_id_fkey,
  ADD CONSTRAINT produccion_work_orders_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.comercial_orders(id) ON DELETE CASCADE;

ALTER TABLE public.produccion_activity
  DROP CONSTRAINT IF EXISTS production_activity_work_order_id_fkey,
  DROP CONSTRAINT IF EXISTS produccion_activity_work_order_id_fkey,
  ADD CONSTRAINT produccion_activity_work_order_id_fkey
  FOREIGN KEY (work_order_id) REFERENCES public.produccion_work_orders(id) ON DELETE CASCADE;

ALTER TABLE public.almacen_inventory
  DROP CONSTRAINT IF EXISTS inventory_work_order_id_fkey,
  DROP CONSTRAINT IF EXISTS almacen_inventory_work_order_id_fkey,
  ADD CONSTRAINT almacen_inventory_work_order_id_fkey
  FOREIGN KEY (work_order_id) REFERENCES public.produccion_work_orders(id) ON DELETE SET NULL;

ALTER TABLE public.almacen_shipment_items
  DROP CONSTRAINT IF EXISTS shipment_items_shipment_id_fkey,
  DROP CONSTRAINT IF EXISTS shipment_items_inventory_id_fkey,
  DROP CONSTRAINT IF EXISTS almacen_shipment_items_shipment_id_fkey,
  DROP CONSTRAINT IF EXISTS almacen_shipment_items_inventory_id_fkey,
  ADD CONSTRAINT almacen_shipment_items_shipment_id_fkey
  FOREIGN KEY (shipment_id) REFERENCES public.almacen_shipments(id) ON DELETE CASCADE,
  ADD CONSTRAINT almacen_shipment_items_inventory_id_fkey
  FOREIGN KEY (inventory_id) REFERENCES public.almacen_inventory(id) ON DELETE CASCADE;

-- 7. HABILITAR RLS
ALTER TABLE public.comercial_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_shipment_items ENABLE ROW LEVEL SECURITY;

-- 8. CREAR POLÍTICAS (solo usuarios autenticados)
DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.comercial_orders;
    CREATE POLICY all_access ON public.comercial_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.comercial_customers;
    CREATE POLICY all_access ON public.comercial_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.comercial_sla_config;
    CREATE POLICY all_access ON public.comercial_sla_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.produccion_work_orders;
    CREATE POLICY all_access ON public.produccion_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.produccion_activity;
    CREATE POLICY all_access ON public.produccion_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.almacen_inventory;
    CREATE POLICY all_access ON public.almacen_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.almacen_shipments;
    CREATE POLICY all_access ON public.almacen_shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS all_access ON public.almacen_shipment_items;
    CREATE POLICY all_access ON public.almacen_shipment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

-- 9. RECREAR TRIGGER
DROP TRIGGER IF EXISTS tr_on_work_order_finished ON public.produccion_work_orders;
DROP FUNCTION IF EXISTS public.handle_finished_work_order();

CREATE OR REPLACE FUNCTION public.handle_finished_work_order()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'LISTO_ENVIO' AND OLD.status <> 'LISTO_ENVIO') THEN
        INSERT INTO public.almacen_inventory (work_order_id, order_number, status, notes)
        VALUES (NEW.id, NEW.order_number, 'EN_ALMACEN', 'Entrada automática desde Producción');
        
        UPDATE public.comercial_orders 
        SET status = 'LISTO_ENVIO' 
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_on_work_order_finished
AFTER UPDATE ON public.produccion_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_finished_work_order();

-- 10. VERIFICAR
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%comercial%' 
   OR table_name LIKE '%produccion%' 
   OR table_name LIKE '%almacen%')
ORDER BY table_name;
