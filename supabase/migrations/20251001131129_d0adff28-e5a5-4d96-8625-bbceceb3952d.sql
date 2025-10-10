-- Enable pgcrypto extension for UUID generation
create extension if not exists pgcrypto;

-- Create templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  template_type text not null,
  fields jsonb not null
);

-- Create screens table
create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  is_active boolean default true,
  refresh_interval_sec integer default 30,
  template_id uuid references public.templates(id) on delete set null
);

-- Create screen_data table
create table if not exists public.screen_data (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  screen_id uuid references public.screens(id) on delete cascade,
  data jsonb not null
);

-- Enable Row Level Security
alter table public.templates enable row level security;
alter table public.screens enable row level security;
alter table public.screen_data enable row level security;

-- RLS Policies for templates
create policy "Templates are viewable by authenticated users"
  on public.templates for select
  to authenticated
  using (true);

create policy "Templates are insertable by authenticated users"
  on public.templates for insert
  to authenticated
  with check (true);

create policy "Templates are updatable by authenticated users"
  on public.templates for update
  to authenticated
  using (true);

create policy "Templates are deletable by authenticated users"
  on public.templates for delete
  to authenticated
  using (true);

-- RLS Policies for screens
create policy "Screens are viewable by everyone"
  on public.screens for select
  to anon, authenticated
  using (true);

create policy "Screens are insertable by authenticated users"
  on public.screens for insert
  to authenticated
  with check (true);

create policy "Screens are updatable by authenticated users"
  on public.screens for update
  to authenticated
  using (true);

create policy "Screens are deletable by authenticated users"
  on public.screens for delete
  to authenticated
  using (true);

-- RLS Policies for screen_data
create policy "Screen data is viewable by everyone"
  on public.screen_data for select
  to anon, authenticated
  using (true);

create policy "Screen data is insertable by authenticated users"
  on public.screen_data for insert
  to authenticated
  with check (true);

create policy "Screen data is updatable by authenticated users"
  on public.screen_data for update
  to authenticated
  using (true);

create policy "Screen data is deletable by authenticated users"
  on public.screen_data for delete
  to authenticated
  using (true);