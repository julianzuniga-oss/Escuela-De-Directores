-- ============================================================
-- Escuela de Directores — Migración v2
-- Agrega: lienzos libres (canvas_maps), puntos por sesión (scores)
-- y desbloqueo de sesiones (session_settings).
-- Ejecutar en Supabase > SQL Editor DESPUÉS de supabase-schema.sql.
--
-- >>> ANTES DE EJECUTAR: reemplaza TU_CORREO_ADMIN@ejemplo.com
-- (aparece 2 veces al final) por el correo EXACTO del usuario
-- administrador creado en Authentication > Users.
-- Es seguro ejecutarlo más de una vez.
-- ============================================================

create table if not exists canvas_maps (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session int not null,
  version text not null default 'unico',
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session_number int not null,
  points int not null default 0,
  completed boolean not null default false,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (participant_id, session_number)
);
alter table scores add column if not exists detail jsonb default '{}'::jsonb;

create table if not exists session_settings (
  id uuid primary key default gen_random_uuid(),
  session_number int not null unique,
  unlocked boolean not null default false,
  unlocked_at timestamptz
);

-- Sesiones 1 a 7 (bloqueadas por defecto) + fila 99 = "Escuela cerrada / ganador declarado"
insert into session_settings (session_number, unlocked)
select g, false from generate_series(1,7) g
on conflict (session_number) do nothing;
insert into session_settings (session_number, unlocked) values (99, false)
on conflict (session_number) do nothing;

alter table canvas_maps enable row level security;
alter table scores enable row level security;
alter table session_settings enable row level security;

drop policy if exists "canvas lectura" on canvas_maps;
drop policy if exists "canvas insert" on canvas_maps;
drop policy if exists "canvas update" on canvas_maps;
drop policy if exists "canvas delete" on canvas_maps;
create policy "canvas lectura" on canvas_maps for select using (true);
create policy "canvas insert" on canvas_maps for insert with check (true);
create policy "canvas update" on canvas_maps for update using (true);
create policy "canvas delete" on canvas_maps for delete using (true);

drop policy if exists "scores lectura" on scores;
drop policy if exists "scores insert" on scores;
drop policy if exists "scores update" on scores;
create policy "scores lectura" on scores for select using (true);
create policy "scores insert" on scores for insert with check (true);
create policy "scores update" on scores for update using (true);

-- Todos pueden LEER qué sesiones están habilitadas...
drop policy if exists "ajustes lectura" on session_settings;
create policy "ajustes lectura" on session_settings for select using (true);

-- ...pero SOLO el administrador puede cambiarlas.
drop policy if exists "admin escribe ajustes" on session_settings;
create policy "admin escribe ajustes" on session_settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@ejemplo.com')
  with check ((auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@ejemplo.com');
