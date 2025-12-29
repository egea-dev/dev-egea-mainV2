-- =====================================================
-- FIX DETAILED_TASKS VIEW - Execute in Supabase SQL Editor
-- =====================================================
-- This fixes the 400 error when loading tasks in Installations
-- by removing the invalid client_id foreign key JOIN

-- Step 1: Drop the existing view
DROP VIEW IF EXISTS detailed_tasks CASCADE;

-- Step 2: Recreate the view without the problematic client JOIN
CREATE OR REPLACE VIEW detailed_tasks AS
SELECT 
  sd.*,
  s.screen_group,
  s.name as screen_name,
  s.screen_type,
  -- Computed is_urgent for sorting
  CASE WHEN lower(sd.state) = 'urgente' THEN true ELSE false END as is_urgent,
  -- Get assigned profiles as JSON array
  COALESCE(
    (SELECT json_agg(json_build_object('id', p.id, 'full_name', p.full_name))
     FROM task_profiles tp
     JOIN profiles p ON p.id = tp.profile_id
     WHERE tp.task_id = sd.id),
    '[]'::json
  ) AS assigned_profiles,
  -- Get assigned vehicles as JSON array
  COALESCE(
    (SELECT json_agg(json_build_object('id', v.id, 'name', v.name))
     FROM task_vehicles tv
     JOIN vehicles v ON v.id = tv.vehicle_id
     WHERE tv.task_id = sd.id),
    '[]'::json
  ) AS assigned_vehicles
FROM screen_data sd
LEFT JOIN screens s ON sd.screen_id = s.id;

-- Step 3: Add comment
COMMENT ON VIEW detailed_tasks IS 'View that includes tasks with their assigned profiles and vehicles';

-- Step 4: Verify the view works
SELECT COUNT(*) as total_tasks FROM detailed_tasks;

-- Step 5: Test with a sample query (like Installations uses)
SELECT * FROM detailed_tasks 
WHERE start_date >= CURRENT_DATE - INTERVAL '1 day'
  AND start_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY start_date ASC
LIMIT 5;
