-- Fixes the RLS policy for inserting new profiles.

BEGIN;

-- Drop the old catch-all policy
DROP POLICY IF EXISTS "admins_can_manage_all_profiles" ON public.profiles;

-- Create a specific insert policy for admins
CREATE POLICY "admins_can_insert_profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Recreate the other policies for admins
CREATE POLICY "admins_can_view_all_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_update_all_profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_delete_all_profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMIT;
