-- Bitácora en vivo del partido: una sola tabla para goles, tarjetas,
-- cambios y comentarios libres, de nuestro equipo o del rival. Reemplaza
-- la carga manual de match_goals/match_cards (que siguen existiendo con
-- sus datos históricos, pero ya no se escriben más) y el marcador
-- tipeado a mano de match_results — el marcador final ahora se calcula
-- contando los goles cargados acá.

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  side text not null check (side in ('own', 'rival')),
  type text not null check (type in ('goal', 'yellow_card', 'red_card', 'substitution', 'comment')),
  minute int,
  player jsonb,
  player_out jsonb,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.match_events enable row level security;

create policy "match_events_select_team" on public.match_events
  for select using (team_id = public.current_team_id());

create policy "match_events_insert_dt" on public.match_events
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

create policy "match_events_update_dt" on public.match_events
  for update using (team_id = public.current_team_id() and public.is_dt_or_admin());

create policy "match_events_delete_dt" on public.match_events
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

-- Habilita Postgres Changes (Supabase Realtime) para esta tabla, para que
-- los eventos nuevos aparezcan solos en la pantalla de quien la tenga
-- abierta, sin recargar.
alter publication supabase_realtime add table public.match_events;

-- Migra los goles y tarjetas ya cargados por match_goals/match_cards
-- (siempre de nuestro equipo — nunca existió carga de goles/tarjetas del
-- rival) para que se sigan viendo en la bitácora unificada.
insert into public.match_events (match_id, team_id, side, type, minute, player, created_at)
select g.match_id, g.team_id, 'own', 'goal', g.minute,
       jsonb_build_object('playerId', g.player_id),
       g.created_at
from public.match_goals g;

insert into public.match_events (match_id, team_id, side, type, minute, player, created_at)
select c.match_id, c.team_id, 'own',
       case c.card_type when 'yellow' then 'yellow_card' else 'red_card' end,
       c.minute,
       jsonb_build_object('playerId', c.player_id),
       c.created_at
from public.match_cards c;
