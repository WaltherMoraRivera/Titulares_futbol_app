-- Nuevo rol "Asistente": igual que "Jugador" en todo (lectura de equipo,
-- sin edición de nada), salvo que además puede cargar eventos en la
-- bitácora en vivo de un partido (goles/tarjetas/cambios/comentarios) —
-- pensado para dar una mano con la carga de datos en vivo sin ser DT ni
-- tener un perfil dentro de la plantilla de jugadores.

alter table public.teams add column assistant_code text unique;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('player', 'dt', 'admin', 'assistant'));

-- A diferencia de is_dt_or_admin() (que gobierna casi todo: plantilla,
-- partidos, formaciones, resultados), esta función solo se usa para la
-- bitácora en vivo — el asistente no gana ningún otro permiso de DT.
create or replace function public.can_log_match_events()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() in ('dt', 'admin', 'assistant')
$$;

drop policy if exists "match_events_insert_dt" on public.match_events;
create policy "match_events_insert_dt" on public.match_events
  for insert with check (team_id = public.current_team_id() and public.can_log_match_events());

drop policy if exists "match_events_update_dt" on public.match_events;
create policy "match_events_update_dt" on public.match_events
  for update using (team_id = public.current_team_id() and public.can_log_match_events());

drop policy if exists "match_events_delete_dt" on public.match_events;
create policy "match_events_delete_dt" on public.match_events
  for delete using (team_id = public.current_team_id() and public.can_log_match_events());

-- claim_team: agrega el chequeo de assistant_code, mismo orden de
-- prioridad que los demás códigos (inválido si no matchea ninguno).
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
      else
        select t.id, t.name into found_team from public.teams t where t.assistant_code = code;
        if found_team.id is not null then
          found_role := 'assistant';
        end if;
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

-- Código de asistente para Decom FC. Se puede cambiar cuando sea con un
-- UPDATE a esta tabla, igual que los otros códigos.
update public.teams set assistant_code = 'CONDESFC-ASISTENTE' where name = 'Decom FC';
