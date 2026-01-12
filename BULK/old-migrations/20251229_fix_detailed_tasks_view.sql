-- Fix detailed_tasks view to remove invalid client_id JOIN
-- Drop and recreate the view without the problematic foreign key

DROP VIEW IF EXISTS detailed_tasks CASCADE;

CREATE OR REPLACE VIEW detailed_tasks AS
SELECT 
  sd.*,
  -- Get assigned profiles
  COALESCE(
    (SELECT json_agg(json_build_object('id', p.id, 'full_name', p.full_name))
     FROM task_profiles tp
     JOIN profiles p ON p.id = tp.profile_id
     WHERE tp.task_id = sd.id),
    '[]'::json
  ) AS assigned_profiles,
  -- Get assigned vehicles
  COALESCE(
    (SELECT json_agg(json_build_object('id', v.id, 'name', v.name))
     FROM task_vehicles tv
     JOIN vehicles v ON v.id = tv.vehicle_id
     WHERE tv.task_id = sd.id),
    '[]'::json
  ) AS assigned_vehicles
FROM screen_data sd;

COMMENT ON VIEW detailed_tasks IS 'View that includes tasks with their assigned profiles and vehicles';
