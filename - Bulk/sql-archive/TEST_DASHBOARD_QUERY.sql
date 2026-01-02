-- Simular la consulta exacta del dashboard
SELECT
  sd.*,
  -- task_profiles
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'profiles', jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name
        )
      )
    )
    FROM task_profiles tp
    JOIN profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id
  ) as task_profiles,
  -- task_vehicles
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'vehicles', jsonb_build_object(
          'id', v.id,
          'name', v.name
        )
      )
    )
    FROM task_vehicles tv
    JOIN vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id
  ) as task_vehicles
FROM screen_data sd
WHERE sd.start_date >= CURRENT_DATE
ORDER BY sd.start_date ASC
LIMIT 20;
