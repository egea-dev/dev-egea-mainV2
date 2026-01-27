# PLAN MAESTRO – AUDITORIA INTEGRAL
**Proyecto:** Revision de arquitectura, UI/UX, seguridad y preparacion de sub-agentes  
**Fecha:** 2026-01-27  
**Autor:** Codex (resumen ejecutivo sin Chain-of-Thought)

## 0) Advertencias y reglas
- No se incluye Chain-of-Thought. Solo resumenes claros y decisiones.
- No se usaran comandos `--force-with-lease` salvo solicitud explicita.

## 1) Analisis de logica (Grafo de dependencias)

### Objetivo
Hacer el grafo de dependencias mas logico eliminando ciclos y clarificando capas.

### Entregables
- Mapa del grafo con modulos y dependencias.
- Lista de ciclos (A → B → C → A).
- Plan de refactor priorizado.

### Criterios de aceptacion
- Identificacion de ciclos reales.
- Propuesta de refactor por capas.
- Riesgos y mitigaciones claras.

## 2) Auditoria UI/UX (Tailwind + WCAG)

### Objetivo
Garantizar consistencia visual y accesibilidad.

### Entregables
- Lista de inconsistencias (tipografia, spacing, color).
- Quick wins (cambios rapidos).
- Recomendaciones WCAG (AA minimo).

### Criterios de aceptacion
- Contraste AA validado.
- Navegacion por teclado revisada.
- Labels/ARIA correctos en inputs criticos.

## 3) Seguridad (SAST + Hardening)

### Objetivo
Detectar vulnerabilidades y proponer endurecimiento inmediato.

### Entregables
- Hallazgos por severidad (Critico/Alto/Medio/Bajo).
- Plan de hardening inmediato.
- Priorizacion P0/P1/P2.

### Criterios de aceptacion
- Al menos 5 hallazgos revisados.
- Mitigacion concreta por hallazgo.
- Riesgos residuales documentados.

## 4) Meta-Prompting (Prompts perfectos)

### Objetivo
Generar prompts para sub-agentes por cada mejora clave.

### Entregables
- Prompts listos para delegar tareas.

---

# PROMPTS PERFECTOS (listos para sub-agentes)

### Prompt A – Eliminar ciclos de dependencias
```
Eres un sub-agente experto en arquitectura de monorepos.
Tarea: detectar y eliminar ciclos de dependencias en el grafo.
Contexto: modulos principales del repo (apps/, packages/, libs/).
Restricciones: no romper APIs publicas; cambios minimos.
Output esperado: lista de ciclos + plan de refactor + propuesta de patch.
Criterios de aceptacion:
- Ciclos identificados con rutas concretas.
- Propuesta de extraccion o inversion de dependencias.
- Riesgos de regresion descritos.
```

### Prompt B – Auditoria UI/UX Tailwind + WCAG
```
Eres un sub-agente experto en UI/UX y accesibilidad.
Tarea: auditar consistencia de UI y WCAG.
Contexto: componentes base y paginas principales.
Restricciones: mantener diseno actual; cambios incrementales.
Output esperado: lista de inconsistencias + fixes rapidos.
Criterios de aceptacion:
- Contraste AA validado.
- Navegacion por teclado comprobada.
- Labels/ARIA correctos en inputs criticos.
```

### Prompt C – SAST + Hardening inmediato
```
Eres un sub-agente experto en seguridad de aplicaciones.
Tarea: realizar SAST y proponer hardening inmediato.
Contexto: backend, frontend y API routes.
Restricciones: no agregar dependencias nuevas sin justificar.
Output esperado: hallazgos por severidad + plan de mitigacion.
Criterios de aceptacion:
- Al menos 5 hallazgos potenciales revisados.
- Riesgo y mitigacion documentados.
- Prioridades claras (P0, P1, P2).
```

### Prompt D – Consolidar patrones duplicados UI
```
Eres un sub-agente experto en frontend.
Tarea: detectar patrones UI duplicados y consolidarlos.
Contexto: componentes y estilos repetidos.
Restricciones: no cambiar comportamiento visible.
Output esperado: lista de duplicados + propuesta de componente unico.
Criterios de aceptacion:
- Reduccion de duplicacion.
- No regresiones visuales.
```

---

## Resultado final esperado
- Grafo de dependencias claro y sin ciclos.
- UI consistente y accesible (WCAG AA).
- Informe SAST con hardening inmediato.
- Prompts listos para delegar mejoras.
