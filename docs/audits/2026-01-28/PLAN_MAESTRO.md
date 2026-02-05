# PLAN_MAESTRO

Fecha: 2026-01-28

## FASE 1: REFACTORIZACIÓN Y LIMPIEZA (Semana 1-2)

### □ Tarea 1.1: Unificar notificaciones y eliminar `alert()`
- Archivos afectados: 
  - `src/features/commercial/components/OrderDetailModal.tsx`
  - `src/features/logistics/components/ShippingModule.tsx`
  - `src/components/almacen/MaterialDialog.tsx`
  - `src/utils/print.ts`
- Cambios a realizar: crear helper `notify()` y reemplazar `alert()`.
- Script de automatización: `SCRIPTS_AUTOMATIZACION/scan-todos.ps1` (para localizar mensajes pendientes) y búsqueda `rg -n "alert\("`.

```tsx
// ANTES (src/features/commercial/components/OrderDetailModal.tsx:190)
alert("Guarda el pedido primero antes de subir documentos.");

// DESPUÉS (src/lib/notifications.ts)
import { toast } from "sonner";

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast(message),
  info: (message: string) => toast(message),
};

// DESPUÉS (uso)
import { notify } from "@/lib/notifications";
notify.warning("Guarda el pedido primero antes de subir documentos.");

// JUSTIFICACIÓN
// - Evita bloqueo del hilo principal
// - Unifica UX con toasts
```

### □ Tarea 1.2: Reducir `any` y tipar consultas críticas
- Archivos afectados:
  - `src/features/commercial/services/orderService.ts`
  - `src/hooks/use-work-orders.ts`
- Cambios a realizar: introducir tipos de payloads y responses.

```ts
// ANTES (src/features/commercial/services/orderService.ts)
const { data, error } = await (supabase as any)
  .from('comercial_orders')
  .insert([orderData] as any[])
  .select('*')
  .single();

// DESPUÉS
const { data, error } = await supabase
  .from('comercial_orders')
  .insert([orderData])
  .select('*')
  .single();

// JUSTIFICACIÓN
// - Elimina castings inseguros
// - Mejora autocompletado y evita errores runtime
```

## FASE 2: UNIFICACIÓN VISUAL (Semana 3-4)

### □ Tarea 2.1: Reemplazar colores hardcodeados por tokens
- Archivos afectados:
  - `src/components/almacen/MaterialDialog.tsx`
  - `src/components/incidents/IncidentReportModal.tsx`
  - `src/pages/Display.tsx`
- Cambios a realizar: sustituir hex por tokens `bg-card`, `border-border`, `text-muted-foreground`.
- Script de automatización: `SCRIPTS_AUTOMATIZACION/scan-hex-colors.ps1`.

```tsx
// ANTES
<div className="bg-[#1A1D1F] border border-[#45474A] text-white">

// DESPUÉS
<div className="bg-card border border-border text-foreground">

// JUSTIFICACIÓN
// - Unifica temas
// - Reduce inconsistencias visuales
```

### □ Tarea 2.2: Consolidar radius y estados de inputs
- Archivos afectados:
  - `src/components/ui/button.tsx`
  - `src/components/ui/input.tsx`
- Cambios a realizar: estandarizar `rounded-xl` y usar variables de `--radius`.

```tsx
// ANTES (src/components/ui/button.tsx)
"inline-flex items-center justify-center rounded-xl text-sm font-semibold ..."

// DESPUÉS
"inline-flex items-center justify-center rounded-[var(--radius)] text-sm font-semibold ..."

// JUSTIFICACIÓN
// - Control global del estilo
// - Facilita cambios de diseño
```

## FASE 3: COMPLETAR FUNCIONALIDADES (Semana 5-8)

### □ Tarea 3.1: Habilitar módulo de comunicaciones
- Archivos a modificar:
  - `src/config/navigation.ts`
  - `src/pages/CommunicationsPage.tsx`
- Endpoints necesarios: `communication_logs`, `send-whatsapp-notification`.

```ts
// ANTES (navigation.ts)
// { type: "item", path: "/admin/communications", label: "Comunicaciones", icon: MessageCircle },

// DESPUÉS
{ type: "item", path: "/admin/communications", label: "Comunicaciones", icon: MessageCircle },

// JUSTIFICACIÓN
// - Habilita UI de comunicaciones ya existente
```

### □ Tarea 3.2: Implementar System Log real
- Archivos a crear/modificar:
  - `src/hooks/use-system-logs.ts` (nuevo)
  - `src/pages/SystemLogPage.tsx` (con datos)
- Tests: pruebas manuales + query paginada.

```tsx
// ANTES (SystemLogPage.tsx)
<p className="mt-3 text-sm text-muted-foreground">
  Este modulo mostrara trazas, cambios criticos y alertas del sistema.
</p>

// DESPUÉS (src/hooks/use-system-logs.ts)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSystemLogs = () =>
  useQuery({
    queryKey: ["system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

// DESPUÉS (src/pages/SystemLogPage.tsx)
const { data, isLoading } = useSystemLogs();
return (
  <PageShell title="Log total del sistema" description="Revision centralizada de eventos y auditorias.">
    {isLoading ? (
      <div className="text-sm text-muted-foreground">Cargando...</div>
    ) : (
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        {data.map((row) => (
          <div key={row.id} className="border-b border-border/40 py-2 text-sm">
            <div className="font-semibold">{row.event_type}</div>
            <div className="text-muted-foreground">{row.message}</div>
          </div>
        ))}
      </div>
    )}
  </PageShell>
);

// JUSTIFICACIÓN
// - Convierte placeholder en módulo funcional
```

## FASE 4: OPTIMIZACIÓN Y TESTING (Semana 9-10)

### □ Tarea 4.1: Crear suite de tests básicos
- Archivos a crear:
  - `vitest.config.ts`
  - `src/__tests__/auth.test.tsx`
- Comando: `npm run test`.

```ts
// ANTES
// (no existe infraestructura de tests)

// DESPUÉS
import { render, screen } from "@testing-library/react";
import AuthPage from "@/pages/Auth";
import { describe, it, expect } from "vitest";

describe("AuthPage", () => {
  it("muestra el título de login", () => {
    render(<AuthPage />);
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
  });
});

// JUSTIFICACIÓN
// - Aporta cobertura mínima
```

### □ Tarea 4.2: Optimizar queries y caching
- Archivos a modificar:
  - `src/hooks/use-dashboard-data.ts`
  - `src/hooks/use-orders.ts`
- Cambios a realizar: habilitar `staleTime` y `select` para reducir renders.

```ts
// ANTES
useQuery({ queryKey: ['orders'], queryFn });

// DESPUÉS
useQuery({
  queryKey: ['orders'],
  queryFn,
  staleTime: 60_000,
  select: (data) => data ?? [],
});

// JUSTIFICACIÓN
// - Reduce requests y re-render
```

## Criterios de aceptación
- ✅ RLS versionado en repo.
- ✅ Sin `alert()` en frontend.
- ✅ Sistema visual unificado por tokens.
- ✅ System Log y comunicaciones funcionales.
- ✅ Tests mínimos operativos.

## Scripts y comandos
- `SCRIPTS_AUTOMATIZACION/generate-code-metrics.ps1`
- `SCRIPTS_AUTOMATIZACION/generate-file-summaries.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-hex-colors.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-dangerous-html.ps1`
- `SCRIPTS_AUTOMATIZACION/scan-todos.ps1`
- `npm run validate`
