"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { useMatchesStore } from "@/hooks/use-matches";
import { useMatchEvents } from "@/hooks/use-match-events";
import { fetchMatchResult, saveMatchResult } from "@/services/supabase-match-service";
import { computeScoreFromEvents } from "@/utils/match-score";
import { getDisplayName } from "@/utils/player-display";
import { EventParticipant, MatchResult, Player } from "@/types";
import { ArrowLeft } from "lucide-react";

function formatParticipant(
  participant: EventParticipant | undefined,
  playersById: Map<string, Player>
): string {
  if (!participant) return "";
  if (participant.playerId) {
    const player = playersById.get(participant.playerId);
    return player ? getDisplayName(player) : "Jugador";
  }
  if (participant.number != null && participant.name?.trim()) {
    return `#${participant.number} ${participant.name.trim()}`;
  }
  if (participant.number != null) return `#${participant.number}`;
  return participant.name?.trim() ?? "";
}

export default function MatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { loaded: authLoaded, teamId, teamName, role, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { matches, loaded: matchesLoaded, load: loadMatches } = useMatchesStore();
  const { events, loaded: eventsLoaded } = useMatchEvents(id);

  const [result, setResult] = useState<MatchResult | null>(null);
  const [resultLoaded, setResultLoaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isDt = role === "dt";
  const match = matches.find((m) => m.id === id);

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) {
      loadPlayers();
      loadMatches();
    }
  }, [authLoaded, teamId, loadPlayers, loadMatches]);

  useEffect(() => {
    if (!authLoaded || !teamId) return;
    fetchMatchResult(id).then((data) => {
      setResult(data);
      setNotes(data?.notes ?? "");
      setResultLoaded(true);
    });
  }, [authLoaded, teamId, id]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const { teamScore, opponentScore } = useMemo(() => computeScoreFromEvents(events), [events]);

  async function handleFinish() {
    if (!teamId) return;
    setSaving(true);
    try {
      const updated = await saveMatchResult(teamId, id, teamScore, opponentScore, notes);
      setResult(updated);
      toast.success("Resultado guardado.");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar el resultado.");
    } finally {
      setSaving(false);
    }
  }

  const loading = !authLoaded || !playersLoaded || !matchesLoaded || !resultLoaded || !eventsLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver este resultado.
        </p>
        <Link href="/login">
          <Button>Ingresar con código</Button>
        </Link>
      </div>
    );
  }

  if (!loading && !match) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Partido no encontrado.</p>
        <Link href="/matches">
          <Button variant="outline">Volver a partidos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href={`/matches/${id}`}>
          <Button size="icon" variant="ghost" aria-label="Volver al partido">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">
          {match?.opponent ? `vs ${match.opponent}` : "Resultado"}
        </h1>
      </header>

      {!loading && !isDt && events.length === 0 && !result && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          El DT todavía no cargó nada de este partido.
        </p>
      )}

      {!loading && (isDt || result || events.length > 0) && (
        <>
          <section className="mb-6 rounded-xl border bg-card p-4 text-center">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {result ? "Resultado final" : "Marcador en curso — todavía sin finalizar"}
            </p>
            <p className="text-2xl font-bold uppercase">
              {teamName ?? "Nuestro equipo"} {teamScore} — {opponentScore}{" "}
              {match?.opponent || "Rival"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Se carga desde la pestaña &quot;En vivo&quot; del partido.
            </p>

            {isDt && (
              <div className="mt-4 space-y-1.5 text-left">
                <Label htmlFor="notes">Notas del DT (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Buen partido colectivo, mejorar la salida desde el fondo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {!isDt && result?.notes?.trim() && (
              <p className="mt-4 rounded-md border bg-muted/50 p-2 text-left text-sm">
                {result.notes}
              </p>
            )}

            {isDt && (
              <Button className="mt-4 w-full" onClick={handleFinish} disabled={saving}>
                {result ? "Actualizar resultado final" : "Marcar como finalizado"}
              </Button>
            )}
          </section>

          <section className="mb-6">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Goleadores {teamScore + opponentScore > 0 ? `(${teamScore + opponentScore})` : ""}
            </p>
            {teamScore + opponentScore === 0 ? (
              <p className="text-sm text-muted-foreground">Sin goles registrados.</p>
            ) : (
              <div className="space-y-2">
                {events
                  .filter((e) => e.type === "goal")
                  .map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                    >
                      <span className="text-sm">⚽</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {formatParticipant(goal.player, playersById) || "?"}
                        {goal.minute != null ? ` · ${goal.minute}'` : ""}
                        {goal.side === "rival" ? ` (${match?.opponent || "Rival"})` : ""}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Tarjetas</p>
            {events.filter((e) => e.type === "yellow_card" || e.type === "red_card").length ===
            0 ? (
              <p className="text-sm text-muted-foreground">Sin tarjetas registradas.</p>
            ) : (
              <div className="space-y-2">
                {events
                  .filter((e) => e.type === "yellow_card" || e.type === "red_card")
                  .map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                    >
                      <span className="text-sm">{card.type === "yellow_card" ? "🟨" : "🟥"}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {formatParticipant(card.player, playersById) || "?"}
                        {card.minute != null ? ` · ${card.minute}'` : ""}
                        {card.side === "rival" ? ` (${match?.opponent || "Rival"})` : ""}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
