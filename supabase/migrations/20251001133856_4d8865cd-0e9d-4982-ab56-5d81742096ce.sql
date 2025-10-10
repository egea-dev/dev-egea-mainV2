-- Add status and state columns to screen_data table
ALTER TABLE public.screen_data 
ADD COLUMN status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'acabado')),
ADD COLUMN state text NOT NULL DEFAULT 'normal' CHECK (state IN ('normal', 'incidente', 'arreglo'));

-- Add screen_type to screens table to differentiate between pending and completed screens
ALTER TABLE public.screens 
ADD COLUMN screen_type text NOT NULL DEFAULT 'pendiente' CHECK (screen_type IN ('pendiente', 'acabado'));

-- Create index for faster filtering
CREATE INDEX idx_screen_data_status ON public.screen_data(status);
CREATE INDEX idx_screen_data_state ON public.screen_data(state);
CREATE INDEX idx_screens_screen_type ON public.screens(screen_type);