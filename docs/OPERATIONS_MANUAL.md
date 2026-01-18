# Manual de Operaciones - Egea Productivity

**Versión**: 1.0  
**Última actualización**: 18 de enero de 2026

---

## 📋 Índice

1. [Estados del Pedido](#estados-del-pedido)
2. [Resetear Colas de Quioscos](#resetear-colas-de-quioscos)
3. [Diagnóstico de Estados Bloqueados](#diagnóstico-de-estados-bloqueados)
4. [Rollback de Pedidos](#rollback-de-pedidos)
5. [Mantenimiento de Base de Datos](#mantenimiento-de-base-de-datos)

---

## Estados del Pedido

### Flujo Normal

```
BORRADOR → PENDIENTE → PAGADO → EN_PROCESO → CORTE → CONFECCION → TAPICERIA → CONTROL_CALIDAD → LISTO_ENVIO → ENVIADO → ENTREGADO
```

### Descripción de Estados

| Estado | Módulo | Descripción |
|--------|--------|-------------|
| `BORRADOR` | Comercial | Pedido en creación |
| `PENDIENTE` | Comercial | Esperando validación comercial |
| `PAGADO` | Comercial | Pago confirmado, listo para producción |
| `EN_PROCESO` | Producción | Pedido aceptado en producción |
| `CORTE` | Producción | Fase de corte de material |
| `CONFECCION` | Producción | Fase de confección |
| `TAPICERIA` | Producción | Fase de tapicería (si aplica) |
| `CONTROL_CALIDAD` | Producción | Revisión de calidad |
| `LISTO_ENVIO` | Logística | Producción completada, esperando escaneo |
| `ENVIADO` | Logística | Pedido despachado |
| `ENTREGADO` | Historial | Pedido entregado al cliente |
| `CANCELADO` | Cualquiera | Pedido cancelado |

---

## Resetear Colas de Quioscos

### Desde Coolify (Producción)

> ⚠️ **PRECAUCIÓN**: Estas operaciones afectan datos en vivo

1. Accede a Coolify: `https://coolify.tudominio.com`
2. Selecciona el servicio de base de datos Supabase
3. Abre la terminal del contenedor PostgreSQL
4. Ejecuta:

```sql
-- Ver pedidos atascados en producción
SELECT order_number, status, updated_at 
FROM produccion_work_orders 
WHERE status NOT IN ('LISTO_ENVIO', 'CANCELADO')
  AND updated_at < NOW() - INTERVAL '7 days';

-- Resetear un pedido específico a PENDIENTE
UPDATE produccion_work_orders 
SET status = 'PENDIENTE', updated_at = NOW()
WHERE order_number = 'EG-2601-XXXX';
```

### Desde Supabase Dashboard

1. Accede al SQL Editor de **PRODUCTIVITY DB**
2. Ejecuta las consultas de diagnóstico
3. Aplica los cambios necesarios

---

## Diagnóstico de Estados Bloqueados

### Consultas de Diagnóstico

```sql
-- 1. Pedidos sin work order (bloqueados en comercial)
SELECT co.order_number, co.status, co.updated_at
FROM comercial_orders co
LEFT JOIN produccion_work_orders wo ON co.order_number = wo.order_number
WHERE co.status IN ('PAGADO', 'EN_PROCESO')
  AND wo.id IS NULL;

-- 2. Work orders sin sincronizar con comercial
SELECT wo.order_number, wo.status as prod_status, co.status as comm_status
FROM produccion_work_orders wo
JOIN comercial_orders co ON wo.order_number = co.order_number
WHERE wo.status != co.status
  AND wo.status NOT IN ('PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD');

-- 3. Pedidos huérfanos en historial
SELECT * FROM archived_orders
WHERE original_comercial_order_id IS NULL
   OR original_work_order_id IS NULL;
```

### Soluciones Comunes

**Problema**: Pedido PAGADO sin work order  
**Solución**:
```sql
-- Crear work order manualmente
INSERT INTO produccion_work_orders (
    work_order_number, order_number, customer_name, status
)
SELECT 
    'WO-' || to_char(NOW(), 'YY') || '-MANUAL',
    order_number,
    customer_name,
    'PENDIENTE'
FROM comercial_orders
WHERE order_number = 'EG-XXXX';
```

**Problema**: Pedido LISTO_ENVIO no visible en Envíos  
**Solución**: Verificar que el estado sea exactamente `LISTO_ENVIO` (sin espacios)

---

## Rollback de Pedidos

### Devolver Pedido a Estado Anterior

```sql
-- Rollback de LISTO_ENVIO a CONTROL_CALIDAD
UPDATE produccion_work_orders
SET status = 'CONTROL_CALIDAD',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' | Rollback desde LISTO_ENVIO el ' || NOW()
WHERE order_number = 'EG-XXXX';

-- Sincronizar con comercial
UPDATE comercial_orders
SET status = 'EN_PROCESO',
    updated_at = NOW()
WHERE order_number = 'EG-XXXX';
```

### Revertir Pedido Archivado

```sql
-- 1. Restaurar datos desde archived_orders
UPDATE comercial_orders co
SET status = 'LISTO_ENVIO'
FROM archived_orders ao
WHERE co.order_number = ao.order_number
  AND ao.order_number = 'EG-XXXX';

-- 2. Eliminar del historial
DELETE FROM archived_orders WHERE order_number = 'EG-XXXX';
```

---

## Mantenimiento de Base de Datos

### Verificar Triggers Activos

```sql
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgenabled as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT tgisinternal
  AND tgrelid::regclass::text IN ('comercial_orders', 'produccion_work_orders');
```

### Limpiar Datos Obsoletos

```sql
-- Eliminar pedidos archivados con más de 2 años
DELETE FROM archived_orders
WHERE archived_at < NOW() - INTERVAL '2 years';

-- Vacuum para liberar espacio
VACUUM ANALYZE archived_orders;
VACUUM ANALYZE produccion_work_orders;
VACUUM ANALYZE comercial_orders;
```

### Backup de Emergencia

```bash
# Desde el servidor Coolify
pg_dump -h localhost -U postgres -d productivity \
  --table=comercial_orders \
  --table=produccion_work_orders \
  --table=archived_orders \
  > backup_orders_$(date +%Y%m%d).sql
```

---

## Contacto de Soporte

Para incidencias críticas que no puedan resolverse con este manual:

1. Verificar logs en Coolify > Servicio > Logs
2. Verificar logs de Supabase Dashboard > Logs
3. Contactar con el equipo de desarrollo

---

*Documento generado automáticamente. Última revisión: 18/01/2026*
