# Solución: Error "Could not find the 'region' column of 'comercial_orders'"

## Problema Identificado

El error ocurre porque:

1. **Nombre de tabla incorrecto**: La tabla se creó como `public.orders` pero el código TypeScript busca `public.comercial_orders`
2. **Columnas faltantes**: Faltan múltiples columnas que el código espera:
   - `delivery_region` (nueva columna preferida)
   - `region` (columna legacy para compatibilidad)
   - `delivery_date`
   - `contact_name`
   - `phone`
   - `email`
   - `delivery_address`
   - `delivery_location_url`
   - `customer_code`
   - `customer_company`
   - `internal_notes`
   - `qr_generated_at`

## Archivos Afectados

### Código TypeScript que usa estas columnas:
- `src/types/commercial.ts` - Define el tipo `CommercialOrder` con ambas columnas
- `src/pages/CommercialPage.tsx` - Usa `delivery_region` y `region` como fallback
- `src/pages/ShippingScanPage.tsx` - Muestra región en etiquetas de envío
- `src/components/commercial/OrderDetailModal.tsx` - Formulario de edición de pedidos

### Migración SQL:
- `supabase/migrations/20251230_create_commercial_module.sql` - Creó la tabla como `orders` (incorrecto)

## Solución Aplicada

Creado el archivo de migración:
```
supabase/migrations/20251230_fix_comercial_orders_schema.sql
```

Este script:

1. ✅ **Renombra la tabla** de `public.orders` a `public.comercial_orders`
2. ✅ **Agrega todas las columnas faltantes** con los tipos correctos
3. ✅ **Migra datos** de `region` a `delivery_region` si es necesario
4. ✅ **Agrega comentarios** a las columnas para documentación
5. ✅ **Verifica** que la tabla existe correctamente

## Instrucciones para Aplicar

### Opción 1: Ejecutar en Supabase Dashboard (Recomendado)

1. Abre el **SQL Editor** en tu dashboard de Supabase
2. Copia y pega el contenido de:
   ```
   supabase/migrations/20251230_fix_comercial_orders_schema.sql
   ```
3. Ejecuta el script (Ctrl+Enter o botón "Run")
4. Verifica que aparezcan los mensajes de éxito

### Opción 2: Ejecutar localmente con Supabase CLI

```bash
cd c:/Users/Usuari/Documents/GitHub/MainV2/v3/egea-Main-control
supabase db push
```

## Verificación Post-Migración

Después de ejecutar el script, verifica que:

1. La tabla se llama `comercial_orders`:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'comercial_orders';
   ```

2. Todas las columnas existen:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'comercial_orders'
   ORDER BY ordinal_position;
   ```

3. Prueba crear/editar un pedido en la aplicación

## Compatibilidad Legacy

El script mantiene **ambas columnas** (`region` y `delivery_region`) para:
- ✅ Compatibilidad con código legacy que usa `region`
- ✅ Migración gradual a `delivery_region`
- ✅ Fallback automático en el código TypeScript

El código TypeScript ya maneja esto correctamente:
```typescript
const regionValue = order.delivery_region || order.region;
```

## Próximos Pasos (Opcional)

Después de confirmar que todo funciona:

1. **Deprecar `region`**: Migrar todo el código a usar solo `delivery_region`
2. **Eliminar columna legacy**: Después de 1-2 sprints, eliminar la columna `region`
3. **Actualizar tipos**: Remover `region` del tipo `CommercialOrder`

## Notas Técnicas

- ✅ El script es **idempotente** (se puede ejecutar múltiples veces sin errores)
- ✅ Usa **transacciones** (BEGIN/COMMIT) para atomicidad
- ✅ Incluye **verificaciones** antes de cada cambio
- ✅ Proporciona **mensajes informativos** durante la ejecución
