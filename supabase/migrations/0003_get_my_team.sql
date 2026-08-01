-- Permite que un dispositivo ya logueado recupere su equipo/rol/jugador
-- reclamado sin tener que volver a escribir el código, sin exponer la
-- tabla "teams" directamente (misma lógica que claim_team).

create or replace function public.get_my_team()
returns table(team_id uuid, team_name text, role text, player_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select p.team_id, t.name, p.role, p.player_id
  from public.profiles p
  join public.teams t on t.id = p.team_id
  where p.id = auth.uid()
$$;
