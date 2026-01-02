-- MIGRACIÓN: Crear tabla de materiales en Almacén
-- Ejecutar en PRODUCTIVITY DB

-- Crear tabla almacen_materials
CREATE TABLE IF NOT EXISTS public.almacen_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reference TEXT, -- Referencia del material (ej: "MAT-001")
    color TEXT,
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'metros', -- unidad de medida
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_almacen_materials_name ON public.almacen_materials(name);
CREATE INDEX IF NOT EXISTS idx_almacen_materials_reference ON public.almacen_materials(reference);
CREATE INDEX IF NOT EXISTS idx_almacen_materials_active ON public.almacen_materials(is_active);

-- Comentarios
COMMENT ON TABLE public.almacen_materials IS 'Catálogo de materiales disponibles en almacén';
COMMENT ON COLUMN public.almacen_materials.reference IS 'Código de referencia del material';
COMMENT ON COLUMN public.almacen_materials.stock IS 'Stock disponible en unidades';
COMMENT ON COLUMN public.almacen_materials.unit IS 'Unidad de medida (metros, unidades, kg, etc)';

-- RLS (deshabilitado para desarrollo)
ALTER TABLE public.almacen_materials DISABLE ROW LEVEL SECURITY;

-- Datos de ejemplo
INSERT INTO public.almacen_materials (name, reference, color, stock, unit, notes) VALUES
('Lino Natural', 'LIN-001', 'Beige', 150, 'metros', 'Lino 100% natural'),
('Algodón Blanco', 'ALG-001', 'Blanco', 200, 'metros', 'Algodón premium'),
('Poliéster Gris', 'POL-001', 'Gris', 100, 'metros', 'Resistente al agua'),
('Seda Azul', 'SED-001', 'Azul', 50, 'metros', 'Seda natural'),
('Terciopelo Negro', 'TER-001', 'Negro', 75, 'metros', 'Terciopelo de alta calidad')
ON CONFLICT DO NOTHING;

-- Verificar
SELECT * FROM public.almacen_materials ORDER BY created_at DESC;
