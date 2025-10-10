-- =====================================================================
-- MIGRACIÓN: DATOS DE EJEMPLO (SEED DATA)
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Insertar datos de ejemplo para probar la aplicación
-- =====================================================================

BEGIN;

-- =====================================================================
-- INSERTAR USUARIOS DE EJEMPLO
-- =====================================================================

-- Administrador
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Administrador Sistema', 'admin@egea.com', '+34600111222', 'admin', 'activo');

-- Responsables
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'María García', 'maria.garcia@egea.com', '+34600223344', 'responsable', 'activo'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Juan Martínez', 'juan.martinez@egea.com', '+34600334455', 'responsable', 'activo');

-- Operarios
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Carlos López', 'carlos.lopez@egea.com', '+34600445566', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'Ana Rodríguez', 'ana.rodriguez@egea.com', '+34600556677', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'Pedro Sánchez', 'pedro.sanchez@egea.com', '+34600667788', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'Laura Fernández', 'laura.fernandez@egea.com', '+34600778899', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Miguel Torres', 'miguel.torres@egea.com', '+34600889900', 'operario', 'vacaciones'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', 'Sofía Jiménez', 'sofia.jimenez@egea.com', '+34600990011', 'operario', 'baja');

-- =====================================================================
-- INSERTAR VEHÍCULOS DE EJEMPLO
-- =====================================================================

INSERT INTO public.vehicles (id, name, type, license_plate, capacity, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Jumper 1', 'jumper', '1234-ABC', 2, true),
('660e8400-e29b-41d4-a716-446655440002', 'Jumper 2', 'jumper', '5678-DEF', 2, true),
('660e8400-e29b-41d4-a716-446655440003', 'Camión Grande', 'camion', '9012-GHI', 3, true),
('660e8400-e29b-41d4-a716-446655440004', 'Furgoneta Pequeña', 'furgoneta', '3456-JKL', 1, true),
('660e8400-e29b-41d4-a716-446655440005', 'Furgoneta Mediana', 'furgoneta', '7890-MNO', 2, false),
('660e8400-e29b-41d4-a716-446655440006', 'Vehículo Auxiliar', 'otro', '2468-PQR', 1, true);

-- =====================================================================
-- INSERTAR PLANTILLAS DE EJEMPLO
-- =====================================================================

-- Plantilla para Instalaciones
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Instalación Estándar', 'instalacion', 'Instalaciones', 
'[{"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "direccion", "label": "Dirección", "type": "text"}, {"name": "telefono", "label": "Teléfono", "type": "text"}, {"name": "producto", "label": "Producto", "type": "text"}, {"name": "cantidad", "label": "Cantidad", "type": "number"}, {"name": "notas", "label": "Notas", "type": "text"}]');

-- Plantilla para Confección
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440002', 'Parte de Confección', 'confeccion', 'Confección',
'[{"name": "pedido", "label": "Número de Pedido", "type": "text"}, {"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "prenda", "label": "Prenda", "type": "text"}, {"name": "talla", "label": "Talla", "type": "text"}, {"name": "cantidad", "label": "Cantidad", "type": "number"}, {"name": "fecha_entrega", "label": "Fecha Entrega", "type": "date"}, {"name": "observaciones", "label": "Observaciones", "type": "text"}]');

-- Plantilla para Tapicería
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440003', 'Trabajo de Tapicería', 'tapiceria', 'Tapicería',
'[{"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "mueble", "label": "Tipo de Mueble", "type": "text"}, {"name": "tela", "label": "Tela", "type": "text"}, {"name": "color", "label": "Color", "type": "text"}, {"name": "medidas", "label": "Medidas", "type": "text"}, {"name": "presupuesto", "label": "Presupuesto", "type": "number"}, {"name": "notas", "label": "Notas", "type": "text"}]');

-- =====================================================================
-- INSERTAR PANTALLAS DE EJEMPLO
-- =====================================================================

