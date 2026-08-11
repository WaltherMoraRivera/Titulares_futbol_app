-- Reestructuracion de la pizarra tactica: en vez de flechas/zonas sueltas
-- visibles para todo el equipo, cada jugador tiene su propio "mapa tactico"
-- curado por el DT (companeros seleccionados + zonas propias). Se reutiliza
-- la misma columna jsonb, solo cambia el contenido que guarda.

alter table public.match_lineups rename column graphics to tactical_maps;
