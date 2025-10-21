# Role Aware Layout – Wireframes iniciales

> Entregable del **Paso 1** del plan maestro (“Diseño UX por rol”). Define el layout móvil/compacto para roles *responsable* y *operario* antes de implementar componentes.

## Objetivos
- Priorizar la jornada diaria y la comunicación rápida.
- Reducir navegación lateral para pantallas pequeñas.
- Mostrar estado personal (turno, disponibilidad, incidencias) sin entrar a otras vistas.

## Componentes Compartidos
- **Topbar compacto**: logo + saludo + icono de notificaciones.
- **Tabs primarios**: `Mi jornada`, `Comunicaciones`, `Vehículos`, `Perfil`.
- **CTA flotante** (bottom-right): abre acciones rápidas (nuevo mensaje, reportar incidencia, marcar check-in).
- **Footer nav (5 items máx.)** con iconos grandes y badges de actividad.

## Wireframe: Responsable
```
┌──────────────────────────────────────────┐
│  ← EGEA Productivity          🔔 (3)     │  Topbar
├──────────────────────────────────────────┤
│  Hola, Andrea (Responsable)             │
│  Estado: En turno • Vehículo: JUMPER 02 │  Status strip
├──────────────────────────────────────────┤
│  [ Hoy ] [ Comunicaciones ] [ Vehículos ]│  Tabs
│        [ Perfil ]                        │
├──────────────────────────────────────────┤
│  ▢ Check-in pendiente   ⏱ 08:00-08:15    │
│  Botón “Registrar”                         
├──────────────────────────────────────────┤
│  ▣ Tareas de hoy (3)                     │
│   • Montaje Tarima  — 09:00  • 2 ops     │
│     Chips: Jesús (OK), Sara (Pendiente)  │
│   • Revisión Paneles — 12:00 • 1 veh     │
│   Botón “Ver detalle / Reprogramar”      │
├──────────────────────────────────────────┤
│  ▣ Comunicaciones recientes              │
│   • “Plan mañana – Instalación A”        │
│     Estado: Entregado • 07:45            │
│   CTA “Ver historial completo”           │
├──────────────────────────────────────────┤
│  ▣ Vehículos asignados                   │
│   • Furgoneta 03 (Disponible)            │
│   • Camión 02 (En uso hasta 16:00)       │
└──────────────────────────────────────────┘
              ⊕ Acción rápida (floating)
```

### Acciones clave
- Check-in/out inmediato.
- Navegación a detalle de tareas con permisos de replanificación.
- Acceso directo a comunicaciones (enviar recordatorios, ver logs).

## Wireframe: Operario
```
┌──────────────────────────────────────────┐
│  ← EGEA Productivity          🔔 (1)     │
├──────────────────────────────────────────┤
│  Hola, Luis (Operario)                   │
│  Estado: Activo • Último check-in: 07:58 │
├──────────────────────────────────────────┤
│  [ Mi jornada ] [ Mensajes ] [ Perfil ]  │
├──────────────────────────────────────────┤
│  ▢ Check-in actual                       │
│   • Ubicación: Taller Principal          │
│   • Botón “Marcar incidencia”            │
├──────────────────────────────────────────┤
│  ▣ Tarea en curso                        │
│   “Montaje Tarima Zona A”                │
│   Horario: 08:00 – 11:00                 │
│   Responsable: Andrea Soto               │
│   Checklist rápido: [ ] Inicio [ ] Foto  │
│   CTA “Ver instrucciones / Adjuntar fotos”
├──────────────────────────────────────────┤
│  ▣ Próximas tareas                       │
│   • “Revisión paneles” — 12:00           │
│   • “Entrega material” — 15:30           │
├──────────────────────────────────────────┤
│  ▣ Mensajes directos                     │
│   Chat compacto con soporte + supervisor │
└──────────────────────────────────────────┘
              ⊕ Reportar incidencia
```

### Acciones clave
- Checklist de tarea sin salir de la vista principal.
- Mensajería directa simplificada (solo contactos relevantes).
- Botón rápido para incidencias (abre formulario corto con fotos).

## Estado / Próximos pasos
- ✅ Wireframes iniciales listos.
- ➡️ Integrar estos diseños en la implementación del `RoleAwareLayout` y `WorkdayPage` (Paso 2 del plan).
```
