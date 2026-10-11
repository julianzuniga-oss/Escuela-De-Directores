-- ============================================================================
-- ESCUELA DE DIRECTORES — ANEIAP ICESI
-- RESET COMPLETO DE LA BASE DE DATOS (versión 2)
--
-- !!! ESTE SCRIPT BORRA TODAS LAS TABLAS Y DATOS DE LA ESCUELA Y LOS CREA DE NUEVO !!!
--
-- Cómo usarlo (Supabase > SQL Editor > New query):
--   1. Reemplaza TU_CORREO_ADMIN@ejemplo.com (aparece 2 veces, al final)
--      por el correo del usuario administrador (el que creas en Authentication > Users).
--   2. Pega TODO este archivo y pulsa Run.
--   3. Debe terminar con "Success". Es la única ejecución necesaria.
--
-- No toca los usuarios de Authentication.
-- ============================================================================

-- ---------- 1. BORRAR TODO LO ANTERIOR (v1 y v2) ----------
drop table if exists final_projects        cascade;
drop table if exists leadership_profiles   cascade;
drop table if exists strategic_plans       cascade;
drop table if exists rankings              cascade;
drop table if exists evaluations           cascade;
drop table if exists structure_maps        cascade;
drop table if exists expectation_maps      cascade;
drop table if exists canvas_maps           cascade;
drop table if exists scores                cascade;
drop table if exists progress              cascade;
drop table if exists session_settings      cascade;
drop table if exists participants          cascade;

create extension if not exists "pgcrypto";

-- ---------- 2. TABLAS ----------
create table participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

create table progress (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session_number int not null,
  status text not null default 'no_iniciado',
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Lienzos libres: sesión 1 (mapa de expectativas) y sesión 2 (estructura inicial / final)
create table canvas_maps (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session int not null,
  version text not null default 'unico',
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Puntos por sesión (detail guarda los puntos de cada etapa)
create table scores (
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

-- Qué sesiones están habilitadas (1 a 7). La fila 99 = "Escuela cerrada / ganador declarado"
create table session_settings (
  id uuid primary key default gen_random_uuid(),
  session_number int not null unique,
  unlocked boolean not null default false,
  unlocked_at timestamptz
);

-- Resultados de los retos
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session int not null,
  answers jsonb,
  score int,
  total int,
  percentage int,
  time_seconds int,
  created_at timestamptz default now()
);

-- Sesión 6
create table strategic_plans (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  problem text,
  general_objective text,
  specific_objectives jsonb,
  actions jsonb,
  indicators jsonb,
  priority_matrix jsonb,
  created_at timestamptz default now()
);

-- Sesión 4
create table leadership_profiles (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  results jsonb,
  strengths jsonb,
  development_areas jsonb,
  created_at timestamptz default now()
);

-- Sesión 7
create table final_projects (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  role text,
  motivation text,
  diagnosis text,
  objective text,
  actions jsonb,
  value_proposition text,
  risks text,
  first_90_days jsonb,
  reflection text,
  created_at timestamptz default now()
);

-- ---------- 3. SESIONES INICIALES (todas bloqueadas) ----------
insert into session_settings (session_number, unlocked)
select g, false from generate_series(1,7) g;
insert into session_settings (session_number, unlocked) values (99, false);

-- ---------- 4. SEGURIDAD (Row Level Security) ----------
alter table participants         enable row level security;
alter table progress             enable row level security;
alter table canvas_maps          enable row level security;
alter table scores               enable row level security;
alter table session_settings     enable row level security;
alter table evaluations          enable row level security;
alter table strategic_plans      enable row level security;
alter table leadership_profiles  enable row level security;
alter table final_projects       enable row level security;

-- Lectura pública (paneles colectivos y ranking)
create policy "lectura" on participants        for select using (true);
create policy "lectura" on progress            for select using (true);
create policy "lectura" on canvas_maps         for select using (true);
create policy "lectura" on scores              for select using (true);
create policy "lectura" on session_settings    for select using (true);
create policy "lectura" on evaluations         for select using (true);
create policy "lectura" on strategic_plans     for select using (true);
create policy "lectura" on leadership_profiles for select using (true);
create policy "lectura" on final_projects      for select using (true);

-- Escritura desde la app (clave anon)
create policy "insert" on participants        for insert with check (true);
create policy "update" on participants        for update using (true);
create policy "insert" on progress            for insert with check (true);
create policy "update" on progress            for update using (true);
create policy "insert" on canvas_maps         for insert with check (true);
create policy "update" on canvas_maps         for update using (true);
create policy "delete" on canvas_maps         for delete using (true);
create policy "insert" on scores              for insert with check (true);
create policy "update" on scores              for update using (true);
create policy "insert" on evaluations         for insert with check (true);
create policy "insert" on strategic_plans     for insert with check (true);
create policy "insert" on leadership_profiles for insert with check (true);
create policy "insert" on final_projects      for insert with check (true);

-- Habilitar/bloquear sesiones: SOLO el administrador
create policy "solo admin escribe" on session_settings for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@ejemplo.com')
  with check ((auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@ejemplo.com');