-- Pantallas de Instalaciones
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Instalaciones Pendientes', 'data', 'Instalaciones', '770e8400-e29b-41d4-a716-446655440001', 30, true),
('880e8400-e29b-41d4-a716-446655440002', 'Instalaciones Completadas', 'data', 'Instalaciones', '770e8400-e29b-41d4-a716-446655440001', 60, true),
('880e8400-e29b-41d4-a716-446655440003', 'Display Instalaciones', 'display', 'Instalaciones', NULL, 15, true);

-- Pantallas de Confección
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, next_screen_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440004', 'Confección en Progreso', 'data', 'Confección', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440005', 30, true),
('880e8400-e29b-41d4-a716-446655440005', 'Confección Completada', 'data', 'Confección', '770e8400-e29b-41d4-a716-446655440002', NULL, 60, true),
('880e8400-e29b-41d4-a716-446655440006', 'Display Confección', 'display', 'Confección', NULL, NULL, 20, true);

-- Pantallas de Tapicería
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440007', 'Tapicería Activa', 'data', 'Tapicería', '770e8400-e29b-41d4-a716-446655440003', 45, true),
('880e8400-e29b-41d4-a716-446655440008', 'Display Tapicería', 'display', 'Tapicería', NULL, 25, true);

-- =====================================================================
-- INSERTAR GRUPOS DE EJEMPLO
-- =====================================================================

INSERT INTO public.groups (id, name, color, description, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'Equipo Instalaciones', '#3B82F6', 'Equipo especializado en instalaciones', '550e8400-e29b-41d4-a716-446655440002'),
('990e8400-e29b-41d4-a716-446655440002', 'Equipo Confección', '#10B981', 'Equipo especializado en confección', '550e8400-e29b-41d4-a716-446655440002'),
('990e8400-e29b-41d4-a716-446655440003', 'Equipo Tapicería', '#F59E0B', 'Equipo especializado en tapicería', '550e8400-e29b-41d4-a716-446655440003');

-- =====================================================================
-- ASIGNAR USUARIOS A GRUPOS
-- =====================================================================

-- Equipo Instalaciones
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'líder'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 'miembro'),
('550e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440001', 'miembro');

-- Equipo Confección
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', 'líder'),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002', 'miembro'),
('550e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440002', 'miembro');

-- Equipo Tapicería
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', 'líder'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440003', 'miembro');

-- =====================================================================
-- INSERTAR TAREAS DE EJEMPLO
-- =====================================================================

-- Tareas de Instalaciones (hoy y próximos días)
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Empresa ABC", "direccion": "Calle Principal 123, Madrid", "telefono": "912345678", "producto": "Sistema de aire acondicionado", "cantidad": 3, "notas": "Instalación en planta baja"}', 
'pendiente', 'pendiente', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 'Madrid', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 1),

('110e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Tienda XYZ", "direccion": "Avenida Comercial 456, Barcelona", "telefono": "933456789", "producto": "Cámaras de seguridad", "cantidad": 8, "notas": "Requiere instalación en altura"}', 
'urgente', 'pendiente', CURRENT_DATE, CURRENT_DATE, 'Barcelona', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 2),

