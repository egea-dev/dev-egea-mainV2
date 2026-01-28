# PLAN MAESTRO – AUDITORÍA INTEGRAL
**Proyecto:** Revisión de arquitectura, UI/UX, seguridad y preparación de sub-agentes  
**Fecha:** 2026-01-27  
**Autor:** Codex (resumen ejecutivo sin Chain-of-Thought)

---

## 0) Advertencias y reglas
- No se incluye Chain-of-Thought. Solo resúmenes claros y decisiones.
- No se usarán comandos `--force-with-lease` salvo solicitud explícita.

---

## 1) Análisis de lógica (Grafo de dependencias)

### Objetivo
Hacer el grafo de dependencias más lógico eliminando ciclos y clarificando capas.

### Entregables
- Mapa del grafo con módulos y dependencias.
- Lista de ciclos (A → B → C → A).
- Plan de refactor priorizado.

### Criterios de aceptación
- Identificación de ciclos reales.
- Propuesta de refactor por capas.
- Riesgos y mitigaciones claras.

---

## 2) Auditoría UI/UX (Tailwind + WCAG)

### Objetivo
Garantizar consistencia visual y accesibilidad.

### Entregables
- Lista de inconsistencias (tipografía, spacing, color).
- Quick wins (cambios rápidos).
- Recomendaciones WCAG (AA mínimo).

### Criterios de aceptación
- Contraste AA validado.
- Navegación por teclado revisada.
- Labels/ARIA correctos en inputs críticos.

---

## 3) Seguridad (SAST + Hardening)

### Objetivo
Detectar vulnerabilidades y proponer endurecimiento inmediato.

### Entregables
- Hallazgos por severidad (Crítico/Alto/Medio/Bajo).
- Plan de hardening inmediato.
- Priorización P0/P1/P2.

### Criterios de aceptación
- Al menos 5 hallazgos revisados.
- Mitigación concreta por hallazgo.
- Riesgos residuales documentados.

---

## 4) Meta-Prompting (Prompts perfectos)

### Objetivo
Generar prompts para sub-agentes por cada mejora clave.

### Entregables
- Prompts listos para delegar tareas.

---

# PROMPTS PERFECTOS (listos para sub-agentes)

## Prompt A – Eliminar ciclos de dependencias
```markdown
Eres un sub-agente experto en arquitectura de monorepos.
Tarea: detectar y eliminar ciclos de dependencias en el grafo.
Contexto: módulos principales del repo (apps/, packages/, libs/).
Restricciones: no romper APIs públicas; cambios mínimos.
Output esperado: lista de ciclos + plan de refactor + propuesta de patch.
Criterios de aceptación:
- Ciclos identificados con rutas concretas.
- Propuesta de extracción o inversión de dependencias.
- Riesgos de regresión descritos.
```

---

## Prompt B – Auditoría UI/UX Tailwind + WCAG
```markdown
Eres un sub-agente experto en UI/UX y accesibilidad.
Tarea: auditar consistencia de UI y WCAG.
Contexto: componentes base y páginas principales.
Restricciones: mantener diseño actual; cambios incrementales.
Output esperado: lista de inconsistencias + fixes rápidos.
Criterios de aceptación:
- Contraste AA validado.
- Navegación por teclado comprobada.
- Labels/ARIA correctos en inputs críticos.
```

---

## Prompt C – SAST + Hardening inmediato
```markdown
Eres un sub-agente experto en seguridad de aplicaciones.
Tarea: realizar SAST y proponer hardening inmediato.
Contexto: backend, frontend y API routes.
Restricciones: no agregar dependencias nuevas sin justificar.
Output esperado: hallazgos por severidad + plan de mitigación.
Criterios de aceptación:
- Al menos 5 hallazgos potenciales revisados.
- Riesgo y mitigación documentados.
- Prioridades claras (P0, P1, P2).
```

---

## Prompt D – Consolidar patrones duplicados UI
```markdown
Eres un sub-agente experto en frontend.
Tarea: detectar patrones UI duplicados y consolidarlos.
Contexto: componentes y estilos repetidos.
Restricciones: no cambiar comportamiento visible.
Output esperado: lista de duplicados + propuesta de componente único.
Criterios de aceptación:
- Reducción de duplicación.
- No regresiones visuales.
```

---

# RESULTADO FINAL ESPERADO

| Área | Entregable | Estado |
|------|-----------|--------|
| Grafo de dependencias | Mapa limpio sin ciclos | ⏳ Pendiente |
| UI/UX | Informe de consistencia + WCAG AA | ⏳ Pendiente |
| Seguridad | Informe SAST + hardening | ⏳ Pendiente |
| Meta-Prompting | 4 prompts listos | ✅ Completado |
