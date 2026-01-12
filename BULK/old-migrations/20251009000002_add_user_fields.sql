-- =====================================================================
-- MIGRACIÓN: AÑADIR CAMPOS DE CONTACTO Y URL PÚBLICA A USUARIOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Añadir campos teléfono, WhatsApp y URL pública a la tabla profiles
-- =====================================================================

BEGIN;

-- Añadir campos a la tabla profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT UNIQUE;

-- Crear función para generar URL pública única
CREATE OR REPLACE FUNCTION public.ensure_public_url(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya tiene URL pública
  SELECT public_url INTO v_url FROM public.profiles WHERE id = p_user_id;
  
  IF v_url IS NOT NULL THEN
    RETURN v_url;
  END IF;
  
  -- Generar URL única hasta que no exista
  LOOP
    v_url := '/u/' || encode(gen_random_bytes(5), 'hex');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_url = v_url) INTO v_exists;
    
    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Actualizar el perfil con la nueva URL
  UPDATE public.profiles 
  SET public_url = v_url 
  WHERE id = p_user_id;
  
  RETURN v_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para generar URL pública automáticamente
CREATE OR REPLACE FUNCTION public.generate_public_url_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar URL para nuevos usuarios que no tengan una
  IF TG_OP = 'INSERT' AND NEW.public_url IS NULL THEN
    NEW.public_url := public.ensure_public_url(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS on_profile_generate_public_url ON public.profiles;
CREATE TRIGGER on_profile_generate_public_url
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_public_url_trigger();

-- Generar URLs públicas para usuarios existentes que no tengan
UPDATE public.profiles 
SET public_url = public.ensure_public_url(id)
WHERE public_url IS NULL;

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_public_url ON public.profiles(public_url) WHERE public_url IS NOT NULL;

-- Añadir comentarios a los nuevos campos
COMMENT ON COLUMN public.profiles.phone IS 'Número de teléfono del usuario';
COMMENT ON COLUMN public.profiles.whatsapp IS 'Número de WhatsApp para notificaciones';
COMMENT ON COLUMN public.profiles.public_url IS 'URL pública única para el perfil del usuario';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se añaden campos phone, whatsapp y public_url
-- 2. public_url debe ser único y se genera automáticamente
-- 3. Se crea una función para generar URLs únicas de forma segura
-- 4. Se crea un trigger para generar URLs automáticamente en nuevos usuarios
-- 5. Se generan URLs para usuarios existentes que no tengan
-- 6. Se crean índices para optimizar consultas por estos campos
-- =====================================================================