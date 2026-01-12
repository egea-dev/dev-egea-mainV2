-- =====================================================================
-- SCRIPT CONSOLIDADO FINAL: SCHEMA COMPLETO PRODUCTIVITY DATABASE
-- =====================================================================
-- Fecha: 12 de enero de 2026
-- Versión: 2.0 Final
-- Objetivo: Crear estructura completa de tablas para PRODUCTIVITY Database
-- Base de datos: Supabase PRODUCTIVITY
-- =====================================================================

BEGIN;

-- =====================================================================
-- EXTENSIONES REQUERIDAS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLA: comercial_orders (Pedidos Comerciales)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.comercial_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    admin_code TEXT,
    
    -- Información del Cliente
    customer_name TEXT,
    customer_code TEXT,
    customer_company TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    
    -- Información de Entrega
    delivery_region TEXT CHECK (delivery_region IN ('PENINSULA', 'BALEARES', 'CANARIAS')),
    delivery_date DATE,
    delivery_address TEXT,
    delivery_location_url TEXT,
    
    -- Estado del Pedido
    status TEXT NOT NULL DEFAULT 'PENDIENTE_PAGO' CHECK (
        status IN (
            'PENDIENTE_PAGO', 
            'PAGADO', 
            'EN_PROCESO', 
            'PTE_ENVIO', 
            'ENVIADO', 
            'ENTREGADO',
            'CANCELADO'
        )
    ),
    
    -- Datos Técnicos
    fabric TEXT,
    color TEXT,
    quantity_total INTEGER DEFAULT 0,
    
    -- Datos JSONB
    lines JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Notas
    internal_notes TEXT,
    
    -- QR y Tracking
    qr_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: order_documents (Documentos de Pedidos)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.order_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.comercial_orders(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('albarán', 'factura', 'presupuesto', 'contrato', 'otro')),
    document_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: status_log (Historial de Estados de Pedidos)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.comercial_orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: produccion_work_orders (Órdenes de Trabajo de Producción)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.produccion_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT NOT NULL UNIQUE,
    comercial_order_id UUID REFERENCES public.comercial_orders(id) ON DELETE SET NULL,
    
    -- Información Básica
    product_type TEXT,
    fabric TEXT,
    color TEXT,
    quantity INTEGER DEFAULT 0,
    
    -- Estado de Producción
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (
        status IN (
            'PENDIENTE',
            'EN_CORTE',
            'EN_CONFECCION',
            'EN_CONTROL_CALIDAD',
            'TERMINADO',
            'RECHAZADO',
            'EN_PAUSA'
        )
    ),
    
    -- Asignaciones
    assigned_operator_id UUID,
    assigned_machine TEXT,
    
    -- Control de Calidad
    quality_check_passed BOOLEAN DEFAULT false,
    quality_check_notes TEXT,
    quality_checked_by UUID,
    quality_checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Producción
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion DATE,
    
    -- Datos Adicionales
    notes TEXT,
    defects JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: materials (Catálogo de Materiales)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('tela', 'hilo', 'accesorio', 'embalaje', 'otro')),
    description TEXT,
    unit TEXT DEFAULT 'metros',
    stock_quantity NUMERIC(10,2) DEFAULT 0,
    min_stock_quantity NUMERIC(10,2) DEFAULT 0,
    unit_price NUMERIC(10,2),
    supplier TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: logistics (Logística y Envíos)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.comercial_orders(id) ON DELETE CASCADE,
    
    -- Información de Envío
    shipping_method TEXT CHECK (shipping_method IN ('MENSAJERIA', 'TRANSPORTE', 'RECOGIDA', 'OTRO')),
    tracking_number TEXT,
    carrier TEXT,
    
    -- Estado de Envío
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (
        status IN (
            'PENDIENTE',
            'PREPARANDO',
            'LISTO_PARA_ENVIO',
            'EN_TRANSITO',
            'ENTREGADO',
            'DEVUELTO',
            'CANCELADO'
        )
    ),
    
    -- Fechas
    scheduled_date DATE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Ubicación
    warehouse_location TEXT,
    delivery_address TEXT,
    delivery_notes TEXT,
    
    -- Paquetes
    packages_count INTEGER DEFAULT 1,
    total_weight NUMERIC(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: incidencias (Incidencias de Producción y Calidad)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES public.produccion_work_orders(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.comercial_orders(id) ON DELETE CASCADE,
    
    -- Tipo y Descripción
    type TEXT NOT NULL CHECK (type IN ('calidad', 'rotura', 'falta_material', 'retraso', 'otro')),
    description TEXT NOT NULL,
    
    -- Estado y Prioridad
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_revision', 'resuelto', 'desestimado')),
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    
    -- Reportado por
    reported_by_name TEXT,
    reported_by_user_id UUID,
    
    -- Evidencia
    image_url TEXT,
    
    -- Resolución
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_user_id UUID,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÍNDICES OPTIMIZADOS
-- =====================================================================

-- Índices para comercial_orders
CREATE INDEX IF NOT EXISTS idx_comercial_orders_order_number ON public.comercial_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_comercial_orders_status ON public.comercial_orders(status);
CREATE INDEX IF NOT EXISTS idx_comercial_orders_customer_code ON public.comercial_orders(customer_code);
CREATE INDEX IF NOT EXISTS idx_comercial_orders_delivery_date ON public.comercial_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_comercial_orders_created_at ON public.comercial_orders(created_at DESC);

-- Índices para order_documents
CREATE INDEX IF NOT EXISTS idx_order_documents_order_id ON public.order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_type ON public.order_documents(document_type);

-- Índices para status_log
CREATE INDEX IF NOT EXISTS idx_status_log_order_id ON public.status_log(order_id);
CREATE INDEX IF NOT EXISTS idx_status_log_created_at ON public.status_log(created_at DESC);

-- Índices para produccion_work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON public.produccion_work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.produccion_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_comercial_order ON public.produccion_work_orders(comercial_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_operator ON public.produccion_work_orders(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.produccion_work_orders(created_at DESC);

-- Índices para materials
CREATE INDEX IF NOT EXISTS idx_materials_code ON public.materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active) WHERE is_active = true;

-- Índices para logistics
CREATE INDEX IF NOT EXISTS idx_logistics_order_id ON public.logistics(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_status ON public.logistics(status);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking ON public.logistics(tracking_number);
CREATE INDEX IF NOT EXISTS idx_logistics_scheduled_date ON public.logistics(scheduled_date);

-- Índices para incidencias
CREATE INDEX IF NOT EXISTS idx_incidencias_work_order ON public.incidencias(work_order_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_order ON public.incidencias(order_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_status ON public.incidencias(status);
CREATE INDEX IF NOT EXISTS idx_incidencias_priority ON public.incidencias(priority);
CREATE INDEX IF NOT EXISTS idx_incidencias_created_at ON public.incidencias(created_at DESC);

-- =====================================================================
-- TRIGGERS PARA updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_comercial_orders_updated_at BEFORE UPDATE ON public.comercial_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_work_orders_updated_at BEFORE UPDATE ON public.produccion_work_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_logistics_updated_at BEFORE UPDATE ON public.logistics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_incidencias_updated_at BEFORE UPDATE ON public.incidencias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- FUNCIÓN PARA GENERAR NÚMERO DE PEDIDO
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
    year_code TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_code := to_char(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.comercial_orders
    WHERE order_number LIKE 'INT-' || year_code || '%';
    
    new_number := 'INT-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCIÓN PARA GENERAR NÚMERO DE ORDEN DE TRABAJO
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
    year_code TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_code := to_char(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.produccion_work_orders
    WHERE work_order_number LIKE 'WO-' || year_code || '%';
    
    new_number := 'WO-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Este script consolida todas las tablas de PRODUCTIVITY DB
-- 2. Incluye módulos: Comercial, Producción, Logística, Materiales, Incidencias
-- 3. Los índices están optimizados para consultas frecuentes
-- 4. Los triggers aseguran consistencia en timestamps
-- 5. Funciones para generar números de pedido y órdenes de trabajo
-- 6. Ejecutar este script en una base de datos LIMPIA de Supabase PRODUCTIVITY
-- =====================================================================
