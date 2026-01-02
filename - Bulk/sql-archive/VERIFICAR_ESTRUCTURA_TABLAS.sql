-- ==================================================================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- ==================================================================================

-- Ver todas las columnas de la tabla vehicles
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'vehicles'
ORDER BY ordinal_position;

-- Ver todas las columnas de la tabla profiles
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver todas las columnas de la tabla screen_data
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'screen_data'
ORDER BY ordinal_position;

-- Ver todas las tablas existentes
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
