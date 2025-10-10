# 🚀 Egea Productivity - Guía de Refactorización

## Resumen Ejecutivo

Este proyecto está en proceso de refactorización mayor para convertirse en una **herramienta de gestión robusta, eficiente y escalable**. Actualmente en **Alpha v1.2**, avanzando hacia **Alpha v1.3+**.

### 📊 Estado Actual: 48% Completado

```
PROGRESO GENERAL
████████████████████░░░░░░░░░░░░░░░░░░ 48%

Backend/Infraestructura:  ████████░░ 80%
Framework Visual:         ██████████ 100%
Refactorización Vistas:   ████░░░░░░ 40%
Nuevas Funcionalidades:   ██░░░░░░░░ 20%
```

---

## 📚 Archivos de Documentación

### 1. [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - **Plan Completo**
Documento maestro con:
- ✅ Análisis detallado de la estructura actual
- ✅ Plan de implementación por fases
- ✅ Especificaciones técnicas de cada módulo
- ✅ Checklist general de implementación
- ✅ Comandos útiles y métricas de éxito

**Usar cuando**: Necesites entender la arquitectura completa o especificaciones técnicas.

### 2. [TASKS_TRACKER.md](./TASKS_TRACKER.md) - **Memoria del Proyecto**
Sistema de tracking con:
- ✅ Historial de sesiones de trabajo
- ✅ Estado actual de cada módulo
- ✅ Bugs tracker (críticos, importantes, menores)
- ✅ Progreso por sprint
- ✅ Métricas de desarrollo

**Usar cuando**: Necesites saber qué se ha hecho, qué falta, o retomar el trabajo.

### 3. Este archivo - **Guía Rápida**
Resumen ejecutivo para:
- 🎯 Obtener visión general rápida
- 🎯 Identificar próximos pasos críticos
- 🎯 Acceder a recursos clave

---

## 🔥 Acciones Críticas Inmediatas

### ⚠️ URGENTE (Esta Semana)

#### 1. Aplicar Migraciones SQL (1 hora)
```bash
cd supabase
npx supabase db push
```

**Migraciones a aplicar**:
- `20251006000000_unified_rls_policies.sql` - Fix recursividad RLS
- `20251006000001_create_detailed_tasks_view.sql` - Vista optimizada
- `20251006000002_indexes_and_cron_jobs.sql` - Archivado automático

**Validación**:
1. Probar todas las políticas RLS en Supabase Dashboard
2. Verificar que `detailed_tasks` view funciona
3. Confirmar que pg_cron está habilitado

#### 2. Depurar TemplateDialog (3-4 horas)
**Archivo**: [src/components/templates/TemplateDialog.tsx](src/components/templates/TemplateDialog.tsx)

**Problema**: No crea plantillas correctamente

**Pasos**:
1. Revisar lógica de envío del formulario
2. Añadir logs detallados
3. Verificar schema de tabla `templates`
4. Probar flujo end-to-end

#### 3. Reintegrar Flujo de Gestión de Datos (4-6 horas)
**Archivo**: [src/pages/DataEntry.tsx](src/pages/DataEntry.tsx)

**Problema**: Flujo "Añadir Tabla de Datos" incompleto/roto

**Pasos**:
1. Revisar componente `DataManagement.tsx`
2. Restaurar funcionalidad de crear Screens
3. Implementar lógica `next_screen_id`
4. Implementar archivado automático al marcar como terminado

---

## 🎯 Roadmap por Fases

### FASE 1: Backend y Migraciones (80% ✅)
- [x] Crear función `is_admin()` con SECURITY DEFINER
- [x] Crear vista `detailed_tasks`
- [x] Configurar Cron Jobs para archivado
- [x] Crear índices de optimización
- [ ] ⏳ **APLICAR MIGRACIONES** ← Pendiente
- [ ] Crear Edge Function `send-whatsapp-notification` (Fase 2)

### FASE 2: Framework Visual (100% ✅)
- [x] Sistema de semáforos centralizado
- [x] Componentes Badge reutilizables
- [ ] Ajustar tema global (colores, espaciado)

