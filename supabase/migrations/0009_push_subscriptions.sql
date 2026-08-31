-- Notificaciones push (Web Push) para avisar de partidos nuevos. Cada
-- dispositivo (sesión anónima de Supabase) que activa notificaciones guarda
-- su suscripción del navegador acá; el DT/Capitán/admin puede leer las del
-- equipo para enviarles un push cuando agenda un partido. No requiere
-- ningún dato personal (email/teléfono): solo el endpoint del navegador.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Cualquier sesión puede dar de alta/baja su propia suscripción (un
-- dispositivo se suscribe a sí mismo, no a nombre de otro).
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid() and team_id = public.current_team_id());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- El DT/Capitán/admin necesita leer todas las suscripciones del equipo
-- para poder enviarles el aviso de partido nuevo.
create policy "push_subscriptions_select_dt" on public.push_subscriptions
  for select using (team_id = public.current_team_id() and public.is_dt_or_admin());
