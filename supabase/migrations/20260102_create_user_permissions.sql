-- MIGRATION: 20260102_create_user_permissions.sql
-- Description: Creates table for individual user permissions that override role-based permissions

BEGIN;

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one permission per user per module
  UNIQUE(user_id, module)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON public.user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_enabled ON public.user_permissions(enabled);

-- Add RLS policies
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM public.profiles WHERE id = user_id));

-- Policy: Admins and managers can view all permissions
CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Policy: Only admins can insert/update/delete permissions
CREATE POLICY "Only admins can manage permissions"
  ON public.user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER trigger_update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_permissions_updated_at();

-- Add comment
COMMENT ON TABLE public.user_permissions IS 'Individual user permissions that override role-based permissions. If a user has a specific permission set here, it takes precedence over their role permissions.';

COMMIT;
