"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import {
  fetchTeamAttendance,
  fetchTeamMatchCards,
  fetchTeamMatchGoals,
  fetchTeamMatchResults,
} from "@/services/supabase-match-service";
import { getDisplayName } from "@/utils/player-display";
import { getPositionColor } from "@/utils/position-colors";
import { MatchAttendance, MatchCard, MatchGoal, MatchResult } from "@/types";
import { ArrowLeft } from "lucide-react";

interface PlayerStats {
  playerId: string;
  callUps: number;
  goals: number;
  yellowCards: number;
  redCards: number;
}

export default function StatsPage() {
  const { loaded: authLoaded, teamId, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();

  const [attendance, setAttendance] = useState<MatchAttendance[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) loadPlayers();
  }, [authLoaded, loadPlayers]);

  useEffect(() => {
    if (!authLoaded || !teamId) return;
    Promise.all([
      fetchTeamAttendance(teamId),
      fetchTeamMatchResults(teamId),
      fetchTeamMatchGoals(teamId),
      fetchTeamMatchCards(teamId),
    ]).then(([attendanceData, resultsData, goalsData, cardsData]) => {
      setAttendance(attendanceData);
      setResults(resultsData);
      setGoals(goalsData);
      setCards(cardsData);
      setDataLoaded(true);
    });
  }, [authLoaded, teamId]);

  const teamRecord = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const r of results) {
      goalsFor += r.teamScore;
      goalsAgainst += r.opponentScore;
      if (r.teamScore > r.opponentScore) wins++;
      else if (r.teamScore < r.opponentScore) losses++;
      else draws++;
    }
    return { played: results.length, wins, draws, losses, goalsFor, goalsAgainst };
  }, [results]);

  const playerStats = useMemo(() => {
    const map = new Map<string, PlayerStats>();
    function get(playerId: string): PlayerStats {
      let stats = map.get(playerId);
      if (!stats) {
        stats = { playerId, callUps: 0, goals: 0, yellowCards: 0, redCards: 0 };
        map.set(playerId, stats);
      }
      return stats;
    }
    for (const a of attendance) {
      if (a.status === "confirmed") get(a.playerId).callUps++;
    }
    for (const g of goals) get(g.playerId).goals++;
    for (const c of cards) {
      if (c.cardType === "yellow") get(c.playerId).yellowCards++;
      else get(c.playerId).redCards++;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.callUps - a.callUps;
    });
  }, [attendance, goals, cards]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const loading = !authLoaded || !playersLoaded || !dataLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver las estadísticas.
        </p>
        <Link href="/login">
          <Button>Ingresar con código</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Estadísticas</h1>
      </header>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
      ) : results.length === 0 && playerStats.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay resultados ni convocatorias cargadas.
        </p>
      ) : (
        <>
          <section className="mb-6 rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">
              Temporada · {teamRecord.played} partido{teamRecord.played === 1 ? "" : "s"}
            </p>
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-xl font-bold text-primary">{teamRecord.wins}</p>
                <p className="text-xs text-muted-foreground">Ganados</p>
              </div>
              <div>
                <p className="text-xl font-bold">{teamRecord.draws}</p>
                <p className="text-xs text-muted-foreground">Empatados</p>
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">{teamRecord.losses}</p>
                <p className="text-xs text-muted-foreground">Perdidos</p>
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Goles: {teamRecord.goalsFor} a favor · {teamRecord.goalsAgainst} en contra
            </p>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Jugadores {playerStats.length > 0 ? `(${playerStats.length})` : ""}
            </p>
            {playerStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay convocatorias, goles ni tarjetas cargadas.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Jugador</th>
                      <th className="px-2 py-2 text-center font-medium">Conv.</th>
                      <th className="px-2 py-2 text-center font-medium">Goles</th>
                      <th className="px-2 py-2 text-center font-medium">🟨</th>
                      <th className="px-2 py-2 text-center font-medium">🟥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((stats) => {
                      const player = playersById.get(stats.playerId);
                      const color = player
                        ? player.color ?? getPositionColor(player.primaryPosition)
                        : "#888";
                      return (
                        <tr key={stats.playerId} className="border-t">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {player && (
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                  style={{ backgroundColor: color }}
                                >
                                  {player.number}
                                </span>
                              )}
                              <span className="truncate font-medium">
                                {player ? getDisplayName(player) : "Jugador"}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">{stats.callUps}</td>
                          <td className="px-2 py-2 text-center font-semibold">{stats.goals}</td>
                          <td className="px-2 py-2 text-center">{stats.yellowCards}</td>
                          <td className="px-2 py-2 text-center">{stats.redCards}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
