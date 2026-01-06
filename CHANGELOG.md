# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0-beta] - 2026-01-02

### ✨ Añadido
- **Sistema de Roles Expandido**: 8 roles completos (admin, manager, responsable, operario, production, shipping, warehouse, comercial)
- **Permisos Granulares**: Sistema de permisos por recurso y acción
- **Gestor de Versiones**: Componente `VersionDisplay` con changelog interactivo
- **UI Móvil Optimizada**: Calendario global responsive y navegación móvil mejorada
- **Roles Especializados**: 
  - Production: Gestión de producción y envíos
  - Shipping: Gestión exclusiva de envíos
  - Warehouse: Gestión de almacén y visualización comercial
  - Comercial: Gestión de pedidos comerciales

### 🔒 Seguridad
- Normalización de roles en `PermissionGuardEnhanced`
- Jerarquía de roles implementada (admin:8 → comercial:1)
- Guards de permisos en todas las rutas críticas

### 🎨 Interfaz
- Calendario global responsive con vista móvil y desktop
- Badge de versión con popover de changelog
- Navegación adaptativa por rol
- Redirecciones inteligentes según rol de usuario

### 🚫 Deshabilitado Temporalmente
- **Comunicaciones**: Módulo en desarrollo, oculto de todos los menús

### 🐛 Correcciones
- Fix: Redirección a `/admin/workday` corregida a `/admin/installations`
- Fix: Crash en `GlobalCalendarPage` por falta de `DndContext`
- Fix: Configuración de red para acceso móvil (host: 0.0.0.0)
- Fix: Inconsistencia de roles entre componentes

### 🔧 Técnico
- Actualización de tipos en `Profile.role`
- Expansión de `NormalizedRole` a 8 roles
- Lógica de permisos por jerarquía
- Caché de permisos optimizado

---

## [1.0.0-alpha] - 2023-12

### ✨ Añadido
- Sistema básico de autenticación
- Gestión de usuarios (4 roles básicos)
- Gestión de instalaciones y tareas
- Gestión de vehículos
- Dashboard principal
- Sistema de navegación por roles
- Integración con Supabase

### 🎨 Interfaz
- Layout principal con sidebar
- Layout compacto para roles operativos
- Tema claro/oscuro
- Componentes UI base (shadcn/ui)

### 🔒 Seguridad
- Row Level Security (RLS) en Supabase
- Guards de autenticación
- Permisos básicos por rol

---

## Tipos de Cambios

- **✨ Añadido**: Para nuevas funcionalidades
- **🔧 Cambiado**: Para cambios en funcionalidades existentes
- **🗑️ Obsoleto**: Para funcionalidades que serán eliminadas
- **🚫 Eliminado**: Para funcionalidades eliminadas
- **🐛 Correcciones**: Para corrección de errores
- **🔒 Seguridad**: Para vulnerabilidades de seguridad
- **🎨 Interfaz**: Para cambios visuales
- **⚡ Rendimiento**: Para mejoras de rendimiento
- **📝 Documentación**: Para cambios en documentación

---

## Roadmap

### [2.1.0] - Próxima versión
- [ ] Módulo de Comunicaciones completo
- [ ] Matriz de permisos expandida (8 roles)
- [ ] Restricciones en página de usuarios
- [ ] Testing exhaustivo por rol
- [ ] Documentación de flujos de usuario

### [2.2.0] - Futuro
- [ ] Sistema de notificaciones
- [ ] Historial de cambios por usuario
- [ ] Exportación de datos
- [ ] Reportes avanzados
- [ ] API REST documentada

### [3.0.0] - Visión
- [ ] Multi-tenancy
- [ ] Aplicación móvil nativa
- [ ] Integración con sistemas externos
- [ ] IA para optimización de rutas
- [ ] Dashboard predictivo
