-- Fase 7.1: pizarra tactica avanzada (flechas y, mas adelante, zonas libres).
-- Se agrega como columna nueva en vez de anidar dentro de "assignments" porque
-- un grafico como una flecha conecta a dos jugadores, no pertenece a uno solo.

alter table public.match_lineups
  add column graphics jsonb not null default '[]'::jsonb;
