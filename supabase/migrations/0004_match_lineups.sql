-- Fase 3: formacion + instrucciones tacticas atadas a un partido agendado
-- (en vez de vivir solo en el dispositivo del DT via Local Storage).

create table public.match_lineups (
  match_id uuid primary key references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  formation_template_id text not null,
  assignments jsonb not null default '[]'::jsonb,  -- [{slotId, playerId, x, y, instructions?}]
  bench jsonb not null default '[]'::jsonb,          -- [playerId, ...]
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.match_lineups enable row level security;

create policy "match_lineups_select_team" on public.match_lineups
  for select using (team_id = public.current_team_id());

create policy "match_lineups_insert_dt" on public.match_lineups
  for insert with check (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_lineups_update_dt" on public.match_lineups
  for update using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );

create policy "match_lineups_delete_dt" on public.match_lineups
  for delete using (
    team_id = public.current_team_id() and public.current_role() = 'dt'
  );
