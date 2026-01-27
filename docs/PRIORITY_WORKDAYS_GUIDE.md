# Guía de Lógica de Prioridades y Días Laborables - Egea MainControl

## Resumen Ejecutivo

Este documento describe la lógica de priorización y cálculo de días laborables implementada en el proyecto. **DEBE aplicarse de forma consistente en todas las secciones**: calendarios, producción, envíos, expediciones y **kioscos**.

---

## 1. Archivos Clave

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| **priority-service.ts** | `src/services/priority-service.ts` | Funciones de priorización, scoring, badges de urgencia |
| **workday-utils.ts** | `src/utils/workday-utils.ts` | Cálculo de días laborables (L-V), SLA por región |

---

## 2. Días Laborables (CRÍTICO)

### Concepto
- **Solo Lunes a Viernes cuentan como días laborables**
- Sábados y Domingos se excluyen de todos los cálculos

### Funciones Principales

```typescript
import { getWorkdaysRemaining, isWorkday } from '@/utils/workday-utils';

// Calcula días LABORABLES hasta fecha de vencimiento
const diasRestantes = getWorkdaysRemaining(order.due_date);
// Retorna: número (puede ser negativo si venció)

// Verifica si una fecha es día laborable
const esLaborable = isWorkday(new Date()); // true = L-V, false = S-D
```

---

## 3. SLA por Región

### Configuración de Tiempos (días LABORABLES)

| Región | Total | Recepción | Producción | Envío |
|--------|-------|-----------|------------|-------|
| **Baleares** | 7 | 2 | 4 | 1 |
| **Península** | 10 | 2 | 5 | 3 |
| **Canarias** | 20 | 2 | 7 | 11 |

### Uso

```typescript
import { getDeliveryBreakdown, getSLAWorkdays } from '@/utils/workday-utils';

// Obtener SLA completo
const sla = getDeliveryBreakdown(order.region);
// sla = { totalDays: 10, receptionDays: 2, productionDays: 5, shippingDays: 3 }

// Solo días totales
const dias = getSLAWorkdays(order.region); // 10 para Península
```

---

## 4. Priorización Dinámica

### Jerarquía de Prioridad (Orden Estricto)

1. **P1: Canarias + Lunes-Miércoles** → +10,000 puntos
2. **P2: Agrupación por Material** → +5,000 puntos
3. **P3: Urgencia por Fecha** → Hasta +2,000 puntos

### Detección de Canarias

```typescript
import { isCanarias, isMondayToWednesday } from '@/services/priority-service';

// ¿Es Canarias?
const esCanarias = isCanarias(order.delivery_region || order.region);
// Detecta: CANARIAS, TENERIFE, GRAN CANARIA, LANZAROTE, etc.

// ¿HOY es Lunes, Martes o Miércoles?
const esVentanaEnvio = isMondayToWednesday();

// Prioridad especial: Canarias + Ventana de Envío
const tienePrioridadCanarias = esCanarias && esVentanaEnvio;
```

### Ordenar Pedidos por Prioridad

```typescript
import { sortWorkOrdersByPriority } from '@/services/priority-service';

// Ordena automáticamente por score descendente
const ordenados = sortWorkOrdersByPriority(pedidos);

// Cada pedido tiene metadatos adicionales:
// - _priority_score: número
// - _is_canarias_urgent: boolean
// - _is_grouped_material: boolean
// - _priority_level: 'critical' | 'warning' | 'material' | 'normal'
```

---

## 5. Badges de Urgencia (DINÁMICOS)

### Función Principal

```typescript
import { getUrgencyBadge } from '@/services/priority-service';
import { getWorkdaysRemaining } from '@/utils/workday-utils';

const diasRestantes = getWorkdaysRemaining(order.due_date);
const badge = getUrgencyBadge(diasRestantes, order.region);

// badge = { label: 'URGENTE', color: 'bg-amber-900/40 text-amber-400...' }
```

### Umbrales Dinámicos

El umbral de urgencia se calcula como: `shippingDays + 1`

| Región | shippingDays | Umbral Urgente |
|--------|--------------|----------------|
| Baleares | 1 | ≤ 2 días |
| Península | 3 | ≤ 4 días |
| Canarias | 11 | ≤ 12 días |