### FASE 3: Refactorización de Vistas (40% 🔄)
**Prioridades**:
1. 🔴 **CRÍTICO**: Gestión de Datos - Flujo roto
2. 🔴 **CRÍTICO**: Plantillas - Bug en creación
3. 🔴 **ALTA**: Dashboard - Mejoras UX
4. 🔴 **ALTA**: Instalaciones - Diseño y sobrecarga
5. 🟡 **MEDIA**: Pantallas - Mejoras menores
6. 🟡 **MEDIA**: Usuarios - Expansión a 4 columnas
7. 🟡 **MEDIA**: Configuración - Nuevas features
8. 🟢 **BAJA**: Historial - Gráficos y filtros

### FASE 4: Nuevas Funcionalidades (20% 🔄)
- [ ] WhatsApp: Compartir plan diario (Instalaciones)
- [ ] Gestión de Grupos (Usuarios)
- [ ] Gestión de Comunicaciones con Realtime (Usuarios)
- [ ] Control de acceso por rol (Configuración)
- [ ] Subida de avatares (Configuración)
- [ ] Gráficos en Historial

### FASE 5: Optimización (0% ⏸️)
- [ ] Refactorizar queries para usar `detailed_tasks`
- [ ] Implementar Supabase Realtime
- [ ] Lazy loading y code splitting
- [ ] Testing exhaustivo

---

## 🐛 Bugs Críticos Conocidos

### 1. Recursividad Infinita en RLS
- **Severidad**: 🔴 CRÍTICA
- **Estado**: Migración de fix creada
- **Acción**: Aplicar `20251006000000_unified_rls_policies.sql`

### 2. TemplateDialog No Crea Plantillas
- **Severidad**: 🔴 CRÍTICA
- **Estado**: Identificado, no depurado
- **Acción**: Depuración manual requerida

### 3. Flujo "Añadir Tabla de Datos" Incompleto
- **Severidad**: 🔴 CRÍTICA
- **Estado**: Identificado
- **Acción**: Refactorización requerida

### 4. Archivado Manual No Funciona
- **Severidad**: 🟡 IMPORTANTE
- **Impacto**: Pérdida de historial

### 5. next_screen_id No Se Respeta
- **Severidad**: 🟡 IMPORTANTE
- **Impacto**: Flujo de trabajo roto

---

## 📁 Estructura del Proyecto

### Archivos Clave
```
chrono-display-egea/
├── REFACTORING_PLAN.md      ← Plan completo (este proyecto)
├── TASKS_TRACKER.md          ← Memoria y tracking
├── README_REFACTORING.md     ← Guía rápida (este archivo)
│
├── src/
│   ├── lib/
│   │   └── constants.ts      ← ✅ Sistema de semáforos
│   │
│   ├── components/
│   │   ├── badges/           ← ✅ StatusBadge, VehicleBadge, TaskStateBadge
│   │   ├── installations/    ← ⚠️ Instalaciones (mejoras pendientes)
│   │   ├── templates/        ← 🔴 TemplateDialog (BUG)
│   │   └── data/             ← 🔴 DataManagement (flujo roto)
│   │
│   └── pages/
│       ├── Admin.tsx         ← ⚠️ Dashboard (refactor pendiente)
│       ├── Installations.tsx ← ⚠️ Instalaciones (WhatsApp pendiente)
│       ├── DataEntry.tsx     ← 🔴 Gestión de Datos (CRÍTICO)
│       ├── Display.tsx       ← ⚠️ Pantallas (mejoras menores)
│       ├── UsersAndVehicles  ← ⚠️ Usuarios (expansión pendiente)
│       ├── ArchivePage.tsx   ← ⚠️ Historial (gráficos pendientes)
│       └── SettingsPage.tsx  ← ⚠️ Configuración (features pendientes)
│
└── supabase/
    └── migrations/
        ├── 20251006000000_unified_rls_policies.sql        ← ⏳ APLICAR
        ├── 20251006000001_create_detailed_tasks_view.sql  ← ⏳ APLICAR
        └── 20251006000002_indexes_and_cron_jobs.sql       ← ⏳ APLICAR
```

### Componentes Badge Implementados ✅
- **StatusBadge** - Estado de operarios (Activo, Vacaciones, Baja)
- **VehicleBadge** - Tipo de vehículo (Jumper, Camión, Furgoneta)
- **TaskStateBadge** - Estado de tareas (Urgente, Pendiente, Terminado, etc.)

