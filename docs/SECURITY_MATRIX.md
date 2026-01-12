# 🔐 Matriz de Permisos y Seguridad

**Fecha**: 12 de enero de 2026  
**Versión**: 2.0 Final

---

## 📋 Roles del Sistema

El sistema implementa **6 roles** con diferentes niveles de acceso:

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| `admin` | 5 | Acceso total al sistema |
| `manager` | 4 | Gestión de operaciones y equipos |
| `responsable` | 3 | Supervisión de instalaciones |
| `jefe_almacen` | 2 | Gestión de almacén y logística |
| `operario_almacen` | 1 | Operaciones de almacén |
| `operario` | 1 | Ejecución de tareas de campo |

---

## 🗺️ Matriz de Permisos por Página

### Módulo: Dashboard

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Dashboard Principal | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ❌ | ❌ | ❌ |
| Estadísticas | ✅ Ver | ✅ Ver | ✅ Ver | ❌ | ❌ | ❌ |
| Calendario Global | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ❌ | ❌ | ❌ |

### Módulo: Instalaciones

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Lista de Tareas | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver/Editar | ❌ | ❌ | ✅ Ver propias |
| Crear Tarea | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar Tarea | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar Tarea | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar Operarios | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Asignar Vehículos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Calendario | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver/Editar | ❌ | ❌ | ✅ Ver |

### Módulo: Comercial

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Lista de Pedidos | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ❌ | ❌ | ❌ |
| Crear Pedido | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar Pedido | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar Pedido | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Validar Pedido | ✅ Override | ✅ Override | ❌ | ❌ | ❌ | ❌ |
| Subir Documentos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver Documentos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Módulo: Producción

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Órdenes de Trabajo | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ❌ | ❌ | ❌ |
| Crear Orden | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar Operario | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Control de Calidad | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Finalizar Producción | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Módulo: Almacén/Logística

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Lista de Envíos | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ✅ Ver/Editar | ✅ Ver | ❌ |
| Escanear Bultos | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Introducir Tracking | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Confirmar Envío | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Gestión de Stock | ✅ | ✅ | ❌ | ✅ | ✅ Ver | ❌ |

### Módulo: Usuarios

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Lista de Usuarios | ✅ Ver/Editar | ✅ Ver | ✅ Ver | ❌ | ❌ | ❌ |
| Crear Usuario | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar Usuario | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar Usuario | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar Rol | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar Permisos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Módulo: Configuración

| Página | Admin | Manager | Responsable | Jefe Almacén | Operario Almacén | Operario |
|--------|-------|---------|-------------|--------------|------------------|----------|
| Configuración General | ✅ Ver/Editar | ❌ | ❌ | ❌ | ❌ | ❌ |
| Vehículos | ✅ Ver/Editar | ✅ Ver/Editar | ✅ Ver | ❌ | ❌ | ❌ |
| Plantillas | ✅ Ver/Editar | ✅ Ver/Editar | ❌ | ❌ | ❌ | ❌ |
| Pantallas | ✅ Ver/Editar | ✅ Ver/Editar | ❌ | ❌ | ❌ | ❌ |

---

## 🔒 Políticas RLS por Tabla

### MAIN Database

#### `profiles`
```sql
-- Usuarios pueden ver su propio perfil
CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

-- Admins pueden gestionar todos los perfiles
CREATE POLICY "admins_manage_profiles" ON profiles
  FOR ALL USING (public.is_admin());
```

#### `screen_data` (Tareas)
```sql
-- Todos pueden ver tareas de pantallas activas
CREATE POLICY "view_active_tasks" ON screen_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM screens WHERE id = screen_id AND is_active = true)
  );

-- Managers pueden gestionar tareas
CREATE POLICY "managers_manage_tasks" ON screen_data
  FOR ALL USING (public.is_manager_or_admin());
```

