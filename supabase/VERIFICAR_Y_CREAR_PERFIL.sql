-- ==================================================================================
-- VERIFICAR SI EXISTE EL PERFIL Y CREARLO SI NO EXISTE
-- ==================================================================================
-- El error 406 puede ser porque el perfil no existe en la tabla profiles
-- ==================================================================================

-- 1. VER TODOS LOS USUARIOS AUTENTICADOS
SELECT id, email, created_at
FROM auth.users
LIMIT 10;

-- 2. VER TODOS LOS PERFILES EXISTENTES
SELECT id, auth_user_id, full_name, email, role, status
FROM public.profiles
LIMIT 10;

-- 3. VERIFICAR SI EXISTE EL PERFIL PARA EL USUARIO d2bf547e-cab4-4f80-8e94-d7d7163c480f
SELECT *
FROM public.profiles
WHERE auth_user_id = 'd2bf547e-cab4-4f80-8e94-d7d7163c480f';

-- Si no hay resultados en la consulta anterior, EJECUTA ESTO:
-- (Reemplaza 'Tu Nombre' y 'tu@email.com' con los datos correctos)

INSERT INTO public.profiles (auth_user_id, full_name, email, role, status)
VALUES (
  'd2bf547e-cab4-4f80-8e94-d7d7163c480f',
  'Administrador',  -- Cambia esto por tu nombre
  'admin@egea.com', -- Cambia esto por tu email
  'admin',
  'activo'
)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ==================================================================================
-- DESPUÉS DE EJECUTAR, RECARGA LA APP
-- ==================================================================================
