-- =====================================================================
-- MIGRACIÓN: Añadir soporte de escaneo persistente a shipments
-- =====================================================================
-- Fecha: 2025-12-24
-- Objetivo: Añadir columnas que permitan persistir el progreso de verificación
--           de bultos en la tabla shipments, similar al módulo de producción.
-- =====================================================================

BEGIN;

-- 1. Añadir columnas a almacen.shipments
ALTER TABLE almacen.shipments
ADD COLUMN IF NOT EXISTS scanned_packages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS packages_count INTEGER DEFAULT 0;

-- 2. Actualizar packages_count basado en items existentes (opcional, para consistencia inicial)
UPDATE almacen.shipments s
SET packages_count = (
    SELECT count(*) 
    FROM almacen.shipment_items si 
    WHERE si.shipment_id = s.id
);

-- 3. (Opcional) Trigger para mantener packages_count actualizado automáticamente
CREATE OR REPLACE FUNCTION almacen.update_shipment_packages_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE almacen.shipments
        SET packages_count = packages_count + 1
        WHERE id = NEW.shipment_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE almacen.shipments
        SET packages_count = packages_count - 1
        WHERE id = OLD.shipment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_shipment_packages_count ON almacen.shipment_items;

CREATE TRIGGER tr_update_shipment_packages_count
AFTER INSERT OR DELETE ON almacen.shipment_items
FOR EACH ROW EXECUTE FUNCTION almacen.update_shipment_packages_count();

COMMIT;
