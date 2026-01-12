-- MIGRATION: 20260102_add_operational_roles.sql
-- Description: Adds 'production', 'shipping', 'warehouse', 'comercial' roles and their permissions.

BEGIN;

-- 1. Update Check Constraint on public.profiles
-- We need to drop the existing constraint and add a new one with the expanded list of roles.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'manager', 'responsable', 'operario', 'production', 'shipping', 'warehouse', 'comercial'));

-- 2. Insert Permissions for new roles into public.role_permissions
-- We assume the 'new' schema (resource, action, granted) is in place as per MIGRATION_FINAL.sql auto-healing.

-- Helper DO block to insert permissions safely
DO $$
DECLARE
  new_roles text[] := ARRAY['production', 'shipping', 'warehouse', 'comercial'];
  r text;
BEGIN
  -- Clear existing permissions for these roles to ensure a clean slate if re-run
  DELETE FROM public.role_permissions WHERE role = ANY(new_roles);

  -- FOREACH role, we define specific permissions
  
  -- === PRODUCTION ===
  -- Access to: production (full?), envios (scan only?)
  -- Interpret: "produccion solo accede a produccion para escanar y rellenar datos... y envios lo mismo"
  -- We grant view/create/edit on 'production' resource.
  INSERT INTO public.role_permissions (role, resource, action, granted) VALUES 
  ('production', 'production', 'view', true),
  ('production', 'production', 'create', true), -- "rellenar datos"
  ('production', 'production', 'edit', true),
  ('production', 'envios', 'view', true),        -- "envios lo mismo" (scan/fill)
  ('production', 'envios', 'edit', true),
  ('production', 'dashboard', 'view', true);     -- Access to main layout/dashboard basic

  -- === SHIPPING (Envios) ===
  -- Access to: envios (only)
  INSERT INTO public.role_permissions (role, resource, action, granted) VALUES 
  ('shipping', 'envios', 'view', true),
  ('shipping', 'envios', 'edit', true),
  ('shipping', 'envios', 'create', true),
  ('shipping', 'dashboard', 'view', true);

  -- === WAREHOUSE (Almacen) ===
  -- Access to: warehouse, comercial (read?)
  -- Interpret: "almacen solo accederia a todo lo relacionado con almacen y Comercial"
  -- Assuming full access to warehouse, view access to comercial? Or full? Giving View for commercial initially for safety.
  INSERT INTO public.role_permissions (role, resource, action, granted) VALUES 
  ('warehouse', 'warehouse', 'view', true),
  ('warehouse', 'warehouse', 'create', true),
  ('warehouse', 'warehouse', 'edit', true),
  ('warehouse', 'warehouse', 'delete', true),
  ('warehouse', 'comercial', 'view', true),      -- "y Comercial"
  ('warehouse', 'dashboard', 'view', true);

  -- === COMERCIAL ===
  -- Access to: comercial (full)
  INSERT INTO public.role_permissions (role, resource, action, granted) VALUES 
  ('comercial', 'comercial', 'view', true),
  ('comercial', 'comercial', 'create', true),
  ('comercial', 'comercial', 'edit', true),
  ('comercial', 'comercial', 'delete', true),
  ('comercial', 'dashboard', 'view', true);

END $$;

COMMIT;
