# 🧪 Plan de Verificación y Testing

**Fecha**: 12 de enero de 2026  
**Versión**: 1.0

---

## 📋 Casos de Prueba

### 1. Autenticación y Roles

#### TC-001: Login de Usuario
**Objetivo**: Verificar que el login funciona correctamente

**Pasos**:
1. Ir a `/auth`
2. Introducir credenciales válidas
3. Click en "Iniciar Sesión"

**Resultado Esperado**:
- ✅ Usuario autenticado
- ✅ Redirigido según rol
- ✅ Perfil cargado correctamente

**Roles a probar**:
- [ ] Admin
- [ ] Manager
- [ ] Responsable
- [ ] Jefe Almacén
- [ ] Operario Almacén
- [ ] Operario

---

#### TC-002: Permisos por Rol
**Objetivo**: Verificar que cada rol ve solo sus páginas permitidas

**Pasos**:
1. Login con cada rol
2. Verificar menú de navegación
3. Intentar acceder a páginas restringidas

**Resultado Esperado**:
- ✅ Admin: Ve todas las páginas
- ✅ Operario: Solo ve Workday y sus tareas
- ✅ Acceso denegado a páginas no permitidas

---

### 2. Módulo Comercial

#### TC-003: Crear Pedido
**Objetivo**: Verificar creación de pedido

**Pasos**:
1. Login como Admin/Manager
2. Ir a `/commercial`
3. Click en "Nuevo pedido"
4. Seleccionar "Generar pedido"

**Resultado Esperado**:
- ✅ Pedido creado con estado `PENDIENTE_PAGO`
- ✅ Número de pedido generado (INT-YY-XXX)
- ✅ Aparece en lista de pedidos activos

---

#### TC-004: Validación Normal (Completo)
**Objetivo**: Verificar validación cuando el pedido cumple todos los requisitos

**Precondiciones**:
- Pedido con `admin_code` completado
- Presupuesto subido
- Pedido aceptado subido
- Líneas de medidas agregadas
- Todos los campos obligatorios completados

**Pasos**:
1. Abrir pedido completo
2. Introducir comentario en campo de nota
3. Click en "VALIDAR"

**Resultado Esperado**:
- ✅ Pedido pasa a estado `PAGADO`
- ✅ Comentario registrado en `order_activity`
- ✅ Sin prefijo `[OVERRIDE ADMIN]`

---

#### TC-005: Validación Bloqueada (Usuario Normal)
**Objetivo**: Verificar que usuarios normales no pueden forzar validación

**Precondiciones**:
- Login como Responsable (no admin/manager)
- Pedido incompleto (falta presupuesto)

**Pasos**:
1. Abrir pedido incompleto
2. Introducir comentario
3. Click en "VALIDAR"

**Resultado Esperado**:
- ❌ Error: "NO SE PUEDE ENVIAR A PRODUCCIÓN"
- ❌ Mensaje específico de qué falta
- ❌ Pedido permanece en `PENDIENTE_PAGO`

---

#### TC-006: Override de Admin (Crítico)
**Objetivo**: Verificar que admin/manager puede forzar validación

**Precondiciones**:
- Login como Admin o Manager
- Pedido incompleto (falta presupuesto)

**Pasos**:
1. Abrir pedido incompleto
2. Introducir comentario: "Cliente urgente, validar sin presupuesto"
3. Click en "VALIDAR"
4. Aparece confirm con advertencia
5. Click en "Aceptar"

**Resultado Esperado**:
- ✅ Confirm muestra error específico
- ✅ Pedido pasa a `PAGADO`
- ✅ Comentario con prefijo `[OVERRIDE ADMIN]`
- ✅ Toast: "Pedido forzado a producción (override admin)"
- ✅ Registro en `order_activity`

**Verificación en BD**:
```sql
SELECT * FROM order_activity 
WHERE order_id = 'uuid-del-pedido' 
AND comment LIKE '[OVERRIDE ADMIN]%';
```

---

#### TC-007: Override Cancelado
**Objetivo**: Verificar que se puede cancelar el override

**Pasos**:
1. Login como Admin
2. Pedido incompleto
3. Click en "VALIDAR"
4. Aparece confirm
5. Click en "Cancelar"

**Resultado Esperado**:
- ❌ Pedido permanece en `PENDIENTE_PAGO`
- ❌ No se registra nada en `order_activity`

---

### 3. Módulo de Producción

#### TC-008: Crear Orden de Trabajo
**Objetivo**: Verificar creación desde pedido comercial

**Pasos**:
1. Pedido en estado `PAGADO`
2. Sistema crea orden de trabajo automáticamente
3. Verificar en módulo de producción

**Resultado Esperado**:
- ✅ Orden creada con número WO-YY-XXX
- ✅ Vinculada a pedido comercial
- ✅ Estado inicial `PENDIENTE`

---

#### TC-009: Flag de Urgencia
**Objetivo**: Verificar que se marca urgencia si faltan ≤ 2 días

**Precondiciones**:
- Orden de trabajo con `delivery_date` en 2 días o menos

**Pasos**:
1. Finalizar producción
2. Sistema calcula días hasta entrega
3. Verificar flag `needs_shipping_validation`

**Resultado Esperado**:
- ✅ Si ≤ 2 días: `needs_shipping_validation = true`
- ✅ Si > 2 días: `needs_shipping_validation = false`

---

### 4. Módulo de Almacén

