-- CONFIGURAR STORAGE PARA DOCUMENTOS DE PEDIDOS
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- 1. Crear bucket para documentos de pedidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'order-documents',
    'order-documents',
    false, -- No público, requiere autenticación
    10485760, -- 10MB límite
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de acceso al bucket
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Permitir subida a usuarios autenticados (desde MAIN)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'order-documents'
);

-- Permitir lectura a usuarios autenticados
CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'order-documents'
);

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'order-documents'
);

-- 3. Verificar creación del bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'order-documents';

-- 4. Verificar políticas
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%order%';
