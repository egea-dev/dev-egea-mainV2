# Egea Productivity App

Sistema de gestión integral para instalaciones, producción comercial y logística.

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
https://localhost:8083
```

---

## 🏗️ Arquitectura

Este proyecto utiliza una **arquitectura dual de bases de datos**:

- **🔵 MAIN**: Core (autenticación, usuarios, permisos, instalaciones)
- **🟢 PRODUCTIVITY**: Módulos de negocio (comercial, producción, logística)

Ambas bases de datos comparten la misma sesión de autenticación mediante un interceptor de fetch.

### Documentación Completa

- 📖 [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema
- 📘 [SUPABASE_CLIENTS_GUIDE.md](./SUPABASE_CLIENTS_GUIDE.md) - Guía de uso de clientes Supabase
- 📗 [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) - Esquema de base de datos MAIN

---

## 🗂️ Estructura del Proyecto

```
egea-Main-control/
├── src/
│   ├── components/          # Componentes React
│   │   ├── dashboard/       # Dashboard Admin
│   │   ├── commercial/      # Módulo Comercial
│   │   ├── installations/   # Módulo Instalaciones
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   ├── integrations/
│   │   └── supabase/        # Clientes Supabase
│   │       ├── client.ts    # ⚠️ Configuración de clientes
│   │       ├── types.ts     # Tipos MAIN
│   │       └── types-productivity.ts  # Tipos PRODUCTIVITY
│   ├── pages/               # Páginas principales
│   └── lib/                 # Utilidades
├── supabase/
│   └── migrations/          # Migraciones SQL (MAIN)
└── docs/                    # Documentación adicional
```

---

## 💻 Uso de Clientes Supabase

### Regla Simple

```typescript
// Para tablas de MAIN (usuarios, instalaciones, permisos)
import { supabaseMain } from '@/integrations/supabase/client';

// Para tablas de PRODUCTIVITY (comercial, producción, logística)
import { supabaseProductivity } from '@/integrations/supabase/client';
```

### Tabla de Mapeo Rápido

| Tabla | Cliente | Módulo |
|-------|---------|--------|
| `profiles`, `vehicles`, `screen_data` | `supabaseMain` | Core |
| `comercial_orders`, `produccion_work_orders` | `supabaseProductivity` | Negocio |

**Ver tabla completa**: [SUPABASE_CLIENTS_GUIDE.md](./SUPABASE_CLIENTS_GUIDE.md)

---

## 🔐 Autenticación

La autenticación es manejada por `supabaseMain` y compartida automáticamente con `supabaseProductivity` mediante un interceptor de fetch.

```typescript
// Login (solo usar supabaseMain)
const { data, error } = await supabaseMain.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Logout
await supabaseMain.auth.signOut();
```

---

## 📦 Módulos Principales

### 1. **Dashboard Admin**
- Vista general de instalaciones y pedidos
- Calendario con drag & drop
- Estadísticas en tiempo real

### 2. **Instalaciones**
- Gestión de tareas de instalación
- Asignación de operarios y vehículos
- Calendario semanal

### 3. **Comercial**
- Gestión de pedidos
- Seguimiento de estados
- Documentación (presupuestos, pedidos)

### 4. **Producción**
- Órdenes de trabajo
- Control de calidad
- Etiquetado QR

### 5. **Logística**
- Gestión de envíos
- Almacén
- Tracking

---

## ⚙️ Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# MAIN Database
VITE_SUPABASE_URL=https://your-main-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-main-anon-key

# PRODUCTIVITY Database
VITE_SUPABASE_PRODUCTIVITY_URL=https://your-productivity-project.supabase.co
VITE_SUPABASE_PRODUCTIVITY_ANON_KEY=your-productivity-anon-key
```

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo

# Build
npm run build            # Compilar para producción
npm run preview          # Preview de build

# Linting
npm run lint             # Ejecutar ESLint
```

---

## ⚠️ Notas Importantes

### Warning "Multiple GoTrueClient instances"

Este warning es **esperado y benigno**. Aparece porque usamos dos bases de datos Supabase, pero es seguro porque:
- Solo MAIN maneja autenticación
- PRODUCTIVITY usa interceptor de fetch
- No hay conflicto de datos

**Más info**: Ver comentarios en `src/integrations/supabase/client.ts`

### RLS (Row Level Security)

Ambas bases de datos implementan RLS. Asegúrate de estar autenticado para acceder a los datos.

---

## 📚 Documentación Adicional

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura completa del sistema
- [SUPABASE_CLIENTS_GUIDE.md](./SUPABASE_CLIENTS_GUIDE.md) - Guía detallada de clientes
- [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) - Esquema de base de datos

---

## 🤝 Contribuir

### Añadir Nueva Tabla

1. **Decidir base de datos**: ¿MAIN (core) o PRODUCTIVITY (negocio)?
2. **Crear migración**: En el proyecto Supabase correspondiente
3. **Regenerar tipos**: `supabase gen types typescript`
4. **Usar cliente correcto**: `supabaseMain` o `supabaseProductivity`
5. **Actualizar documentación**: Añadir a tabla de mapeo

**Ver guía completa**: [SUPABASE_CLIENTS_GUIDE.md#añadir-nueva-tabla](./SUPABASE_CLIENTS_GUIDE.md#-añadir-nueva-tabla)

---

## 🐛 Solución de Problemas

### Error: "relation does not exist"

**Causa**: Usar el cliente incorrecto para una tabla.

**Solución**: Verificar en [SUPABASE_CLIENTS_GUIDE.md](./SUPABASE_CLIENTS_GUIDE.md) qué cliente usar.

### Error: "table does not exist"

**Causa**: Mismo problema, cliente incorrecto.

**Solución**: Consultar tabla de mapeo.

---

## 📞 Soporte

- **Documentación**: Ver archivos `.md` en la raíz del proyecto
- **Issues**: [GitHub Issues](https://github.com/NeuralStories/egea-Main-control/issues)

---

## 📄 Licencia

Propietario: Egea Productivity  
Todos los derechos reservados.

---

**Última actualización**: 9 de enero de 2026  
**Versión**: 2.0
