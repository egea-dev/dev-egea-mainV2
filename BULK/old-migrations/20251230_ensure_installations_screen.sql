-- Ensure 'Instalaciones' screen exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.screens WHERE screen_group = 'Instalaciones') THEN
        INSERT INTO public.screens (name, screen_group, screen_type, is_active, dashboard_section, dashboard_order)
        VALUES ('Instalaciones', 'Instalaciones', 'data', true, 'main', 1);
    END IF;
END $$;