#### TC-010: Escaneo de Bultos
**Objetivo**: Verificar escaneo QR de bultos

**Precondiciones**:
- Pedido en `PTE_ENVIO`
- `packages_count = 3`

**Pasos**:
1. Escanear QR del bulto 1
2. Escanear QR del bulto 2
3. Escanear QR del bulto 3

**Resultado Esperado**:
- ✅ `scanned_packages` incrementa con cada escaneo
- ✅ Al completar: Botón de envío habilitado
- ✅ Toast: "Todos los bultos escaneados"

---

#### TC-011: Protección Anti-Mezcla
**Objetivo**: Verificar que no se pueden mezclar pedidos

**Pasos**:
1. Iniciar escaneo de pedido A (1 de 3 bultos)
2. Intentar escanear bulto de pedido B

**Resultado Esperado**:
- ❌ Error: "Termina de escanear el pedido actual primero"
- ❌ No se incrementa contador
- ❌ Pedido A sigue a medias

---

#### TC-012: Validación de Tracking
**Objetivo**: Verificar que tracking es obligatorio

**Pasos**:
1. Escanear todos los bultos
2. Dejar campo tracking vacío
3. Click en "Enviar"

**Resultado Esperado**:
- ❌ Error: "Introduce el número de seguimiento"
- ❌ Pedido no pasa a `ENVIADO`

---

### 5. Políticas RLS

#### TC-013: Operario ve solo sus tareas
**Objetivo**: Verificar RLS en instalaciones

**Pasos**:
1. Login como Operario
2. Ir a Workday
3. Verificar tareas visibles

**Resultado Esperado**:
- ✅ Solo ve tareas asignadas a él
- ❌ No ve tareas de otros operarios

**Verificación en BD**:
```sql
-- Como operario, solo debe ver sus tareas
SELECT * FROM screen_data 
WHERE id IN (
  SELECT task_id FROM task_profiles 
  WHERE profile_id = 'operario-uuid'
);
```

---

#### TC-014: Admin ve todo
**Objetivo**: Verificar que admin no tiene restricciones RLS

**Pasos**:
1. Login como Admin
2. Navegar por todos los módulos

**Resultado Esperado**:
- ✅ Ve todos los pedidos
- ✅ Ve todas las tareas
- ✅ Ve todos los usuarios

---

### 6. Flujo Completo End-to-End

#### TC-015: Flujo Completo de Pedido
**Objetivo**: Verificar flujo desde creación hasta entrega

**Pasos**:
1. **Comercial**: Crear pedido
2. **Comercial**: Completar datos y documentos
3. **Comercial**: Validar (auto o manual)
4. **Producción**: Crear orden de trabajo
5. **Producción**: Asignar operario
6. **Producción**: Finalizar producción
7. **Almacén**: Escanear bultos
8. **Almacén**: Introducir tracking
9. **Almacén**: Confirmar envío

**Resultado Esperado**:
- ✅ Estados: PENDIENTE_PAGO → PAGADO → EN_PROCESO → PTE_ENVIO → ENVIADO
- ✅ Todas las transiciones registradas
- ✅ Sin errores en consola

---

## 🔍 Checklist de Verificación

### Funcionalidad Core
- [ ] Login funciona para todos los roles
- [ ] Navegación muestra páginas según permisos
- [ ] Override de admin funciona correctamente
- [ ] Validación bloquea usuarios normales
- [ ] Escaneo QR funciona
- [ ] Tracking obligatorio funciona

### Seguridad
- [ ] RLS bloquea acceso no autorizado
- [ ] Operarios solo ven sus tareas
- [ ] Admins pueden gestionar todo
- [ ] Override deja trazabilidad

### Performance
- [ ] Carga de pedidos < 2s
- [ ] Carga de tareas < 2s
- [ ] Sin queries N+1
- [ ] Índices funcionando

### UI/UX
- [ ] Mensajes de error claros
- [ ] Toasts informativos
- [ ] Confirmaciones en acciones críticas
- [ ] Responsive en móvil

---

## 📝 Registro de Pruebas

| TC | Fecha | Probado por | Resultado | Notas |
|----|-------|-------------|-----------|-------|
| TC-001 | - | - | ⏸️ Pendiente | - |
| TC-002 | - | - | ⏸️ Pendiente | - |
| TC-003 | - | - | ⏸️ Pendiente | - |
| TC-004 | - | - | ⏸️ Pendiente | - |
| TC-005 | - | - | ⏸️ Pendiente | - |
| TC-006 | - | - | ⏸️ Pendiente | **CRÍTICO** |
| TC-007 | - | - | ⏸️ Pendiente | - |
| TC-008 | - | - | ⏸️ Pendiente | - |
| TC-009 | - | - | ⏸️ Pendiente | - |
| TC-010 | - | - | ⏸️ Pendiente | - |
| TC-011 | - | - | ⏸️ Pendiente | - |
| TC-012 | - | - | ⏸️ Pendiente | - |
| TC-013 | - | - | ⏸️ Pendiente | - |
| TC-014 | - | - | ⏸️ Pendiente | - |
| TC-015 | - | - | ⏸️ Pendiente | **E2E** |

---

## 🚨 Casos de Prueba Críticos

Los siguientes casos son **CRÍTICOS** y deben probarse antes de deployment:

1. **TC-006**: Override de Admin
2. **TC-013**: RLS de operarios
3. **TC-015**: Flujo completo E2E

---

**Última actualización**: 12 de enero de 2026
