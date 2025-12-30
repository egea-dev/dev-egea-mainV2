-- =====================================================================
-- VERIFICACIÓN: Estado de la vista detailed_tasks
-- Ejecutar en DB MAIN para diagnosticar problemas
-- =====================================================================

-- 1. Verificar que la vista existe y listar sus columnas
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'detailed_tasks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Contar registros en la vista (debe devolver al menos 1)
SELECT COUNT(*) as total_tasks 
FROM public.detailed_tasks;

-- 3. Verificar que screen_group está presente
SELECT 
    id,
    screen_group,
    screen_name,
    state,
    status,
    start_date
FROM public.detailed_tasks
LIMIT 5;

-- 4. Verificar permisos otorgados
SELECT 
    grantee, 
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'detailed_tasks'
  AND table_schema = 'public';

-- 5. Verificar que las tablas base existen
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('screen_data', 'screens', 'profiles', 'task_profiles', 'task_vehicles', 'vehicles')
ORDER BY table_name;
