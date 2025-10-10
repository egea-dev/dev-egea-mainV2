-- Fix CHECK constraint in profiles table to include 'manager' role

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'responsable', 'operario'));