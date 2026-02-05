# FUNCIONALIDADES_PENDIENTES

Fecha: 2026-01-28

## 1) Módulo de comunicaciones (UI + navegación)
- **Estado actual**: Existe UI y hooks de comunicación (`src/components/communications/*`, `src/hooks/use-communications.ts`), pero el acceso desde navegación está deshabilitado.
- **Evidencia**: `src/config/navigation.ts` línea 65 (comentado: “Comunicaciones”).
- **Razón de incompletitud**: Deshabilitado por desarrollo parcial.
- **Dependencias**: Tablas `communication_logs`, funciones `send-whatsapp-notification`, permisos de rol.
- **Impacto**: Bloquea la gestión centralizada de comunicaciones internas.
- **Especificación técnica**:
  - Rehabilitar ruta en navegación y añadir guardas de permisos.
  - Validar RLS y permisos para tablas de comunicación.
  - UI principal debe listar logs y permitir envíos.
- **Complejidad**: Media.
- **Prioridad**: Alta.

## 2) System Log (auditoría central)
- **Estado actual**: Página placeholder sin lógica real.
- **Evidencia**: `src/pages/SystemLogPage.tsx` líneas 4-20.
- **Razón de incompletitud**: Falta implementación de origen de datos.
- **Dependencias**: Tabla o vista de auditoría (no existe en repo), RLS y permisos.
- **Impacto**: Falta trazabilidad global y auditoría operacional.
- **Especificación técnica**:
  - Crear tabla `system_logs` o vista materializada.
  - API/hook `use-system-logs` con paginación.
  - UI con filtros por severidad, módulo y fecha.
- **Complejidad**: Media.
- **Prioridad**: Media.

## 3) Reactivar bloque temporal en OrderDetailModal
- **Estado actual**: Bloque de código comentado.
- **Evidencia**: `src/features/commercial/components/OrderDetailModal.tsx` línea 127.
- **Razón de incompletitud**: TODO pendiente.
- **Dependencias**: Lógica comercial y flujo de validación.
- **Impacto**: Funcionalidad parcial en detalle de pedido.
- **Especificación técnica**:
  - Identificar bloque comentado y validación asociada.
  - Restaurar con tests manuales del flujo comercial.
- **Complejidad**: Baja.
- **Prioridad**: Media.

## 4) Versionado de políticas RLS
- **Estado actual**: No hay migraciones SQL versionadas.
- **Razón de incompletitud**: Políticas están solo en Supabase Dashboard.
- **Dependencias**: Exportación desde Supabase.
- **Impacto**: Seguridad sin control de versiones.
- **Especificación técnica**:
  - Exportar políticas a `supabase/migrations`.
  - Añadir scripts de verificación en CI.
- **Complejidad**: Media.
- **Prioridad**: Crítica.

## 5) Test automation (unit + integration)
- **Estado actual**: Solo plan de testing manual en docs.
- **Razón de incompletitud**: Falta stack de tests (vitest/playwright).
- **Dependencias**: Configurar tooling.
- **Impacto**: Riesgo alto de regresiones.
- **Especificación técnica**:
  - Añadir Vitest + Testing Library.
  - Añadir Playwright para flujos críticos.
- **Complejidad**: Alta.
- **Prioridad**: Alta.

## 6) Unificación de notificaciones
- **Estado actual**: Uso mixto de `alert()` y `toast`.
- **Evidencia**: `alert()` en múltiples archivos (ver informe auditoría).
- **Impacto**: UX inconsistente.
- **Especificación técnica**:
  - Sustituir alert por `sonner`.
  - Crear helper `notify()` en `src/lib/notifications.ts`.
- **Complejidad**: Baja.
- **Prioridad**: Media.
