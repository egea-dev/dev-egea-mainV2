# Guía de Uso de Clientes Supabase

**Última actualización**: 9 de enero de 2026

---

## 📋 Resumen Ejecutivo

Este proyecto utiliza **dos bases de datos Supabase separadas** para mantener una arquitectura modular:

- **MAIN**: Autenticación, usuarios, permisos, recursos, instalaciones
- **PRODUCTIVITY**: Comercial, producción, logística, almacén

Ambas bases de datos **comparten la misma sesión de autenticación** mediante un interceptor de fetch.

---

## 🎯 ¿Qué Cliente Usar?

### Regla Simple

```typescript
// Para tablas de MAIN (usuarios, instalaciones, permisos)
import { supabaseMain } from '@/integrations/supabase/client';

// Para tablas de PRODUCTIVITY (comercial, producción, logística)
import { supabaseProductivity } from '@/integrations/supabase/client';

// Alias de supabaseMain (para compatibilidad)
import { supabase } from '@/integrations/supabase/client';
```

---

## 📊 Tabla de Mapeo Completa

| Tabla | Base de Datos | Cliente | Módulo |
|-------|---------------|---------|--------|
| **MAIN DATABASE** |
| `profiles` | MAIN | `supabaseMain` | Usuarios |
| `vehicles` | MAIN | `supabaseMain` | Recursos |
| `templates` | MAIN | `supabaseMain` | Configuración |
| `screens` | MAIN | `supabaseMain` | Pantallas |
| `screen_data` | MAIN | `supabaseMain` | Instalaciones |
| `screen_groups` | MAIN | `supabaseMain` | Configuración |
| `task_profiles` | MAIN | `supabaseMain` | Instalaciones |
| `task_vehicles` | MAIN | `supabaseMain` | Instalaciones |
| `role_permissions` | MAIN | `supabaseMain` | Permisos |
| `detailed_tasks` | MAIN | `supabaseMain` | Vista (Instalaciones) |
| **PRODUCTIVITY DATABASE** |
| `comercial_orders` | PRODUCTIVITY | `supabaseProductivity` | Comercial |
| `produccion_work_orders` | PRODUCTIVITY | `supabaseProductivity` | Producción |
| `materials` | PRODUCTIVITY | `supabaseProductivity` | Materiales |
| `logistics` | PRODUCTIVITY | `supabaseProductivity` | Logística |
| `order_documents` | PRODUCTIVITY | `supabaseProductivity` | Comercial |
| `status_log` | PRODUCTIVITY | `supabaseProductivity` | Comercial |

---

## 💡 Ejemplos de Código

### ✅ Ejemplo 1: Consultar Instalaciones (MAIN)

```typescript
import { supabaseMain } from '@/integrations/supabase/client';

export const useInstallations = () => {
  return useQuery({
    queryKey: ['installations'],
    queryFn: async () => {
      const { data, error } = await supabaseMain
        .from('screen_data')
        .select('*')
        .eq('screen_group', 'Instalaciones');
      
      if (error) throw error;
      return data;
    }
  });
};
```

### ✅ Ejemplo 2: Consultar Pedidos Comerciales (PRODUCTIVITY)

```typescript
import { supabaseProductivity } from '@/integrations/supabase/client';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabaseProductivity
        .from('comercial_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};
```

### ✅ Ejemplo 3: Actualizar Fecha de Entrega (PRODUCTIVITY)

```typescript
import { supabaseProductivity } from '@/integrations/supabase/client';

const updateDeliveryDate = async (orderId: string, newDate: string) => {
  const { error } = await supabaseProductivity
    .from('comercial_orders')
    .update({ delivery_date: newDate })
    .eq('id', orderId);
  
  if (error) throw error;
};
```

### ✅ Ejemplo 4: Usar Alias para MAIN

```typescript
// Esto es equivalente a usar supabaseMain
import { supabase } from '@/integrations/supabase/client';

const { data: profiles } = await supabase
  .from('profiles')
  .select('*');
```

---

## 🔒 Autenticación Compartida

### ¿Cómo Funciona?

Ambos clientes comparten la misma sesión de autenticación:

1. **`supabaseMain`** maneja la autenticación (login, logout, sesión)
2. **`supabaseProductivity`** usa un interceptor de fetch que inyecta automáticamente el token de `supabaseMain`

```typescript
// Interceptor en client.ts
const fetchWithMainAuth = async (url, options) => {
  // Obtener token de MAIN
  const { data: { session } } = await supabaseMain.auth.getSession();
  
  // Inyectar token en headers
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  return fetchWithRetry(url, { ...options, headers });
};
```

### Implicaciones

- ✅ **Un solo login** para ambas bases de datos
- ✅ **Sesión sincronizada** automáticamente
- ✅ **RLS (Row Level Security)** funciona en ambas bases de datos
- ⚠️ Warning "Multiple GoTrueClient instances" es **benigno y esperado**

---

## ⚠️ Errores Comunes

### ❌ Error 1: "relation does not exist"

**Causa**: Usar el cliente incorrecto para una tabla.

```typescript
// ❌ INCORRECTO - comercial_orders está en PRODUCTIVITY
const { data } = await supabaseMain
  .from('comercial_orders')
  .select('*');

// ✅ CORRECTO
const { data } = await supabaseProductivity
  .from('comercial_orders')
  .select('*');
```

