# Resumen de Cambios en Dashboard

## ✅ Completado

### 1. Colores del Calendario
- **Gris**: Días pasados (`bg-gray-200`)
- **Naranja**: Día actual (`bg-orange-500`)
- **Naranja claro**: Días con tareas pendientes (`bg-orange-200`)

### 2. Filtro de Categorías en Tareas Pendientes
- Agregado selector con opciones: Todas, Confección, Tapicería
- Las tareas se filtran por el campo `categoria` o `tipo` en `task.data`

### 3. Tabla de Confección
- Eliminado filtro `state = 'pendiente'` que impedía ver tareas
- Agregado mensaje "No hay tareas de confección" cuando está vacía
- Colores de semáforo implementados:
  - **Rojo**: urgente
  - **Naranja**: en fabricacion
  - **Azul**: a la espera
  - **Verde**: terminado

### 4. Tabla de Tapicería
- Eliminado filtro `state = 'pendiente'` que impedía ver tareas
- Agregado mensaje "No hay tareas de tapicería" cuando está vacía
- Colores especiales:
  - **Morado**: en fabricacion
  - **Amarillo**: a la espera
  - **Fecha**: pendiente (muestra created_at)

### 5. Menú de Acciones (3 puntos)
- ✅ Ver detalles (abre diálogo)
- ✅ Editar (navega a /admin/installations)
- ✅ Archivar (mueve a archived_tasks)

## 🔍 Para Verificar

### Semáforo de Empleados en Instalaciones
El código está implementado en `src/pages/Installations.tsx` (líneas 125-142):
- Verde: status = 'activo'
- Naranja: status = 'vacaciones'
- Rojo: status = 'baja'
- Círculo rojo con número: sobrecarga (tasksCount > 1)

### Colores de Vehículos en Instalaciones
Implementado en `src/pages/Installations.tsx` (líneas 166-169):
- Azul: type contiene 'jumper'
- Amarillo: type contiene 'camión' o 'camion'
- Gris: otros tipos

## 📝 Notas Importantes

1. **Confección y Tapicería vacías**: Estas tarjetas muestran datos de `screen_data` que tienen `screen_id` asociado a pantallas con `screen_group = 'Confeccion'` o `'Tapiceria'`. Las tareas creadas desde Instalaciones NO aparecen aquí porque no tienen `screen_id`.

2. **Filtro de categorías**: El filtro busca en `task.data.categoria` o `task.data.tipo`. Para que funcione correctamente, las tareas deben tener estos campos en su objeto JSON `data`.

3. **Tabla archived_tasks**: Necesita aplicar el SQL `FIX_ARCHIVED_TASKS_TABLE.sql` para que la función de archivar funcione.

## 🗄️ SQL Pendientes de Aplicar

1. `FIX_ARCHIVED_TASKS_TABLE.sql` - Corrige estructura de tabla archived_tasks
2. `DATOS_EJEMPLO_CONFECCION_TAPICERIA.sql` - Ya aplicado (datos visibles en captura)
