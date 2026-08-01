-- Fase 0: equipos, jugadores, partidos, asistencia y permisos por rol.
-- Pensado para acceso por "código de equipo" (jugador vs. DT/capitán),
-- sin contraseñas individuales. Cada dispositivo se autentica de forma
-- anónima (Supabase Anonymous Auth) y luego "reclama" un equipo con el
-- código, y opcionalmente un jugador de la plantilla.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  player_code text not null unique,
  dt_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  alias text,
  show_alias boolean not null default false,
  number int not null,
  primary_position text not null,
  secondary_position text,
  dominant_foot text,
  active boolean not null default true,
  color text,
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, number)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null check (role in ('player', 'dt')),
  player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  match_date date not null,
  kickoff_time time,
  opponent text,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_attendance (
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

-- ---------------------------------------------------------------------
-- Funciones auxiliares (security definer: leen profiles sin recursión de RLS)
-- ---------------------------------------------------------------------

create or replace function public.current_team_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_player_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select player_id from public.profiles where id = auth.uid()
$$;

-- Entrar a un equipo con el código de jugador o de DT/capitán.
-- Es la única forma de leer los códigos de "teams" (la tabla no tiene
-- policy de select propia), así que un código incorrecto no revela nada.
create or replace function public.claim_team(code text)
returns table(team_id uuid, team_name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_team record;
  found_role text;
begin
  select t.id, t.name into found_team from public.teams t where t.player_code = code;
  if found_team.id is not null then
    found_role := 'player';
  else
    select t.id, t.name into found_team from public.teams t where t.dt_code = code;
    if found_team.id is not null then
      found_role := 'dt';
    end if;
  end if;

  if found_team.id is null then
    raise exception 'Código inválido';
  end if;

  insert into public.profiles (id, team_id, role)
  values (auth.uid(), found_team.id, found_role)
  on conflict (id) do update set team_id = excluded.team_id, role = excluded.role;

  return query select found_team.id, found_team.name, found_role;
end;
$$;

-- Un jugador reclama su número de camiseta dentro del equipo ya asociado.
create or replace function public.claim_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_team uuid;
  player_team uuid;
begin
  select team_id into my_team from public.profiles where id = auth.uid();
  select team_id into player_team from public.players where id = p_player_id;

  if my_team is null or player_team is null or my_team <> player_team then
    raise exception 'El jugador no pertenece a tu equipo';
  end if;

  update public.profiles set player_id = p_player_id where id = auth.uid();
  update public.players set claimed_by = auth.uid() where id = p_player_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;

-- teams: sin policies de select/insert/update directas. Solo se accede
-- vía la función claim_team (security definer).

-- profiles: cada quien ve/edita solo su propio perfil. La creación y el
-- cambio de equipo/rol pasan por claim_team; el player_id lo setea claim_player.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- players
create policy "players_select_team" on public.players
  for select using (team_id = public.current_team_id());

create policy "players_insert_team" on public.players
  for insert with check (team_id = public.current_team_id());

create policy "players_update_own_or_dt" on public.players
  for update using (
    team_id = public.current_team_id()
    and (public.current_role() = 'dt' or claimed_by = auth.uid())
  );

create policy "players_delete_dt" on public.players
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

-- matches: solo DT/capitán puede crear, editar o borrar.
create policy "matches_select_team" on public.matches
  for select using (team_id = public.current_team_id());

create policy "matches_write_dt" on public.matches
  for insert with check (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "matches_update_dt" on public.matches
  for update using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "matches_delete_dt" on public.matches
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

-- match_attendance: el jugador marca su propia asistencia; el DT/capitán
-- puede ver y editar la de todos.
create policy "attendance_select_team" on public.match_attendance
  for select using (team_id = public.current_team_id());

create policy "attendance_upsert_own_or_dt" on public.match_attendance
  for insert with check (
    team_id = public.current_team_id()
    and (public.current_role() = 'dt' or player_id = public.current_player_id())
  );

create policy "attendance_update_own_or_dt" on public.match_attendance
  for update using (
    team_id = public.current_team_id()
    and (public.current_role() = 'dt' or player_id = public.current_player_id())
  );