#### `vehicles`
```sql
-- Todos autenticados pueden ver vehículos
CREATE POLICY "authenticated_view_vehicles" ON vehicles
  FOR SELECT USING (true);

-- Solo managers pueden editar vehículos
CREATE POLICY "managers_manage_vehicles" ON vehicles
  FOR ALL USING (public.is_manager_or_admin());
```

### PRODUCTIVITY Database

#### `comercial_orders`
```sql
-- Todos autenticados pueden ver pedidos
CREATE POLICY "authenticated_view_orders" ON comercial_orders
  FOR SELECT USING (true);

-- Admins/Managers pueden gestionar pedidos
CREATE POLICY "managers_manage_orders" ON comercial_orders
  FOR INSERT WITH CHECK (public.is_manager_or_admin());

CREATE POLICY "managers_update_orders" ON comercial_orders
  FOR UPDATE USING (public.is_manager_or_admin());
```

#### `produccion_work_orders`
```sql
-- Todos autenticados pueden ver órdenes
CREATE POLICY "authenticated_view_work_orders" ON produccion_work_orders
  FOR SELECT USING (true);

-- Managers pueden gestionar órdenes
CREATE POLICY "managers_manage_work_orders" ON produccion_work_orders
  FOR ALL USING (public.is_manager_or_admin());
```

#### `logistics`
```sql
-- Jefes de almacén y superiores pueden ver
CREATE POLICY "warehouse_view_logistics" ON logistics
  FOR SELECT USING (
    public.is_manager_or_admin() OR 
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('jefe_almacen', 'operario_almacen'))
  );

-- Solo jefes de almacén pueden confirmar envíos
CREATE POLICY "warehouse_chief_manage_logistics" ON logistics
  FOR ALL USING (
    public.is_manager_or_admin() OR 
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'jefe_almacen')
  );
```

---

## 🛡️ Funciones Helper de Seguridad

### `is_admin()`
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### `is_manager_or_admin()`
```sql
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### `is_warehouse_staff()`
```sql
CREATE OR REPLACE FUNCTION public.is_warehouse_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'jefe_almacen', 'operario_almacen')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 🔑 Permisos Especiales

### Override de Admin (Comercial)
- **Quién**: Solo `admin` y `manager`
- **Qué**: Forzar validación de pedidos incompletos
- **Cómo**: Confirmación obligatoria + comentario
- **Trazabilidad**: Prefijo `[OVERRIDE ADMIN]` en logs

### Gestión de Usuarios
- **Quién**: Solo `admin`
- **Qué**: Crear, editar, eliminar usuarios y cambiar roles
- **Restricción**: No se puede auto-degradar de admin

### Eliminación de Pedidos
- **Quién**: Solo `admin` y `manager`
- **Qué**: Eliminar pedidos del sistema
- **Restricción**: Solo pedidos en estado `PENDIENTE_PAGO` o `CANCELADO`

---

## ✅ Checklist de Seguridad

- [x] RLS habilitado en todas las tablas
- [x] Políticas definidas por rol
- [x] Funciones helper sin recursión
- [x] Trigger de creación automática de perfil
- [x] Override de admin con trazabilidad
- [x] Permisos granulares por página
- [ ] Auditoría de accesos (pendiente)
- [ ] Rate limiting (pendiente)
- [ ] 2FA para admins (pendiente)

---

## 🚨 Recomendaciones de Seguridad

### Producción
1. ✅ **Refinar políticas RLS** en PRODUCTIVITY por rol específico
2. ✅ **Implementar auditoría** de acciones críticas
3. ✅ **Habilitar 2FA** para usuarios admin
4. ✅ **Configurar rate limiting** en Supabase
5. ✅ **Revisar logs** periódicamente

### Desarrollo
1. ✅ **Nunca compartir** claves de Supabase
2. ✅ **Usar variables de entorno** para credenciales
3. ✅ **Probar políticas RLS** antes de deployment
4. ✅ **Documentar cambios** en permisos

---

**Última actualización**: 12 de enero de 2026
