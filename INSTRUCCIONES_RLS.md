# Instrucciones para Resolver el Error 406

## 🔍 Diagnóstico del Problema

El error **406 (Not Acceptable)** indica que Row Level Security (RLS) está bloqueando completamente el acceso a la tabla `profiles`.

## 📋 Proceso de Solución (Paso a Paso)

### Opción 1: Diagnóstico Primero (Recomendado)

1. **Ejecutar diagnóstico:**
   - Abre: https://supabase.com/dashboard/project/llcjtkksaqzbijwgqwou/sql/new
   - Copia y pega el contenido de `diagnose_rls.sql`
   - Haz clic en "Run"
   - **Revisa el output** para ver qué políticas existen

2. **Si hay políticas conflictivas:**
   - Ejecuta `fix_rls_final.sql` (que ya intentaste)
   - Si sigue fallando, continúa con Opción 2

### Opción 2: Deshabilitar RLS Temporalmente (Para verificar)

**⚠️ SOLO EN DESARROLLO - NO EN PRODUCCIÓN**

1. **Deshabilitar RLS:**
   - Abre: https://supabase.com/dashboard/project/llcjtkksaqzbijwgqwou/sql/new
   - Copia y pega el contenido de `disable_rls_temp.sql`
   - Ejecuta el script
   - **Recarga la aplicación** (Ctrl+Shift+R)

2. **¿Funciona la aplicación ahora?**
   - ✅ **SI funciona:** El problema es RLS. Continúa al paso 3
   - ❌ **NO funciona:** El problema es otro (autenticación, permisos, etc.)

3. **Habilitar RLS correctamente:**
   - Ejecuta `enable_rls_correct.sql`
   - Recarga la aplicación
   - Debería funcionar correctamente

### Opción 3: Verificar Autenticación

Si ni siquiera deshabilitar RLS resuelve el problema:

1. **Verifica que el usuario esté autenticado:**
   - Abre las DevTools (F12)
   - Ve a Console
   - Escribe: `localStorage.getItem('supabase.auth.token')`
   - ¿Ves un token? Si no, el problema es autenticación

2. **Si no hay token:**
   - Cierra sesión
   - Vuelve a iniciar sesión
   - Intenta de nuevo

## 📁 Archivos Creados

1. **diagnose_rls.sql** - Para ver el estado actual de RLS
2. **disable_rls_temp.sql** - Para deshabilitar RLS temporalmente
3. **enable_rls_correct.sql** - Para habilitar RLS correctamente
4. **fix_rls_final.sql** - Script completo de corrección

## 🎯 Orden Recomendado de Ejecución

```
1. diagnose_rls.sql          (ver estado actual)
2. disable_rls_temp.sql      (verificar si RLS es el problema)
3. enable_rls_correct.sql    (aplicar RLS correctamente)
```

## ⚠️ Notas Importantes

- **NUNCA** deshabilites RLS en producción
- El error 406 es casi siempre un problema de RLS o autenticación
- Si `disable_rls_temp.sql` hace que funcione, entonces definitivamente es RLS
- Las políticas con nombres duplicados pueden causar conflictos

## 🐛 Debug Adicional

Si nada funciona, verifica en Supabase Dashboard:

1. **Authentication > Users:** ¿Existe el usuario `d2bf547e-cab4-4f80-8e94-d7d7163c480f`?
2. **Table Editor > profiles:** ¿Existe un registro con ese `auth_user_id`?
3. **Database > Policies:** ¿Qué políticas ves en la tabla `profiles`?

## ✅ Solución Rápida

Si solo quieres que funcione **YA** (desarrollo):

```sql
-- Ejecuta esto en SQL Editor:
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data DISABLE ROW LEVEL SECURITY;
```

**Luego habilita RLS correctamente con `enable_rls_correct.sql`**