### Páginas del Sistema
| Ruta | Archivo | Estado | Prioridad |
|------|---------|--------|-----------|
| `/admin` | Admin.tsx | ⚠️ Funcional, mejoras | 🔴 Alta |
| `/admin/installations` | Installations.tsx | ⚠️ Funcional, WhatsApp | 🔴 Alta |
| `/admin/data` | DataEntry.tsx | 🔴 Flujo roto | 🔴 Crítica |
| `/admin/screens` | Display.tsx | ⚠️ Funcional, mejoras | 🟡 Media |
| `/admin/templates` | ❌ No existe | 🔴 No implementado | 🔴 Crítica |
| `/admin/users` | UsersAndVehicles | ⚠️ Funcional, expansión | 🟡 Media |
| `/admin/archive` | ArchivePage.tsx | ⚠️ Funcional, gráficos | 🟢 Baja |
| `/admin/settings` | SettingsPage.tsx | ⚠️ Funcional, features | 🟡 Media |

---

## 🛠️ Comandos Útiles

### Supabase
```bash
# Aplicar migraciones
npx supabase db push

# Ver diferencias
npx supabase db diff

# Generar tipos TypeScript
npx supabase gen types typescript --local > src/types/supabase.ts

# Crear nueva migración
npx supabase migration new nombre_migracion

# Ver logs de Edge Functions
npx supabase functions logs send-whatsapp-notification
```

### Desarrollo
```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build producción
npm run build

# Lint
npm run lint
```

### Git (Recomendado)
```bash
# Crear rama para cada feature
git checkout -b feature/nombre-feature

# Commits semánticos
git commit -m "feat: descripción"    # Nueva funcionalidad
git commit -m "fix: descripción"     # Corrección de bug
git commit -m "refactor: descripción" # Refactorización
git commit -m "docs: descripción"    # Documentación
```

---

## 📋 Checklist de Sesión de Trabajo

### Al Iniciar
- [ ] Leer [TASKS_TRACKER.md](./TASKS_TRACKER.md) - Sección "Próxima Sesión"
- [ ] Revisar bugs críticos pendientes
- [ ] Verificar estado de Supabase Dashboard
- [ ] Pull latest changes (si en equipo)

### Durante el Trabajo
- [ ] Marcar tareas como completadas en tiempo real
- [ ] Documentar bugs nuevos encontrados
- [ ] Hacer commits frecuentes y descriptivos
- [ ] Probar cambios antes de commit

### Al Finalizar
- [ ] Actualizar [TASKS_TRACKER.md](./TASKS_TRACKER.md) - Sección "Historial de Sesiones"
- [ ] Actualizar progreso de módulos
- [ ] Documentar decisiones arquitectónicas (si aplica)
- [ ] Definir objetivos de próxima sesión
- [ ] Push changes

---

## 🎓 Recursos Adicionales

