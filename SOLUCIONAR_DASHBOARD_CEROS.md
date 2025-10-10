# 🔧 SOLUCIÓN: Dashboard Muestra Todos los Contadores en 0

## 🚨 Problema Identificado

Los contadores del dashboard muestran 0 porque **las migraciones de la base de datos NO se han ejecutado**.

Error específico:
```
function get_dashboard_stats(...) does not exist
```

Esto significa que las funciones y vistas necesarias no existen en tu base de datos de Supabase.

---

## ✅ SOLUCIÓN EN 2 PASOS

### PASO 1: Ejecutar Migraciones Principales

Debes ejecutar estos archivos SQL **en orden** en el SQL Editor de Supabase:

#### 1.1 Tablas Core
**Archivo**: [`supabase/migrations/20251006010000_create_core_tables.sql`](supabase/migrations/20251006010000_create_core_tables.sql)

1. Abre el SQL Editor en Supabase
2. Abre el archivo en tu editor
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Click en **Run** ▶️

#### 1.2 Políticas RLS
**Archivo**: [`supabase/migrations/20251006010001_rls_policies.sql`](supabase/migrations/20251006010001_rls_policies.sql)

Repite el proceso anterior con este archivo.

#### 1.3 Grupos y Comunicaciones
**Archivo**: [`supabase/migrations/20251006010002_groups_and_communications.sql`](supabase/migrations/20251006010002_groups_and_communications.sql)

Repite el proceso anterior con este archivo.

#### 1.4 Vistas y Funciones (⭐ MUY IMPORTANTE)
**Archivo**: [`supabase/migrations/20251006010003_views_and_functions.sql`](supabase/migrations/20251006010003_views_and_functions.sql)

Este archivo crea:
- ✅ Vista `detailed_tasks`
- ✅ Función `get_dashboard_stats()` ← **Esta función es la que falta**
- ✅ Función `upsert_task()`
- ✅ Otras funciones necesarias

Repite el proceso anterior con este archivo.

#### 1.5 Datos de Ejemplo (Opcional)
**Archivo**: [`supabase/migrations/20251006010004_seed_data.sql`](supabase/migrations/20251006010004_seed_data.sql)

Solo si quieres datos de prueba para ver cómo funciona el sistema.

---

### PASO 2: Verificar que Funciona

Ejecuta este script en el SQL Editor:

```sql
-- Verificar que la función existe
SELECT proname FROM pg_proc WHERE proname = 'get_dashboard_stats';

-- Si existe, probarla
SELECT * FROM get_dashboard_stats();

-- Verificar datos
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM vehicles;
SELECT COUNT(*) FROM screen_data;
```

Si todo funciona:
- ✅ La primera consulta devuelve: `get_dashboard_stats`
- ✅ La segunda consulta devuelve números (pueden ser 0 si no hay datos)
- ✅ Las últimas tres muestran cuántos registros hay

---

## 🎯 Después de Aplicar las Migraciones

### Si los contadores siguen en 0:

**Causa**: No hay datos en las tablas.

**Solución**: Inserta datos desde la aplicación:
1. Ve a **Admin → Usuarios** → Añade operarios
2. Ve a **Admin → Vehículos** → Añade vehículos  
3. Ve a **Admin → Instalaciones** → Crea tareas

O ejecuta el script de datos de ejemplo (Paso 1.5).

---

## 📝 Orden Correcto de Ejecución

Es **MUY IMPORTANTE** ejecutar las migraciones en este orden:

```
1. 20251006010000_create_core_tables.sql       ← Crea las tablas
2. 20251006010001_rls_policies.sql             ← Añade seguridad
3. 20251006010002_groups_and_communications.sql ← Funcionalidades extra
4. 20251006010003_views_and_functions.sql      ← CREA get_dashboard_stats()
5. 20251006010004_seed_data.sql (opcional)     ← Datos de prueba
```

Si ejecutas fuera de orden, habrá errores.

---

## ⚠️ Problemas Comunes

### Error: "relation does not exist"
**Causa**: No ejecutaste los pasos en orden.
**Solución**: Empieza desde el paso 1.1.

### Error: "function already exists"  
**Causa**: Ya ejecutaste esta migración antes.
**Solución**: Ignora el error o ejecuta `DROP FUNCTION` primero.

### Los números siguen en 0 después de todo
**Causa**: No hay datos o están muy antiguos.
**Solución**: 
```sql
-- Ver si hay datos
SELECT 
  COUNT(*) as total,
  MIN(start_date) as fecha_min,
  MAX(start_date) as fecha_max
FROM screen_data;

-- Si hay datos pero muy antiguos, llama la función con rango amplio
SELECT * FROM get_dashboard_stats(
  '2020-01-01'::DATE,
  '2030-12-31'::DATE
);
```

---

## 🔍 Verificación Final

Después de aplicar todo, ejecuta:

```sql
-- 1. Verificar funciones
SELECT 
  proname as nombre_funcion,
  pronargs as num_parametros
FROM pg_proc 
WHERE proname IN ('get_dashboard_stats', 'upsert_task', 'archive_completed_tasks')
ORDER BY proname;

-- 2. Verificar vistas
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name IN ('detailed_tasks', 'user_workload', 'vehicle_utilization');

-- 3. Probar dashboard
SELECT * FROM get_dashboard_stats();
```

Deberías ver:
- ✅ 3 funciones
- ✅ 3+ vistas
- ✅ Estadísticas del dashboard (pueden ser 0 si no hay datos)

---

## 📞 Siguiente Paso

Una vez aplicadas las migraciones, **recarga la aplicación** (`Ctrl + F5`) y el dashboard debería mostrar datos correctamente.

Si siguen apareciendo 0s, es porque no hay datos en el sistema. Ve a las secciones de admin y añade:
- Usuarios
- Vehículos
- Tareas/Instalaciones