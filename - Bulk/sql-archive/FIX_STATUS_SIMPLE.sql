-- Actualizar todos los usuarios a 'activo' si no tienen status
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

-- Ver resultado
SELECT full_name, role, status FROM public.profiles ORDER BY full_name;
