-- Agrega dos tipos de evento "marcador" a la bitácora en vivo: fin del
-- primer tiempo y fin del partido (segundo tiempo). No pertenecen a
-- ningún lado (own/rival) en la práctica — se guardan con side = 'own'
-- por convención, ya que la columna es NOT NULL — y se usan solo para
-- dibujar el separador de "Primer tiempo" / "Segundo tiempo" en la vista.

alter table public.match_events drop constraint match_events_type_check;
alter table public.match_events add constraint match_events_type_check
  check (type in ('goal', 'yellow_card', 'red_card', 'substitution', 'comment', 'half_time', 'full_time'));
