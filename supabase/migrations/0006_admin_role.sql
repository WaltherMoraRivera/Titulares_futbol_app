-- Cuenta de administrador para pruebas: un tercer código de equipo que
-- inicia sesión con permisos completos (equivalentes a DT/Capitán) y que
-- el cliente usa para mostrar un switcher "ver como Jugador / DT-Capitán".
-- No se crea un rol de permisos nuevo de verdad: 'admin' se trata igual
-- que 'dt' en todas las policies de RLS, vía is_dt_or_admin().

alter table public.teams add column admin_code text unique;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('player', 'dt', 'admin'));

create or replace function public.is_dt_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() in ('dt', 'admin')
$$;

-- claim_team: agrega el chequeo de admin_code, en el mismo orden de
-- prioridad que player_code/dt_code (código inválido si no matchea ninguno).
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
    else
      select t.id, t.name into found_team from public.teams t where t.admin_code = code;
      if found_team.id is not null then
        found_role := 'admin';
      end if;
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

-- Reemplaza cada policy que chequeaba current_role() = 'dt' por
-- is_dt_or_admin(), para que la cuenta admin tenga los mismos permisos
-- de escritura que un DT/Capitán en todas las tablas.

drop policy if exists "players_update_own_or_dt" on public.players;
create policy "players_update_own_or_dt" on public.players
  for update using (
    team_id = public.current_team_id()
    and (public.is_dt_or_admin() or claimed_by = auth.uid())
  );

drop policy if exists "players_delete_dt" on public.players;
create policy "players_delete_dt" on public.players
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "matches_write_dt" on public.matches;
create policy "matches_write_dt" on public.matches
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "matches_update_dt" on public.matches;
create policy "matches_update_dt" on public.matches
  for update using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "matches_delete_dt" on public.matches;
create policy "matches_delete_dt" on public.matches
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "attendance_upsert_own_or_dt" on public.match_attendance;
create policy "attendance_upsert_own_or_dt" on public.match_attendance
  for insert with check (
    team_id = public.current_team_id()
    and (public.is_dt_or_admin() or player_id = public.current_player_id())
  );

drop policy if exists "attendance_update_own_or_dt" on public.match_attendance;
create policy "attendance_update_own_or_dt" on public.match_attendance
  for update using (
    team_id = public.current_team_id()
    and (public.is_dt_or_admin() or player_id = public.current_player_id())
  );

drop policy if exists "match_lineups_insert_dt" on public.match_lineups;
create policy "match_lineups_insert_dt" on public.match_lineups
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_lineups_update_dt" on public.match_lineups;
create policy "match_lineups_update_dt" on public.match_lineups
  for update using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_lineups_delete_dt" on public.match_lineups;
create policy "match_lineups_delete_dt" on public.match_lineups
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_results_insert_dt" on public.match_results;
create policy "match_results_insert_dt" on public.match_results
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_results_update_dt" on public.match_results;
create policy "match_results_update_dt" on public.match_results
  for update using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_results_delete_dt" on public.match_results;
create policy "match_results_delete_dt" on public.match_results
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_goals_insert_dt" on public.match_goals;
create policy "match_goals_insert_dt" on public.match_goals
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_goals_delete_dt" on public.match_goals;
create policy "match_goals_delete_dt" on public.match_goals
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_cards_insert_dt" on public.match_cards;
create policy "match_cards_insert_dt" on public.match_cards
  for insert with check (team_id = public.current_team_id() and public.is_dt_or_admin());

drop policy if exists "match_cards_delete_dt" on public.match_cards;
create policy "match_cards_delete_dt" on public.match_cards
  for delete using (team_id = public.current_team_id() and public.is_dt_or_admin());

-- Código de administrador para Las Condes FC. Cambialo cuando quieras con
-- un UPDATE a esta tabla, igual que los otros dos códigos.
update public.teams set admin_code = 'CONDESFC-ADMIN' where name = 'Las Condes FC';
