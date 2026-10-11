-- ============================================================
-- Escuela de Directores — ANEIAP ICESI
-- Esquema de base de datos para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- participants ----------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

-- ---------- progress ----------
create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session_number int not null,
  status text not null default 'no_iniciado',
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- expectation_maps (Sesión 1) ----------
create table if not exists expectation_maps (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  category text not null,
  title text,
  description text,
  expectation text,
  priority text,
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- structure_maps (Sesión 2) ----------
create table if not exists structure_maps (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  version text not null, -- 'inicial' | 'final'
  category text not null,
  title text,
  description text,
  priority text,
  position int default 0,
  created_at timestamptz default now()
);

-- ---------- evaluations (Sesiones 3 y 7) ----------
create table if not exists evaluations (
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

-- ---------- rankings (Sesión 5) ----------
create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  session int not null,
  score int,
  time_seconds int,
  created_at timestamptz default now()
);

-- ---------- strategic_plans (Sesión 4) ----------
create table if not exists strategic_plans (
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

-- ---------- leadership_profiles (Sesión 6) ----------
create table if not exists leadership_profiles (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  results jsonb,
  strengths jsonb,
  development_areas jsonb,
  created_at timestamptz default now()
);

-- ---------- final_projects (Sesión 8) ----------
create table if not exists final_projects (
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

-- ============================================================
-- Row Level Security
-- El ingreso es solo por nombre (sin autenticación de usuario),
-- por lo que se usa la clave anónima de Supabase para todas las
-- operaciones desde el frontend. Estas políticas permiten:
--  - Lectura pública (paneles colectivos, ranking, panel general).
--  - Escritura pública controlada desde el frontend (la app nunca
--    permite editar el registro de otro participante desde la UI).
-- Para mayor seguridad en producción, considera mover las
-- escrituras a una Edge Function de Supabase que valide el
-- participant_id contra una cookie/token de sesión.
-- ============================================================

alter table participants enable row level security;
alter table progress enable row level security;
alter table expectation_maps enable row level security;
alter table structure_maps enable row level security;
alter table evaluations enable row level security;
alter table rankings enable row level security;
alter table strategic_plans enable row level security;
alter table leadership_profiles enable row level security;
alter table final_projects enable row level security;

-- Lectura pública en todas las tablas (paneles colectivos y ranking)
create policy "lectura publica" on participants for select using (true);
create policy "lectura publica" on progress for select using (true);
create policy "lectura publica" on expectation_maps for select using (true);
create policy "lectura publica" on structure_maps for select using (true);
create policy "lectura publica" on evaluations for select using (true);
create policy "lectura publica" on rankings for select using (true);
create policy "lectura publica" on strategic_plans for select using (true);
create policy "lectura publica" on leadership_profiles for select using (true);
create policy "lectura publica" on final_projects for select using (true);

-- Escritura pública (insert/update) usando la clave anónima
create policy "escritura publica insert" on participants for insert with check (true);
create policy "escritura publica update" on participants for update using (true);

create policy "escritura publica insert" on progress for insert with check (true);
create policy "escritura publica update" on progress for update using (true);

create policy "escritura publica insert" on expectation_maps for insert with check (true);
create policy "escritura publica update" on expectation_maps for update using (true);
create policy "escritura publica delete" on expectation_maps for delete using (true);

create policy "escritura publica insert" on structure_maps for insert with check (true);
create policy "escritura publica update" on structure_maps for update using (true);
create policy "escritura publica delete" on structure_maps for delete using (true);

create policy "escritura publica insert" on evaluations for insert with check (true);
create policy "escritura publica insert" on rankings for insert with check (true);

create policy "escritura publica insert" on strategic_plans for insert with check (true);
create policy "escritura publica insert" on leadership_profiles for insert with check (true);
create policy "escritura publica insert" on final_projects for insert with check (true);
