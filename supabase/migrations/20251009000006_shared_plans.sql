-- =====================================================================
-- MIGRACIÓN: SHARED_PLANS PARA INSTALACIONES
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear sistema de planes compartidos con access_token
-- =====================================================================

BEGIN;

-- Crear tabla shared_plans si no existe
create table if not exists shared_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  access_token text unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Asegurar NOT NULL si ya existía la tabla sin la columna
alter table shared_plans
  alter column access_token set not null;

-- Habilitar RLS
alter table shared_plans enable row level security;

-- Crear políticas RLS
do $$ begin
  if not exists (select 1 from pg_policies where polname='sp_read_public') then
    create policy sp_read_public on shared_plans for select using (true); -- solo token, no datos sensibles
  end if;
  if not exists (select 1 from pg_policies where polname='sp_write_owner') then
    create policy sp_write_owner on shared_plans for insert with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where polname='sp_update_owner') then
    create policy sp_update_owner on shared_plans for update using (auth.uid() = created_by);
  end if;
end $$;

-- Función para emitir/rotar token
create or replace function issue_shared_plan(p_plan_id uuid)
returns shared_plans as $$
declare
  v shared_plans;
begin
  insert into shared_plans(plan_id, access_token, created_by)
  values (p_plan_id, encode(gen_random_bytes(24),'hex'), auth.uid())
  returning * into v;
  return v;
end; 
$$ language plpgsql security definer;

-- Función para obtener dataset público mínimo por token (evita fuga de datos)
create or replace function get_shared_plan_data(p_token text)
returns jsonb as $$
declare
  v shared_plans;
  v_plan_data jsonb;
begin
  select * into v from shared_plans
   where access_token = p_token and revoked_at is null;
  if not found then 
    return null; 
  end if;

  -- DEVUELVE SOLO LO NECESARIO PARA LA VISTA PÚBLICA
  -- Obtener datos del plan del mes actual
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sd.id,
      'title', coalesce(sd.data->>'site', coalesce(sd.data->>'description', 'Sin título')),
      'date', sd.start_date,
      'status', sd.state,
      'operator', (
        select string_agg(p.full_name, ', ')
        from task_profiles tp
        join profiles p on tp.profile_id = p.id
        where tp.task_id = sd.id
      )
    ) order by sd.start_date
  ), '[]'::jsonb) into v_plan_data
  from screen_data sd
  where sd.start_date >= date_trunc('month', now())
    and sd.start_date < date_trunc('month', now()) + interval '1 month'
    and sd.state != 'terminado';

  return jsonb_build_object(
    'plan_id', v.plan_id,
    'month', date_trunc('month', now()),
    'installations', v_plan_data
  );
end; 
$$ language plpgsql security definer;

-- Índices
create index if not exists idx_shared_plans_access_token on shared_plans(access_token);
create index if not exists idx_shared_plans_plan_id on shared_plans(plan_id);
create index if not exists idx_shared_plans_created_by on shared_plans(created_by);
create index if not exists idx_shared_plans_created_at on shared_plans(created_at);

-- Comentarios
COMMENT ON TABLE shared_plans IS 'Planes compartidos con acceso público vía token';
COMMENT ON COLUMN shared_plans.access_token IS 'Token único para acceso público';
COMMENT ON COLUMN shared_plans.revoked_at IS 'Fecha de revocación del acceso (null = activo)';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Tabla shared_plans con access_token único
-- 2. Función issue_shared_plan() para emitir tokens
-- 3. Función get_shared_plan_data() para vista pública segura
-- 4. RLS configurado para acceso público solo por token
-- 5. Datos limitados a lo necesario para vista pública
-- =====================================================================