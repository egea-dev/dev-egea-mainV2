-- EXPONER ESQUEMAS EN API DE SUPABASE PRODUCTIVITY
-- Ejecutar en SQL Editor de PRODUCTIVITY DB

-- 1. Exponer esquemas comercial, produccion y almacen en la API
-- Esto permite que PostgREST acceda a estos esquemas

-- Verificar esquemas actuales expuestos
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('comercial', 'produccion', 'almacen');

-- IMPORTANTE: Ir a Settings > API > Exposed schemas en Supabase Dashboard
-- Y añadir: comercial, produccion, almacen

-- Alternativamente, si tienes acceso a la configuración de PostgREST:
-- Añadir a db-schemas: "public,comercial,produccion,almacen"

-- Verificar que las tablas existen
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('comercial', 'produccion', 'almacen')
ORDER BY table_schema, table_name;
