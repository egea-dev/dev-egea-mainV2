# GUIA_ESTILOS

Fecha: 2026-01-28

## Principios
- Consistencia: todos los colores deben venir de tokens (CSS variables o Tailwind).
- Escalabilidad: variantes de componentes se construyen sobre un núcleo común.
- Accesibilidad: contraste AA mínimo y tamaños táctiles >= 44px.

## Tokens de diseño (base actual)
Fuente principal: `src/index.css`.

### Colores (HSL tokens)
```css
:root {
  --background: 0 0% 98%;
  --foreground: 222 18% 12%;
  --primary: 346 71% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 98%;
  --muted: 210 16% 96%;
  --muted-foreground: 215 10% 45%;
  --accent: 210 18% 96%;
  --destructive: 0 84% 60%;
  --info: 204 80% 90%;
  --warning: 38 92% 92%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 346 71% 35%;
  --radius: 1rem;
}
```

### Temas
- **.dark**: oscuro estándar.
- **.egea**: burdeos corporativo.
- **.next-blue**: tema azul profundo.

## Tipografía
- Actual: Inter (`@import` en `src/index.css`).
- Recomendación: consolidar tipografías en `font-family` global y evitar mezclas en CSS inline.

## Espaciados
- Base: `p-6`, `space-y-6`, `px-4 py-3` para tablas.
- Recomendación: definir tokens `--space-*` o seguir escala Tailwind (2,4,6,8,12,16,24).

## Componentes base (Design System)

### Button
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg">Guardar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="destructive">Eliminar</Button>
```

### Input
```tsx
import { Input } from "@/components/ui/input";

<label htmlFor="email" className="text-sm font-medium">Email</label>
<Input id="email" type="email" placeholder="correo@empresa.com" />
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Resumen</CardTitle>
  </CardHeader>
  <CardContent>Contenido</CardContent>
</Card>
```

### Modal/Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmación</DialogTitle>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

## Guía de consistencia UI/UX

### Inconsistencias detectadas
- Border radius variado (`rounded-xl` vs `rounded-lg`).
- Colores hardcodeados y estilos inline.
- Uso de `alert()` en flujos críticos.

### Acciones recomendadas
1. Unificar radius en `--radius` y usar `rounded-[var(--radius)]` o `rounded-xl` global.
2. Reemplazar hex en JSX por tokens Tailwind (`text-primary`, `bg-muted`, etc.).
3. Sustituir `alert()` por `toast` (`sonner`) en todos los módulos.

## Ejemplos de migración de estilos (antes/después)

```tsx
// ANTES
<div className="bg-[#1A1D1F] border border-[#45474A] text-white">...</div>

// DESPUÉS
<div className="bg-card border border-border text-foreground">...</div>

// JUSTIFICACIÓN
// - Unifica el tema
// - Facilita dark/light
```

## Inventario de componentes visuales clave
- Botones: `src/components/ui/button.tsx`
- Inputs: `src/components/ui/input.tsx`
- Tablas: `src/components/ui/table.tsx`
- Modales: `src/components/ui/dialog.tsx`
- Toasts: `src/components/ui/toaster.tsx`, `src/components/ui/sonner.tsx`

## Referencias
- `docs/audits/2026-01-28/HEX_COLORS_REPORT.md`
- `src/index.css`
