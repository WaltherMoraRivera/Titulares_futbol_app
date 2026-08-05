-- Fase 4: registro post-partido (resultado, goleadores, tarjetas, notas del DT).

create table public.match_results (
  match_id uuid primary key references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  team_score int not null default 0,
  opponent_score int not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.match_goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minute int,
  created_at timestamptz not null default now()
);

create table public.match_cards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  card_type text not null check (card_type in ('yellow', 'red')),
  minute int,
  created_at timestamptz not null default now()
);

alter table public.match_results enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;

-- match_results: todo el equipo ve el resultado, solo DT/capitán lo carga o edita.
create policy "match_results_select_team" on public.match_results
  for select using (team_id = public.current_team_id());

create policy "match_results_insert_dt" on public.match_results
  for insert with check (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_results_update_dt" on public.match_results
  for update using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_results_delete_dt" on public.match_results
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

-- match_goals: todo el equipo ve los goles, solo DT/capitán los carga o borra.
create policy "match_goals_select_team" on public.match_goals
  for select using (team_id = public.current_team_id());

create policy "match_goals_insert_dt" on public.match_goals
  for insert with check (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_goals_delete_dt" on public.match_goals
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

-- match_cards: mismo esquema que match_goals.
create policy "match_cards_select_team" on public.match_cards
  for select using (team_id = public.current_team_id());

create policy "match_cards_insert_dt" on public.match_cards
  for insert with check (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_cards_delete_dt" on public.match_cards
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );
