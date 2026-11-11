-- Permite recuperar resultados sin minuto a minuto y completar goleadores
-- despues, sin duplicar goles ni dejar resultado y bitacora a medio guardar.
alter table public.match_events replica identity full;

create or replace function public.save_flexible_match_result(
  p_match_id uuid,
  p_goals jsonb,
  p_expected_goals jsonb,
  p_expected_result_updated_at timestamptz,
  p_notes text
)
returns setof public.match_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_current_goals jsonb;
  v_expected_goals jsonb;
  v_result_updated_at timestamptz;
  v_team_score int;
  v_opponent_score int;
begin
  if public.current_role() is distinct from 'admin' then
    raise exception 'Solo el administrador puede editar este resultado.' using errcode = '42501';
  end if;

  select team_id into v_team_id from public.matches where id = p_match_id;
  if v_team_id is null or v_team_id is distinct from public.current_team_id() then
    raise exception 'Partido no encontrado en tu equipo.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_goals) is distinct from 'array'
    or jsonb_typeof(p_expected_goals) is distinct from 'array' then
    raise exception 'La lista de goles no es valida.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_goals) > 198 or exists (
    select 1 from jsonb_array_elements(p_goals) g
    group by g->>'side' having count(*) > 99
  ) then
    raise exception 'El marcador debe estar entre 0 y 99 por equipo.' using errcode = '22023';
  end if;

  -- shortcut: bloqueo breve para el equipo amateur; usar bloqueo por partido
  -- en todos los escritores si se amplia a equipos con escrituras simultaneas frecuentes.
  lock table public.match_events, public.match_results in share row exclusive mode;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'side', side, 'minute', minute, 'player', player, 'note', note
  ) order by id), '[]'::jsonb) into v_current_goals
  from public.match_events where match_id = p_match_id and type = 'goal';

  select coalesce(jsonb_agg(value order by value->>'id'), '[]'::jsonb)
  into v_expected_goals from jsonb_array_elements(p_expected_goals);

  select updated_at into v_result_updated_at
  from public.match_results where match_id = p_match_id;

  if v_current_goals is distinct from v_expected_goals
    or v_result_updated_at is distinct from p_expected_result_updated_at then
    raise exception 'El partido cambió mientras lo editabas. Recarga la página antes de volver a editar.'
      using errcode = '40001';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_goals) as g(id uuid, side text, "playerId" uuid)
    where g.side is null or g.side not in ('own', 'rival')
      or (g.side = 'rival' and g."playerId" is not null)
      or (g.id is not null and not exists (
        select 1 from public.match_events e
        where e.id = g.id and e.match_id = p_match_id and e.type = 'goal' and e.side = g.side
      ))
      or (g."playerId" is not null and not exists (
        select 1 from public.players p where p.id = g."playerId" and p.team_id = v_team_id
      ) and not exists (
        select 1 from public.match_events e where e.id = g.id and e.match_id = p_match_id
          and e.type = 'goal' and e.side = 'own' and e.player->>'playerId' = g."playerId"::text
      ))
  ) or (
    select count(id) <> count(distinct id)
    from jsonb_to_recordset(p_goals) as g(id uuid)
  ) then
    raise exception 'Hay goles o jugadores que no corresponden a este partido y equipo.' using errcode = '22023';
  end if;

  delete from public.match_events e
  where e.match_id = p_match_id and e.type = 'goal'
    and not exists (
      select 1 from jsonb_to_recordset(p_goals) as g(id uuid) where g.id = e.id
    );

  update public.match_events e
  set player = nullif((coalesce(e.player, '{}'::jsonb) - 'playerId') ||
    case when g."playerId" is null then '{}'::jsonb
      else jsonb_build_object('playerId', g."playerId") end, '{}'::jsonb)
  from jsonb_to_recordset(p_goals) as g(id uuid, "playerId" uuid)
  where e.id = g.id and e.match_id = p_match_id and e.type = 'goal' and e.side = 'own'
    and e.player is distinct from nullif((coalesce(e.player, '{}'::jsonb) - 'playerId') ||
      case when g."playerId" is null then '{}'::jsonb
        else jsonb_build_object('playerId', g."playerId") end, '{}'::jsonb);

  insert into public.match_events (match_id, team_id, side, type, player, created_by)
  select p_match_id, v_team_id, g.side, 'goal',
    case when g."playerId" is null then null else jsonb_build_object('playerId', g."playerId") end,
    auth.uid()
  from jsonb_to_recordset(p_goals) as g(id uuid, side text, "playerId" uuid)
  where g.id is null;

  select count(*) filter (where side = 'own'), count(*) filter (where side = 'rival')
  into v_team_score, v_opponent_score
  from public.match_events where match_id = p_match_id and type = 'goal';

  return query
  insert into public.match_results (match_id, team_id, team_score, opponent_score, notes, updated_at, updated_by)
  values (p_match_id, v_team_id, v_team_score, v_opponent_score, nullif(trim(p_notes), ''), clock_timestamp(), auth.uid())
  on conflict (match_id) do update set
    team_score = excluded.team_score, opponent_score = excluded.opponent_score,
    notes = excluded.notes, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  returning *;
end;
$$;

revoke all on function public.save_flexible_match_result(uuid, jsonb, jsonb, timestamptz, text) from public;
grant execute on function public.save_flexible_match_result(uuid, jsonb, jsonb, timestamptz, text) to authenticated;
