# Backlog de migraciones pendientes

Inventario de scripts SQL fuera de `supabase/migrations/` que deben trasladarse a migraciones idempotentes. Agrupados por temática para facilitar su empaquetado.

## 1. RLS y seguridad
- ~~`APLICAR_FIX_RLS_AHORA.sql`~~ (reemplazado por las migraciones oficiales `20251006010001_rls_policies.sql` + `20251105125000_fix_profiles_rls_after_decoupling.sql`)
- `fix_rls_final.sql`
- ~~`FIX_RLS_RECURSION_PROFILES.sql`~~ (cubierto por `supabase/migrations/20251006200000_fix_rls_recursion_profiles.sql`)
- `FIX_RLS_SIN_RECURSION_ALTERNATIVO.sql`
- `fix_rls_406.sql`
- `HABILITAR_RLS_CORREGIDO.sql`
- `HABILITAR_RLS_FINAL_SIN_ERRORES.sql`
- `HABILITAR_RLS_Y_DATOS_PRUEBA.sql`
- `enable_rls_correct.sql`
- `disable_rls_temp.sql`
- `SOLUCION_RAPIDA_DESHABILITAR_RLS_COMPLETO.sql`
- `SOLUCION_TEMPORAL_DESHABILITAR_RLS.sql`
- `diagnose_rls.sql`
- `VERIFICAR_RLS.sql`

**Acción**: Consolidar en un set mínimo de migraciones que creen/actualicen funciones helper (`is_admin`, `has_permission`), habiliten RLS y definan políticas finales. Guardar scripts de diagnóstico como documentación, no como migraciones.

## 2. Configuración base y estructuras
- `COMPLETE_DATABASE_SETUP.sql`
- `APLICAR_MIGRACION_COMPLETA.sql`
- `CREAR_TABLA_SYSTEM_CONFIG.sql`
- `fix_database.sql`
- `VERIFICAR_ESTRUCTURA.sql`
- `VERIFICAR_ESTRUCTURA_TABLAS.sql`
- `VERIFICAR_DATOS.sql`
- `VERIFICAR_DATOS_DASHBOARD.sql`
- `VERIFICAR_Y_CREAR_PERFIL.sql`
- `VERIFICAR_Y_ACTUALIZAR_STATUS_USUARIOS.sql`
- `ACTUALIZAR_STATUS_PASO_A_PASO.sql`
- `ACTUALIZAR_STATUS_USUARIOS.sql`
- `FIX_SYSTEM_CONFIG_AND_AVATARS.sql`
- `FIX_STATUS_SIMPLE.sql`
- `FIX_ARCHIVED_TASKS_TABLE.sql`
- `FIX_ARCHIVED_TASKS_COLUMN.sql`
- `APLICAR_EN_SUPABASE_ARCHIVED_TASKS.sql`
- `ELIMINAR_DATOS_EJEMPLO.sql`
- `ELIMINAR_TODA_DATA_FAKE.sql`
- `LIMPIAR_DATOS_FAKE.sql`

**Acción**: Revisar qué estructuras ya existen en migraciones oficiales y extraer únicamente las diferencias (nuevas tablas, columnas, constraints). Crear migraciones incrementalmente (p.ej. `2025xxxx_add_system_config_defaults.sql`). Los scripts de verificación quedan como documentación.

## 3. Datos de ejemplo y cargas masivas
- `DATOS_EJEMPLO_CONFECCION_TAPICERIA.sql`
- `SOLUCION_AUTOMATICA_FINAL.sql`
- `FIX_COMPLETO_FINAL.sql`
- `DEBUG_COMPLETO.sql`
- `EJECUTA_ESTO_AHORA.sql`
- `TEST_DASHBOARD_QUERY.sql`

**Acción**: Decidir si realmente se requieren datos de ejemplo en entornos productivos. De ser así, migrarlos a seeds controlados (`supabase/seed.sql` o migraciones específicas con `INSERT ... ON CONFLICT`). Scripts de debug deben ir a `/docs`.

## 4. Funciones y utilidades específicas
- `APLICAR_POLITICAS_STORAGE.sql`
- `SOLUCIONAR_DASHBOARD_CEROS.sql`
- `add_rings_to_badges.sh`, `update_badges_style.sh`, `update_to_subtle_style.sh` (shell scripts relacionados al front, documentar aparte).
- ~~`supabase/sql/direct_messages_optimizations.sql`~~ → migrado en `supabase/migrations/20251105124000_direct_messages_optimizations.sql`
- ~~`supabase/sql/dashboard_sections.sql`~~ → migrado en `supabase/migrations/20251105130000_add_dashboard_sections_to_screens.sql`
- ~~`supabase/sql/work_sessions_functions.sql`~~ → migrado en `supabase/migrations/20251105123000_add_work_session_functions.sql`
- `supabase/sql/work_sessions_incidents_locations.sql`
- `supabase/sql/update_upsert_vehicle.sql`
- `supabase/sql/diagnostics_fase1.sql`

**Acción**: Cada función RPC o vista debe trasladarse a una migración con versiones claras. Ejemplos:
- `2025xxxx_work_sessions_rpc.sql` → mover `start_work_session`, `end_work_session`, `report_incident`, `send_location_update`.
- `2025xxxx_dashboard_sections.sql` → crear/actualizar vistas usadas por el dashboard.
- `2025xxxx_direct_messages_indexes.sql` → optimizaciones aplicadas.

Scripts diagnósticos deben convertirse en documentación técnica (`docs/diagnostics/`).

## 5. Scripts duplicados en raíz con timestamp
Algunos archivos en `supabase/` ya tienen nombre de timestamp (~~`20251004100000_fix_profile_rls_after_decoupling.sql`~~ → migrado como `supabase/migrations/20251105125000_fix_profiles_rls_after_decoupling.sql`, ~~`20251005_fix_archived_tasks_insert_policy.sql`~~ → migrado como `supabase/migrations/20251105125500_fix_archived_tasks_insert_policy.sql`). También se eliminó la tabla legacy `user_messages` en `supabase/migrations/20251105131500_migrate_user_messages_to_direct.sql`. Verificar si el resto de archivos con timestamp está replicado dentro de `supabase/migrations/`. Si no lo está, moverlos respetando su fecha original o crear nuevas migraciones con un resumen del cambio.

---

### Propuesta de flujo para regularizar
1. **Catalogar dependencias**: Para cada script identificar tablas/funciones afectadas y si ya existen en migraciones oficiales.
2. **Crear migraciones por dominio**: RLS, funciones RPC, datos base, vistas, etc. Evitar mezclar muchas responsabilidades en una sola.
3. **Probar con `supabase db reset`**: Asegurar que desde cero la base queda idéntica a producción.
4. **Eliminar scripts sueltos**: Una vez migrados y probados, borrar archivos legacy o moverlos a `docs/legacy-sql/`.

Este archivo se irá actualizando conforme cada bloque se convierta en migraciones reales.
