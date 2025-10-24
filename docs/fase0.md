# Fase 0 – Preparacion y baseline

## Objetivo
- Mapear componentes clave del dashboard Admin, historial y vista de operario para conocer fuentes de datos compartidas.
- Identificar tablas, RPC y hooks que participan en incidencias, ubicaciones y sesiones de trabajo antes de modificar logica.
- Detectar riesgos actuales (renderizados costosos, consultas redundantes) y definir evidencias a recolectar en fases posteriores.

## Alcance revisado
- **Front Admin**: `src/pages/Admin.tsx` concentra tarjetas de Confeccion/Tapiceria/Pendientes, historial archivado y toggles Maps. Usa `useDashboardTasks`, `useDashboardStats`, `useScreens`, `useVehicles`, utilidades `buildMapsSearchUrl`, `normalizeTaskLocation`.
- **Hooks compartidos**:
  - `src/hooks/use-detailed-tasks.ts`: agrega filtros por `screen_group`, calcula sesiones activas (`work_sessions`), controla tarjetas resaltadas y refresca cada 60s.
  - `src/hooks/use-installations.ts`: prepara calendario mensual, aplica filtro `neq('state','terminado')`, y actualiza optimistamente en `screen_data`. Usa realtime channel `public:screen_data`.
  - `src/hooks/use-work-session.ts`: gestiona sesiones (no se abrio pero se incluye para cruzar con RPC).
- **SQL relevante**:
  - `supabase/sql/work_sessions_functions.sql` y `work_sessions_incidents_locations.sql`: definen funciones `start_work_session`, `end_work_session`, `report_incident`, tablas `work_sessions`, `incident_reports`, `location_updates`.
  - `supabase/sql/dashboard_sections.sql`: columnas `dashboard_section`, `dashboard_order` en `screens` (usadas para reorganizar tarjetas).

## Flujo de datos actual (resumen)
- **Tareas detalladas**: se consultan desde `detailed_tasks` (presumible vista con joins a `screen_data`). Estados y filtros se procesan en cliente; el resaltado de incidentes depende de comparar `task.state` con textos en minusculas.
- **Instalaciones**: se consulta `detailed_tasks` para lectura pero se escribe en `screen_data` al mover eventos => se requiere verificar consistencia de IDs y triggers.
- **Sesiones e incidencias**: hooks del dashboard leen `work_sessions` para saber sesiones activas, mientras que funciones SQL gestionan cierres, incidencias y ubicaciones. No hay confirmacion de uso en Admin UI actual (revisar durante Fase 2/5).
- **Maps ON/OFF**: `normalizeTaskLocation` recorre varios campos (`task.data`, `task.site`) antes de construir URL con `buildMapsSearchUrl`. Depende de que `task.data` ya este normalizado.

## Riesgos y oportunidades detectados
- **Normalizacion de ubicaciones**: hay duplicidad de campos (site/client/address). `useInstallations` aplica filtros minimos; conviene centralizar normalizacion en utilidades para reducir errores y llamadas repetidas.
- **Consultas costosas**: `useDashboardTasks` descarga multiples secciones y luego filtra en memoria. Necesario evaluar si Supabase puede devolver solo los estados requeridos para reducir payload/token.
- **Realtime**: canal `public:screen_data` refresca todo el calendario en cada evento; quizas limitar por columnas o mover a `postgres_changes` con `event: 'UPDATE'` especifico.
- **Estados de tareas**: `mapDetailedTaskToTask` fuerza estados a un conjunto limitado. La incorporacion de `INCIDENCIA` requerira revisar este mapper para no degradar highlight.
- **Desincronizacion screen_data vs detailed_tasks**: movimiento de eventos actualiza `screen_data` pero la vista se alimenta de `detailed_tasks`. Confirmar triggers o vista materializada en Fase 1 para evitar inconsistencias.

## Datos a recolectar en fases siguientes
- Export de esquema/relaciones de `detailed_tasks`, `screen_data`, `screens` (via Supabase) para validar campos que alimentan dashboard e instalaciones.
- Metricas de render (React Profiler) cuando se abrira modo expandido o sidebar colapsado.
- Lista de endpoints/rpc invocados por vista Operario (`WorkdayPage.tsx`) y su relacion con funciones `start_work_session`/`end_work_session`.

## Proximos pasos propuestos
1. Validar si existen vistas/materializadas que conecten `screen_data` y `detailed_tasks`; documentarlo en `docs/fase1.md`.
2. Capturar muestra de datos reales (anonimizada) para probar filtros de estado y ubicacion.
3. Definir puntos de medicion (contadores de incidencias, tiempo de refresco) antes de introducir nuevos estados.

