-- ==============================================================================
-- COMMERCIAL MODULE SCHEMA MIGRATION
-- ==============================================================================

-- 1. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE DEFAULT ('INT-' || to_char(now(), 'YYYY') || '-' || substring(gen_random_uuid()::text from 1 for 4)), -- Simple default, better logic in trigger recommended
    admin_code TEXT,
    customer_name TEXT,
    region TEXT CHECK (region IN ('PENINSULA', 'BALEARES', 'CANARIAS')),
    status TEXT NOT NULL DEFAULT 'PENDIENTE_PAGO' CHECK (status IN ('PENDIENTE_PAGO', 'PAGADO', 'EN_PROCESO', 'PTE_ENVIO', 'ENVIADO', 'CANCELADO')),
    
    -- Technical Data
    fabric TEXT,
    color TEXT,
    quantity_total INTEGER DEFAULT 0,
    
    -- JSONB Structures
    lines JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Simple Admin Access for now)
CREATE POLICY "Enable all access for authenticated users" ON public.orders
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Storage Bucket for Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-docs', 'order-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies
CREATE POLICY "Authenticated users can upload order docs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'order-docs' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can view order docs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'order-docs' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update order docs" ON storage.objects
    FOR UPDATE WITH CHECK (
        bucket_id = 'order-docs' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete order docs" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'order-docs' AND
        auth.role() = 'authenticated'
    );

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
