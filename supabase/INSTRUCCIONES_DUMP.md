# Instrucciones de Extracción de Esquemas (pg_dump)

Para comenzar la migración, necesitamos el esquema exacto de tus bases de datos actuales. Dado que no tengo tus contraseñas de Supabase, debes ejecutar estos comandos en tu terminal local (PowerShell o CMD).

## 1. Obtener datos de conexión
Ve a tu panel de Supabase para cada proyecto (**MAIN** y **PRODUCTIVITY**):
1. Ve a **Project Settings** -> **Database**.
2. Busca la sección **Connection string** y selecciona **URI**.
3. Verás algo como: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxx.supabase.co:5432/postgres`

## 2. Comandos de exportación

Ejecuta estos dos comandos reemplazando `[PASSWORD_MAIN]` y `[PASSWORD_PROD]` con las contraseñas reales de tus proyectos:

### Para MAIN:
```bash
pg_dump "postgresql://postgres:[Kamaleon258$]@db.jyaudpctcqcuskzwmism.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f supabase/schema_main_extracted.sql
```

### Para PRODUCTIVITY:
```bash
pg_dump "postgresql://postgres:[Kamaleon258$]@db.zslcblcetrhbsdirkvza.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f supabase/schema_productivity_extracted.sql
```

## 3. ¿Qué hacer si no tienes pg_dump instalado?
Si no tienes las herramientas de PostgreSQL instaladas en tu Windows, la forma más rápida es a través del explorador de base de datos que uses (DBeaver, TablePlus, etc.):
1. Conéctate a la base de datos.
2. Haz clic derecho en la base de datos/esquema.
3. Elige **"Generate SQL"** o **"Dump database"**.
4. Guarda el archivo como `supabase/schema_main_extracted.sql` (y lo mismo para prod).

---

Una vez tengas estos dos archivos generados, dímelo y yo me encargaré de:
1. **Consolidarlos** en un único `merged_schema.sql`.
2. **Eliminar** las dependencias específicas de Supabase (como extensiones innecesarias o esquemas como `auth` o `storage` si vamos a usar soluciones propias).
3. **Preparar** el script para que puedas lanzarlo en tu nuevo PostgreSQL.
