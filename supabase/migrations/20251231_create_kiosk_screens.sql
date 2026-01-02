-- WARNING: This will delete existing Kiosk Screens data to ensure schema consistency
-- Drop existing table and policies to start fresh
DROP TABLE IF EXISTS public.kiosk_screens CASCADE;

-- Create kiosk_screens table in public schema
CREATE TABLE public.kiosk_screens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    kiosk_type TEXT CHECK (kiosk_type IN ('MONITOR', 'TABLET', 'TERMINAL')),
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    last_ping TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.kiosk_screens ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE POLICIES FOR CROSS-PROJECT USAGE
-- Since users authenticate on MAIN DB, their tokens are not valid for PRODUCTIVITY DB.
-- We enable public access for now.

CREATE POLICY "Enable all access for all users" ON public.kiosk_screens
    FOR ALL USING (true) WITH CHECK (true);