### Estados del Badge

| Estado | Condición | Color |
|--------|-----------|-------|
| **VENCIDO** | días < 0 | Rojo |
| **URGENTE** | días ≤ umbral | Ámbar |
| **A TIEMPO** | días > umbral | Verde |

---

## 6. Implementación Visual (Canarias + L-M-X)

### Estilo para Prioridad Canarias

Cuando `isCanarias(region) && isMondayToWednesday()` es true, aplicar:

```css
border-orange-500/80
shadow-[0_0_8px_rgba(249,115,22,0.3)]
```

O con Tailwind:
```tsx
className={cn(
    "...",
    hasPriority && "ring-1 ring-orange-500/50 shadow-[0_0_5px_rgba(249,115,22,0.3)]"
)}
```

---

## 7. Progreso de Bultos

### Cálculo

```typescript
const hasPackages = order.packages_count > 0;
const progress = hasPackages 
    ? Math.round((order.scanned_packages || 0) / order.packages_count * 100) 
    : 0;
```

### Visualización (Barra de Progreso)

```tsx
{hasPackages && (
    <div
        className="absolute inset-y-0 left-0 bg-emerald-500/10 transition-all duration-500"
        style={{ width: `${progress}%` }}
    />
)}
```

---

## 8. Campos Importantes del Pedido

| Campo | Uso | Prioridad |
|-------|-----|-----------|
| `due_date` | Fecha de vencimiento | CRÍTICO |
| `region` | Región original | Normal |
| `delivery_region` | Región de entrega (preferente) | **Usar primero** |
| `packages_count` | Total bultos esperados | Visual |
| `scanned_packages` | Bultos escaneados | Visual |

### Patrón de Uso para Región

```typescript
const regionActual = order.delivery_region || order.region;
```

---

## 9. Checklist de Implementación

### Para cualquier nuevo componente:

- [ ] Importar `getWorkdaysRemaining` de `workday-utils`
- [ ] Importar `getUrgencyBadge`, `isCanarias`, `isMondayToWednesday` de `priority-service`
- [ ] Usar `delivery_region || region` para obtener la región correcta
- [ ] Calcular `daysRemaining` con `getWorkdaysRemaining(order.due_date)`
- [ ] Obtener badge con `getUrgencyBadge(daysRemaining, region)`
- [ ] Aplicar estilo naranja para `isCanarias(region) && isMondayToWednesday()`
- [ ] Mostrar progreso de bultos si `packages_count > 0`

---

## 10. Componentes Ya Actualizados

✅ `ExpedicionesCalendar.tsx`
✅ `ProductionCalendar.tsx`
✅ `ShippingCalendar.tsx`
✅ `ExpedicionesPage.tsx`
✅ `ProductionPage.tsx`
✅ `ShippingScanPage.tsx`

### Pendientes (Kioscos y otros):

⬜ Kioscos de Producción
⬜ Kioscos de Envíos
⬜ Dashboards
⬜ Otros componentes con listas de pedidos

---

## Ejemplo Completo de Uso

```tsx
import { getWorkdaysRemaining } from '@/utils/workday-utils';
import { getUrgencyBadge, isCanarias, isMondayToWednesday, sortWorkOrdersByPriority } from '@/services/priority-service';

// 1. Ordenar pedidos por prioridad
const orderedItems = sortWorkOrdersByPriority(orders);

// 2. Para cada pedido en el render:
{orderedItems.map(order => {
    const region = order.delivery_region || order.region;
    const daysRemaining = getWorkdaysRemaining(order.due_date);
    const urgency = getUrgencyBadge(daysRemaining, region);
    const isCanariasUrgent = isCanarias(region) && isMondayToWednesday();
    const hasPackages = (order.packages_count || 0) > 0;
    const progress = hasPackages 
        ? Math.round((order.scanned_packages || 0) / order.packages_count * 100) 
        : 0;

    return (
        <div className={cn(
            "order-card",
            isCanariasUrgent && "ring-1 ring-orange-500/50"
        )}>
            <Badge className={urgency?.color}>
                {urgency?.label}
            </Badge>
            {hasPackages && (
                <span>{order.scanned_packages}/{order.packages_count} bultos</span>
            )}
        </div>
    );
})}
```