### ❌ Error 2: "table does not exist"

**Causa**: Mismo problema, cliente incorrecto.

```typescript
// ❌ INCORRECTO - screen_data está en MAIN
const { data } = await supabaseProductivity
  .from('screen_data')
  .select('*');

// ✅ CORRECTO
const { data } = await supabaseMain
  .from('screen_data')
  .select('*');
```

---

## 🛠️ Añadir Nueva Tabla

### Paso 1: Decidir la Base de Datos

**MAIN** si la tabla es para:
- Autenticación y usuarios
- Permisos y roles
- Recursos (vehículos, operarios)
- Instalaciones y montajes
- Configuración de pantallas

**PRODUCTIVITY** si la tabla es para:
- Comercial (pedidos, clientes)
- Producción (órdenes de trabajo)
- Logística (envíos, almacén)
- Materiales

### Paso 2: Crear Migración

```bash
# Para MAIN
supabase migration new add_nueva_tabla_main

# Para PRODUCTIVITY
# (crear en el proyecto de Productivity)
```

### Paso 3: Actualizar Tipos TypeScript

```bash
# Regenerar tipos de MAIN
supabase gen types typescript --project-id <MAIN_PROJECT_ID> > src/integrations/supabase/types.ts

# Regenerar tipos de PRODUCTIVITY
supabase gen types typescript --project-id <PRODUCTIVITY_PROJECT_ID> > src/integrations/supabase/types-productivity.ts
```

### Paso 4: Usar el Cliente Correcto

```typescript
// Si está en MAIN
import { supabaseMain } from '@/integrations/supabase/client';

// Si está en PRODUCTIVITY
import { supabaseProductivity } from '@/integrations/supabase/client';
```

### Paso 5: Actualizar Esta Guía

Añadir la nueva tabla a la [Tabla de Mapeo](#-tabla-de-mapeo-completa).

---

## 🎨 Mejores Prácticas

### 1. Importar Explícitamente

```typescript
// ✅ BUENO - Claro qué cliente se usa
import { supabaseMain, supabaseProductivity } from '@/integrations/supabase/client';

// ⚠️ EVITAR - Puede causar confusión
import { supabase } from '@/integrations/supabase/client';
```

### 2. Usar Alias en Componentes Específicos

Si un componente **solo** usa PRODUCTIVITY, puedes usar un alias:

```typescript
import { supabaseProductivity as supabase } from '@/integrations/supabase/client';

// Ahora puedes usar 'supabase' sabiendo que es Productivity
const { data } = await supabase.from('comercial_orders').select('*');
```

### 3. Documentar en Hooks

```typescript
/**
 * Hook para obtener pedidos comerciales
 * @database PRODUCTIVITY
 * @table comercial_orders
 */
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabaseProductivity
        .from('comercial_orders')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });
};
```

### 4. Agrupar Imports por Base de Datos

```typescript
// Imports de MAIN
import { supabaseMain } from '@/integrations/supabase/client';
import type { Profile, Vehicle } from '@/integrations/supabase/types';

// Imports de PRODUCTIVITY
import { supabaseProductivity } from '@/integrations/supabase/client';
import type { CommercialOrder } from '@/integrations/supabase/types-productivity';
```

---

## 🔍 Debugging

### Ver Qué Cliente Usa un Componente

```typescript
// Añadir console.log temporal
console.log('Using client:', supabaseMain === supabase ? 'MAIN' : 'PRODUCTIVITY');
```

### Verificar Autenticación

```typescript
// Verificar sesión en MAIN
const { data: { session } } = await supabaseMain.auth.getSession();
console.log('Session:', session);

// Productivity usa el mismo token automáticamente
```

### Inspeccionar Headers

```typescript
// En el interceptor fetchWithMainAuth
console.log('Request headers:', headers);
console.log('Access token:', session?.access_token);
```

---

## 📚 Referencias

- [Documentación de Supabase](https://supabase.com/docs)
- [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) - Esquema de MAIN
- [implementation_plan.md](./.gemini/antigravity/brain/806d03f6-9608-4bdd-97ed-61a07934b634/implementation_plan.md) - Plan de arquitectura dual

---

## ❓ FAQ

### ¿Por qué dos bases de datos?

**Modularidad**: Separar MAIN (core) de PRODUCTIVITY (módulos de negocio) permite:
- Escalabilidad independiente
- Despliegues separados
- Backups diferenciados
- Permisos granulares

### ¿El warning "Multiple GoTrueClient" es un problema?

**No**. Supabase mismo dice "It is not an error". Es esperado y seguro porque:
- Usamos diferentes bases de datos
- Solo MAIN maneja autenticación
- El interceptor comparte el token correctamente

### ¿Puedo usar `supabase` en lugar de `supabaseMain`?

**Sí**, `supabase` es un alias de `supabaseMain`. Pero para claridad, se recomienda usar `supabaseMain` explícitamente.

### ¿Cómo sé si una tabla nueva va en MAIN o PRODUCTIVITY?

**Pregúntate**: ¿Es core de la aplicación (usuarios, permisos, instalaciones) o es un módulo de negocio (comercial, producción)?
- Core → MAIN
- Negocio → PRODUCTIVITY

---

**Última revisión**: 9 de enero de 2026  
**Mantenedor**: Equipo de Desarrollo Egea
