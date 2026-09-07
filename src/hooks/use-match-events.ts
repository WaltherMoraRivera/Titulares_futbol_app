"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  fetchMatchEvents,
  MatchEventRow,
  rowToMatchEvent,
} from "@/services/supabase-match-service";
import { MatchEvent } from "@/types";

/** Carga la bitácora de un partido y la mantiene sincronizada en vivo vía
 * Supabase Realtime (Postgres Changes): si el DT carga un evento desde
 * otro dispositivo, aparece solo acá, sin recargar la página. */
export function useMatchEvents(matchId: string | undefined) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setLoaded(false);

    fetchMatchEvents(matchId)
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("No se pudo cargar la bitácora del partido:", err);
        if (cancelled) return;
        setEvents([]);
        setLoaded(true);
      });

    const channel = supabase
      .channel(`match-events-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const event = rowToMatchEvent(payload.new as MatchEventRow);
          setEvents((prev) =>
            prev.some((e) => e.id === event.id)
              ? prev
              : [...prev, event].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setEvents((prev) => prev.filter((e) => e.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  return { events, loaded, setEvents };
}