('110e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Restaurante Buen Sabor", "direccion": "Calle de la comida 789, Valencia", "telefono": "964567890", "producto": "Sistema de extracción", "cantidad": 1, "notas": "Instalación industrial"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'Valencia', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 3),

('110e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Oficina Central", "direccion": "Plaza Mayor 1, Madrid", "telefono": "915678901", "producto": "Red de datos", "cantidad": 15, "notas": "Instalación en horario nocturno"}', 
'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 'Madrid', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 4),

('110e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Hotel Sol y Playa", "direccion": "Avenida del Mar 234, Alicante", "telefono": "965678912", "producto": "Televisores Smart TV", "cantidad": 20, "notas": "Instalación en 50 habitaciones"}', 
'pendiente', 'pendiente', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '4 days', 'Alicante', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 5);

-- Tareas de Confección
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-001", "cliente": "Moda Fashion SL", "prenda": "Vestido elegante", "talla": "M", "cantidad": 50, "fecha_entrega": "2024-10-15", "observaciones": "Talla especial, requiere cuidado extra"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', 'Taller Confección', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 1),

('110e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-002", "cliente": "Ropa Deportiva SA", "prenda": "Camiseta técnica", "talla": "L", "cantidad": 100, "fecha_entrega": "2024-10-12", "observaciones": "Material transpirable"}', 
'urgente', 'en progreso', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'Taller Confección', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440007', 2),

('110e8400-e29b-41d4-a716-446655440008', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-003", "cliente": "Uniformes Escolares", "prenda": "Blusa escolar", "talla": "S", "cantidad": 200, "fecha_entrega": "2024-10-20", "observaciones": "Colores institucionales"}', 
'pendiente', 'pendiente', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'Taller Confección', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 3);

-- Tareas de Tapicería
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440009', '880e8400-e29b-41d4-a716-446655440007', 
'{"cliente": "Restaurante Lujo", "mueble": "Sillas de comedor", "tela": "Cuero premium", "color": "Marrón oscuro", "medidas": "45x45x80 cm", "presupuesto": 2500, "notas": "12 sillas, restauración completa"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 'Taller Tapicería', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 1),

('110e8400-e29b-41d4-a716-446655440010', '880e8400-e29b-41d4-a716-446655440007', 
'{"cliente": "Hotel Boutique", "mueble": "Sofá suite", "tela": "Tela antimanchas", "color": "Gris perla", "medidas": "200x90x85 cm", "presupuesto": 1800, "notas": "5 sofás, diseño moderno"}', 
'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 'Taller Tapicería', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 2);

-- =====================================================================
-- ASIGNAR PERFILES A TAREAS
-- =====================================================================

-- Asignaciones para tareas de instalación
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005'),
('110e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006'),
('110e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005'),
('110e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006');

-- Asignaciones para tareas de confección
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006'),
('110e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007'),
('110e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006');

-- Asignaciones para tareas de tapicería
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004');

-- =====================================================================
-- ASIGNAR VEHÍCULOS A TAREAS
-- =====================================================================

INSERT INTO public.task_vehicles (task_id, vehicle_id) VALUES
('110e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002'),
('110e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003'),
('110e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004');

-- =====================================================================
-- INSERTAR DISPONIBILIDAD DE USUARIOS
-- =====================================================================

INSERT INTO public.user_availability (profile_id, start_date, end_date, status, notes) VALUES
('550e8400-e29b-41d4-a716-446655440008', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'vacaciones', 'Vacaciones programadas'),
('550e8400-e29b-41d4-a716-446655440009', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', 'no disponible', 'Baja médica');

-- =====================================================================
-- INSERTAR CONFIGURACIÓN DEL SISTEMA
-- =====================================================================

INSERT INTO public.system_config (key, value, description) VALUES
('company_name', '"Egea Productivity Solutions"', 'Nombre de la empresa'),
('default_timezone', '"Europe/Madrid"', 'Zona horaria por defecto'),
('auto_archive_days', '7', 'Días para archivar tareas completadas automáticamente'),
('notification_email', '"notifications@egea.com"', 'Email para notificaciones del sistema'),
('max_tasks_per_day', '10', 'Número máximo de tareas por día por operario'),
('working_hours_start', '"08:00"', 'Hora de inicio del trabajo'),
('working_hours_end', '"18:00"', 'Hora de fin del trabajo');

-- =====================================================================
-- INSERTAR PERMISOS POR ROL
-- =====================================================================

-- Permisos para admin
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('admin', 'dashboard', 'view', true),
('admin', 'dashboard', 'create', true),
('admin', 'dashboard', 'edit', true),
('admin', 'dashboard', 'delete', true),
('admin', 'users', 'view', true),
('admin', 'users', 'create', true),
('admin', 'users', 'edit', true),
('admin', 'users', 'delete', true),
('admin', 'vehicles', 'view', true),
('admin', 'vehicles', 'create', true),
('admin', 'vehicles', 'edit', true),
('admin', 'vehicles', 'delete', true),
('admin', 'installations', 'view', true),
('admin', 'installations', 'create', true),
('admin', 'installations', 'edit', true),
('admin', 'installations', 'delete', true),
('admin', 'templates', 'view', true),
('admin', 'templates', 'create', true),
('admin', 'templates', 'edit', true),
('admin', 'templates', 'delete', true),
('admin', 'screens', 'view', true),
('admin', 'screens', 'create', true),
('admin', 'screens', 'edit', true),
('admin', 'screens', 'delete', true),
('admin', 'communications', 'view', true),
('admin', 'communications', 'create', true),
('admin', 'communications', 'edit', true),
('admin', 'communications', 'delete', true),
('admin', 'archive', 'view', true),
('admin', 'archive', 'create', true),
('admin', 'archive', 'edit', true),
('admin', 'archive', 'delete', true);

-- Permisos para manager
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('manager', 'dashboard', 'view', true),
('manager', 'dashboard', 'create', true),
('manager', 'dashboard', 'edit', true),
('manager', 'dashboard', 'delete', true),
('manager', 'users', 'view', true),
('manager', 'users', 'create', true),
('manager', 'users', 'edit', true),
('manager', 'vehicles', 'view', true),
('manager', 'vehicles', 'create', true),
('manager', 'vehicles', 'edit', true),
('manager', 'vehicles', 'delete', true),
('manager', 'installations', 'view', true),
('manager', 'installations', 'create', true),
('manager', 'installations', 'edit', true),
('manager', 'installations', 'delete', true),
('manager', 'templates', 'view', true),
('manager', 'templates', 'create', true),
('manager', 'templates', 'edit', true),
('manager', 'templates', 'delete', true),
('manager', 'screens', 'view', true),
('manager', 'screens', 'create', true),
('manager', 'screens', 'edit', true),
('manager', 'screens', 'delete', true),
('manager', 'communications', 'view', true),
('manager', 'communications', 'create', true),
('manager', 'communications', 'edit', true),
('manager', 'communications', 'delete', true),
('manager', 'archive', 'view', true),
('manager', 'archive', 'edit', true);

-- Permisos para responsable
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('responsable', 'dashboard', 'view', true),
('responsable', 'users', 'view', true),
('responsable', 'vehicles', 'view', true),
('responsable', 'vehicles', 'create', true),
('responsable', 'vehicles', 'edit', true),
('responsable', 'installations', 'view', true),
('responsable', 'installations', 'create', true),
('responsable', 'installations', 'edit', true),
('responsable', 'templates', 'view', true),
('responsable', 'screens', 'view', true),
('responsable', 'communications', 'view', true),
('responsable', 'communications', 'create', true),
('responsable', 'communications', 'edit', true),
('responsable', 'archive', 'view', true);

-- Permisos para operario
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('operario', 'dashboard', 'view', true),
('operario', 'vehicles', 'view', true),
('operario', 'installations', 'view', true),
('operario', 'screens', 'view', true),
('operario', 'communications', 'view', true),
('operario', 'communications', 'create', true),
('operario', 'communications', 'edit', true);

-- =====================================================================
-- INSERTAR ALGUNAS TAREAS ARCHIVADAS DE EJEMPLO
-- =====================================================================

INSERT INTO public.archived_tasks (id, archived_at, data, status, state, start_date, end_date, location, responsible_profile_id, responsible_name, assigned_users, assigned_vehicles) VALUES
('990e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '5 days', 
'{"cliente": "Cliente Antiguo", "direccion": "Calle Vieja 123", "telefono": "911111111", "producto": "Producto antiguo", "cantidad": 1, "notas": "Tarea completada"}', 
'acabado', 'terminado', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '5 days', 'Madrid', '550e8400-e29b-41d4-a716-446655440004', 'Carlos López', 
'[{"id": "550e8400-e29b-41d4-a716-446655440004", "full_name": "Carlos López", "email": "carlos.lopez@egea.com"}]', 
'[{"id": "660e8400-e29b-41d4-a716-446655440001", "name": "Jumper 1", "type": "jumper"}]');

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta migración inserta datos realistas para probar la aplicación
-- 2. Incluye usuarios con diferentes roles y estados
-- 3. Crea tareas en diferentes estados y fechas
-- 4. Establece relaciones realistas entre perfiles, grupos y tareas
-- 5. Configura permisos básicos por rol
-- 6. Los datos son suficientes para probar todas las funcionalidades
-- =====================================================================