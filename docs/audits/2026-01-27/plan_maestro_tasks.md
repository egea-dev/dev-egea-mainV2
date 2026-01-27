# Plan Maestro por Tasks – Auditoria 2026-01-27

## Reglas generales
- Sin Chain-of-Thought. Solo decisiones y resultados.
- Sin `--force-with-lease` salvo peticion explicita.

---

## Fase 0 — Preparacion

### TASK-00.1 — Inventario y alcance
**Objetivo:** Confirmar alcance y prioridades.  
**Entrada:** `docs/audits/2026-01-27/*.md`  
**Salida:** Scope final + prioridades P0/P1/P2  
**Criterio de aceptacion:** Documento de alcance validado.

---

## Fase 1 — Seguridad (P0)

### TASK-01.1 — Actualizar `react-router-dom`
**Objetivo:** Eliminar riesgo XSS (alto).  
**Entrada:** `package.json`  
**Accion:** actualizar a version segura.  
**Salida:** Dependencia actualizada + changelog breve.  
**Criterio de aceptacion:** version >= segura y build sin errores.

### TASK-01.2 — Evaluar `xlsx`
**Objetivo:** Mitigar ReDoS/RCE.  
**Accion:** actualizar o migrar a `exceljs`.  
**Salida:** decision (upgrade/migracion) + PR/patch.  
**Criterio:** sin CVEs criticas activas.

### TASK-01.3 — Versionar politicas RLS
**Objetivo:** Control de seguridad en repo.  
**Accion:** exportar y guardar en `supabase/migrations`.  
**Salida:** SQL de policies en repo.  
**Criterio:** politicas presentes y revisables.

### TASK-01.4 — Revisar `dangerouslySetInnerHTML`
**Objetivo:** minimizar riesgos de XSS.  
**Entrada:** `ShippingLabel.tsx`, `Roadmap.tsx`, `chart.tsx`.  
**Accion:** sanitizar o justificar uso.  
**Salida:** sanitizacion o nota de excepcion.  
**Criterio:** entradas controladas o sanitizadas.

---

## Fase 2 — UI/UX + WCAG (P1)

### TASK-02.1 — Labels e Inputs
**Objetivo:** accesibilidad (WCAG).  
**Entrada:** `OrderDetailModal.tsx`  
**Accion:** añadir `id` y `htmlFor`.  
**Salida:** formulario accesible.  
**Criterio:** lector de pantalla identifica campos.

### TASK-02.2 — `aria-label` en botones sin texto
**Objetivo:** accesibilidad UI.  
**Accion:** añadir labels descriptivos.  
**Salida:** botones accesibles.  
**Criterio:** navegacion por teclado OK.

### TASK-02.3 — Unificar border radius
**Objetivo:** consistencia visual.  
**Accion:** normalizar `rounded-*` entre inputs y botones.  
**Salida:** estilos consistentes.  
**Criterio:** verificacion visual.

### TASK-02.4 — Reemplazar `alert()` por `sonner`
**Objetivo:** UX fluida.  
**Entrada:** `OrderDetailModal.tsx`  
**Salida:** toasts no bloqueantes.  
**Criterio:** sin `alert()` nativo.

---

## Fase 3 — Consistencia y Mantenimiento (P2)

### TASK-03.1 — Consolidar colores hardcoded
**Objetivo:** tokens coherentes.  
**Accion:** migrar hex a variables/Tailwind.  
**Salida:** palette definida.  
**Criterio:** sin hex criticos en componentes.

### TASK-03.2 — Documentar arquitectura
**Objetivo:** mantenimiento futuro.  
**Accion:** resumen de capas y dependencias.  
**Salida:** doc breve (grafo).  
**Criterio:** claro y actualizado.

---

## Fase 4 — Meta-Prompting (sub-agentes)

### TASK-04.1 — Prompts para seguridad
**Salida:** prompt para SAST + hardening.

### TASK-04.2 — Prompts para UI/UX
**Salida:** prompt para auditoria WCAG + consistencia.

### TASK-04.3 — Prompts para arquitectura
**Salida:** prompt para eliminar ciclos y ordenar capas.

---

## Validacion final (Checklist)
- [ ] Sin CVEs criticas activas.
- [ ] WCAG AA minimo en formularios clave.
- [ ] UI consistente (border radius, tokens).
- [ ] Politicas RLS versionadas.
- [ ] Prompts listos para sub-agentes.
