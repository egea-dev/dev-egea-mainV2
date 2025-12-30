-- =====================================================================
-- TEST DIRECTO: Consulta simple a detailed_tasks
-- Ejecutar en DB MAIN para identificar el error exacto
-- =====================================================================

-- Test 1: ¿Existe la vista?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'detailed_tasks'
) as view_exists;

-- Test 2: Intentar SELECT simple
SELECT * FROM public.detailed_tasks LIMIT 1;

-- Test 3: Si falla el anterior, probar consulta directa a screen_data
SELECT 
    sd.id,
    sd.screen_id,
    sd.state,
    sd.status,
    sd.start_date,
    s.screen_group,
    s.name as screen_name
FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LIMIT 5;
