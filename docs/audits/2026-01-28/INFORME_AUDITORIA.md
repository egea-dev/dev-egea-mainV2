# INFORME_AUDITORIA

Fecha: 2026-01-28
Repo: MainControl-Egea

## Resumen ejecutivo
El repositorio contiene una SPA en React (Vite + TypeScript + Tailwind) orientada a operaciones (instalaciones, comercial, producción, logística y almacén) con integración dual de Supabase (MAIN + PRODUCTIVITY), funciones edge (invite-user y WhatsApp) y tooling auxiliar para impresoras Zebra. La base técnica es sólida, pero existen riesgos de mantenibilidad y consistencia UI por la concentración de lógica en componentes muy grandes, el uso extendido de `any`, estilos hardcodeados y notificaciones con `alert()`.

## Métricas del código
Ver métricas completas en `docs/audits/2026-01-28/METRICS.md`.

Resumen (src):
- TSX: 175 archivos, 37,428 líneas
- TS: 62 archivos, 11,728 líneas
- CSS: 4 archivos, 940 líneas

## Patrones de diseño identificados
- **Arquitectura modular por dominio**: `src/features/*` separa Comercial, Producción, Logística, Instalaciones.
- **Hooks como capa de datos**: `src/hooks/*` encapsula consultas a Supabase y lógica de estado.
- **Servicios de dominio**: `src/features/*/services/*.ts` con operaciones de negocio (e.g., `orderService.ts`).
- **UI composable**: `src/components/ui/*` (Radix + shadcn patterns) y `src/components/shared/*`.
- **Integración dual Supabase**: `src/integrations/supabase/client.ts` con clientes MAIN y PRODUCTIVITY.

## Antipatrones y code smells (por severidad)

### CRÍTICO
1. **Riesgo de seguridad por políticas RLS no versionadas**
   - Evidencia: no hay SQL de políticas RLS en repo; solo referencias en docs y uso de `anon_key`.
   - Impacto: si RLS no está activa en Supabase, la app queda expuesta a lecturas/escrituras no autorizadas.
   - Recomendación: exportar políticas desde Supabase y versionarlas en `supabase/migrations`.

### ALTO
1. **Componentes monolíticos con alta complejidad**
   - `src/pages/Admin.tsx` (~1475 líneas)
   - `src/pages/ProductionPage.tsx` (~1421 líneas)
   - `src/pages/ShippingScanPage.tsx` (~1167 líneas)
   - `src/features/commercial/components/OrderDetailModal.tsx` (~1160 líneas)
   - Impacto: alto coste de cambio, bugs frecuentes y dificultad para testear.

2. **Uso extensivo de `any` y castings forzados**
   - Evidencia: múltiples `as any` y `: any` en hooks y páginas (ver `rg -n "\bas any\b|: any\b" src`).
   - Impacto: pérdida de seguridad de tipos y errores en runtime.

### MEDIO
1. **Uso de `alert()` en flujos críticos**
   - Archivos y líneas:
     - `src/features/commercial/components/OrderDetailModal.tsx`: 190, 210, 251, 254, 267, 272, 385
     - `src/features/logistics/components/ShippingModule.tsx`: 102, 159
     - `src/components/almacen/MaterialDialog.tsx`: 67
     - `src/utils/print.ts`: 65, 97
   - Impacto: UX inconsistente y bloqueo del hilo principal.

2. **`dangerouslySetInnerHTML` sin sanitización**
   - `src/components/ui/chart.tsx`: 70
   - `src/features/logistics/components/Roadmap.tsx`: 115
   - `src/features/logistics/components/ShippingLabel.tsx`: 49
   - Impacto: riesgo de XSS si alguna entrada llega a ser dinámica.

3. **Dependencias de entornos sin validación completa**
   - `src/integrations/supabase/client.ts`: `productivityUrl` y `productivityAnonKey` se permiten vacíos (131-132).
   - Impacto: fallos silenciosos y errores de runtime difíciles de diagnosticar.

### BAJO
1. **Colores hardcodeados y estilos inline**
   - Evidencia: 258 matches en `docs/audits/2026-01-28/HEX_COLORS_REPORT.md`.
   - Impacto: inconsistencias visuales y dificultad para tematizar.

2. **Módulos placeholder o en desarrollo**
   - `src/pages/SystemLogPage.tsx`: contenido textual de placeholder (línea 17).
   - `src/config/navigation.ts`: comunicaciones deshabilitadas (línea 65).

## Mejores prácticas (evaluación)

### Convenciones de código
- ✅ Uso consistente de TypeScript en la mayoría del código.
- ⚠️ Nombres heterogéneos por dominio (mezcla ES/EN) y uso extendido de `any`.

### Arquitectura
- ✅ Separación MAIN/PRODUCTIVITY correcta.
- ⚠️ Mezcla de lógica de negocio dentro de componentes de UI grandes.

### Manejo de errores
- ✅ Uso de `toast` en partes del sistema.
- ⚠️ Persisten `alert()` y errores no normalizados entre módulos.

### Seguridad
- ✅ Sesiones y auth dual con Supabase documentadas.
- ⚠️ Políticas RLS no versionadas y `dangerouslySetInnerHTML` sin sanitizar.

### Performance
- ⚠️ Consultas paralelas y join manual en frontend (potencial N+1).
- ⚠️ Vistas grandes con demasiada lógica local (posible re-render y lag).

### Testing
- ⚠️ No hay tests automatizados en repo.
- ✅ Existe plan de testing manual: `docs/TESTING_PLAN.md`.

### Documentación
- ✅ Amplia documentación (docs/architecture, docs/modules, docs/audits).
- ⚠️ Falta documentación de RLS y migraciones DB en repo.

## Recomendaciones prioritarias
1. Exportar y versionar políticas RLS de Supabase.
2. Reducir `any` y crear tipos de dominio compartidos.
3. Refactorizar páginas monolíticas en contenedores + componentes de presentación.
4. Reemplazar `alert()` por sistema de toasts unificado.
5. Centralizar tokens de color y eliminar hardcodes.

## Resumen por archivo
Las síntesis individuales de cada archivo del `src` se generaron automáticamente en:
- `docs/audits/2026-01-28/FILE_SUMMARIES.md`

## Scripts de auditoría generados
- `SCRIPTS_AUTOMATIZACION/generate-code-metrics.ps1`
- `SCRIPTS_AUTOMATIZACION/generate-file-summaries.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-todos.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-dangerous-html.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-hex-colors.ps1`
