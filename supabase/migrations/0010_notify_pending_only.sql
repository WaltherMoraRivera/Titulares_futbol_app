-- Deja que el DT/Capitán/admin lea los profiles de todo su equipo (antes
-- solo podía ver el propio) — necesario para poder cruzar cada suscripción
-- push (push_subscriptions.user_id) con el jugador que reclamó esa sesión
-- (profiles.player_id), y así saber a quién ya le llegó y a quién no.
-- No expone nada sensible nuevo: profiles no tiene más que team_id, role y
-- player_id, y el DT ya puede ver esos mismos datos indirectamente en
-- /players.
create policy "profiles_select_team_dt" on public.profiles
  for select using (team_id = public.current_team_id() and public.is_dt_or_admin());