### Documentación Técnica
- [Supabase Docs](https://supabase.com/docs)
- [React Router v6](https://reactrouter.com/en/main)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)

### Específico del Proyecto
- Sistema de Semáforos: [src/lib/constants.ts](src/lib/constants.ts)
- Políticas RLS: `supabase/migrations/20251006000000_unified_rls_policies.sql`
- Vista Optimizada: `supabase/migrations/20251006000001_create_detailed_tasks_view.sql`

---

## 💬 Convenciones del Proyecto

### Nombres de Archivos
- Componentes: `PascalCase.tsx` (ej: `StatusBadge.tsx`)
- Hooks: `use-kebab-case.tsx` (ej: `use-mobile.tsx`)
- Utils: `camelCase.ts` (ej: `constants.ts`)
- Páginas: `PascalCase.tsx` (ej: `Admin.tsx`)

### Estructura de Componentes
```typescript
// 1. Imports externos
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Imports internos
import { getTaskStateColor } from '@/lib/constants';

// 3. Types
interface Props {
  // ...
}

// 4. Component
export function ComponentName({ ...props }: Props) {
  // Hooks primero
  const [state, setState] = useState();

  // Funciones después
  const handleClick = () => {};

  // JSX al final
  return <div>...</div>;
}
```

### Commits Semánticos
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `refactor:` - Refactorización sin cambios funcionales
- `style:` - Cambios de estilo/formato
- `docs:` - Documentación
- `test:` - Tests
- `chore:` - Mantenimiento

---

## 🚨 Problemas Comunes y Soluciones

### 1. Error de RLS "recursion limit exceeded"
**Solución**: Aplicar migración `20251006000000_unified_rls_policies.sql`

### 2. Queries lentas en tablas grandes
**Solución**:
1. Aplicar `20251006000001_create_detailed_tasks_view.sql`
2. Usar vista `detailed_tasks` en lugar de joins manuales

### 3. Datos no se archivan automáticamente
**Solución**: Aplicar `20251006000002_indexes_and_cron_jobs.sql` y verificar pg_cron

### 4. Templates no se crean
**Solución**: Depurar `TemplateDialog.tsx` (ver sección crítica)

---

## 📞 Contacto y Soporte

### Documentación Interna
- Plan Completo: [REFACTORING_PLAN.md](./REFACTORING_PLAN.md)
- Tracking: [TASKS_TRACKER.md](./TASKS_TRACKER.md)

### Issues y Bugs
- Documentar en sección "BUGS TRACKER" de [TASKS_TRACKER.md](./TASKS_TRACKER.md)
- Marcar severidad (🔴 Crítico, 🟡 Importante, 🟢 Menor)

---

## 🎯 Objetivos de Versión

### Alpha v1.3 (Próximo Release)
**Fecha Estimada**: 2-3 semanas
**Objetivos**:
- ✅ Migraciones SQL aplicadas
- ✅ Bugs críticos resueltos
- ✅ Dashboard refactorizado
- ✅ Instalaciones mejoradas
- ✅ Gestión de Datos funcionando 100%
- ✅ Plantillas funcionando 100%

### Alpha v1.4 (Futuro)
**Fecha Estimada**: 4-6 semanas
**Objetivos**:
- WhatsApp integrado
- Gestión de Grupos
- Control de acceso por rol
- Gráficos en Historial
- Subida de avatares

### Beta v1.0 (Objetivo Final)
**Fecha Estimada**: 8-10 semanas
**Objetivos**:
- Todas las funcionalidades implementadas
- Optimización completa
- Testing exhaustivo
- Documentación completa
- Despliegue en producción

---

## ✅ Quick Start para Nueva Sesión

1. **Leer Estado Actual**:
   ```bash
   # Abrir y leer sección "Próxima Sesión"
   code TASKS_TRACKER.md
   ```

2. **Verificar Cambios Pendientes**:
   ```bash
   git status
   git pull  # Si trabajas en equipo
   ```

3. **Elegir Tarea Crítica**:
   - Ver sección "TAREAS CRÍTICAS" en [TASKS_TRACKER.md](./TASKS_TRACKER.md)
   - Priorizar: 🔴 Crítico > 🟡 Importante > 🟢 Menor

4. **Iniciar Desarrollo**:
   ```bash
   npm run dev
   # Abrir Supabase Dashboard en paralelo
   ```

5. **Al Finalizar**:
   - Actualizar [TASKS_TRACKER.md](./TASKS_TRACKER.md)
   - Commit con mensaje semántico
   - Push changes

---

**Última Actualización**: 6 de octubre de 2025
**Versión**: 1.0
**Proyecto**: Egea Productivity App
**Estado**: Alpha v1.2 → Alpha v1.3 (48% completado)

---

## 📊 Progreso Visual

```
SEMANA 1 (Actual)
├─ Día 1: Planificación y documentación ✅
├─ Día 2: Aplicar migraciones SQL ⏳
├─ Día 3: Depurar TemplateDialog ⏳
├─ Día 4-5: Reintegrar Gestión de Datos ⏳
└─ Fin de Semana: Testing

SEMANA 2
├─ Día 1-2: Refactorizar Dashboard ⬜
├─ Día 3-4: Mejorar Instalaciones ⬜
└─ Día 5: Ajustar tema global ⬜

SEMANA 3
├─ Features nuevas (Grupos, Config) ⬜
└─ Gráficos en Historial ⬜

SEMANA 4+
├─ WhatsApp integration ⬜
├─ Optimización y testing ⬜
└─ Release Alpha v1.3 🎯
```

---

**¡Éxito en la refactorización! 🚀**
