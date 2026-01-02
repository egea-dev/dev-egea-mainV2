-- =====================================================
-- POLÍTICAS DE STORAGE PARA AVATARES
-- =====================================================
-- ⚠️ EJECUTA ESTO SOLO DESPUÉS DE:
-- 1. Haber creado el bucket "avatars" manualmente en Storage
-- 2. Haber marcado el bucket como PUBLIC
-- =====================================================

-- PASO 1: Verificar que el bucket existe
-- =====================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'El bucket "avatars" no existe. Debes crearlo manualmente primero en Storage.';
  ELSE
    RAISE NOTICE '✅ El bucket "avatars" existe';
  END IF;
END $$;

-- PASO 2: Eliminar políticas antiguas si existen
-- =====================================================

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- PASO 3: Crear políticas de Storage
-- =====================================================

-- Permitir a usuarios autenticados subir sus propios avatares
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios autenticados actualizar sus propios avatares
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios autenticados eliminar sus propios avatares
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir lectura pública de avatares (necesario para mostrarlos)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- PASO 4: Verificar resultado
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas de Storage creadas: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Configuración completada!';
  RAISE NOTICE 'Ahora puedes subir avatares sin problemas.';
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================