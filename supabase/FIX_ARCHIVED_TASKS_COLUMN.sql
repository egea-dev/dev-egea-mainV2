-- =====================================================
-- APLICAR EN SUPABASE SQL EDITOR
-- =====================================================
-- Agregar columna responsible_name si no existe
-- =====================================================

ALTER TABLE public.archived_tasks
ADD COLUMN IF NOT EXISTS responsible_name TEXT;
