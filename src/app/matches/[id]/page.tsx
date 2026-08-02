"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { useMatchesStore } from "@/hooks/use-matches";
import { MatchForm } from "@/features/matches/match-form";
import {
  fetchMatchAttendance,
  setAttendance,
} from "@/services/supabase-match-service";
import { getDisplayName } from "@/utils/player-display";
import { getPositionColor } from "@/utils/position-colors";
import { AttendanceStatus, Match, MatchAttendance } from "@/types";
import { ArrowLeft, Pencil, Trash2, Check, X, ShieldHalf } from "lucide-react";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  declined: "No va",
};

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/20 text-primary",
  declined: "bg-destructive/15 text-destructive",
};

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { loaded: authLoaded, teamId, role, playerId, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { matches, loaded: matchesLoaded, load: loadMatches, updateMatch, removeMatch } =
    useMatchesStore();

  const [attendance, setAttendanceList] = useState<MatchAttendance[]>([]);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);

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
    fetchMatchAttendance(id).then((rows) => {
      setAttendanceList(rows);
      setAttendanceLoaded(true);
    });
  }, [authLoaded, teamId, id]);

  const match: Match | undefined = matches.find((m) => m.id === id);
  const isDt = role === "dt";

  const statusByPlayer = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const row of attendance) map.set(row.playerId, row.status);
    return map;
  }, [attendance]);

  const confirmedCount = attendance.filter((a) => a.status === "confirmed").length;

  async function handleSetStatus(targetPlayerId: string, status: AttendanceStatus) {
    if (!teamId) return;
    setSavingPlayerId(targetPlayerId);
    try {
      const updated = await setAttendance(teamId, id, targetPlayerId, status);
      setAttendanceList((prev) => {
        const rest = prev.filter((a) => a.playerId !== targetPlayerId);
        return [...rest, updated];
      });
    } finally {
      setSavingPlayerId(null);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este partido agendado?")) return;
    await removeMatch(id);
    router.push("/matches");
  }

  const loading = !authLoaded || !playersLoaded || !matchesLoaded || !attendanceLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver este partido.
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
      <header className="mb-3 flex items-center gap-3">
        <Link href="/matches">
          <Button size="icon" variant="ghost" aria-label="Volver a partidos">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">
          {match?.opponent ? `vs ${match.opponent}` : "Partido"}
        </h1>
        {isDt && match && (
          <>
            <Button size="icon" variant="ghost" aria-label="Editar partido" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Eliminar partido" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </header>

      {match && (
        <>
          <p className="mb-1 text-sm text-muted-foreground">
            {match.date}
            {match.kickoffTime ? ` · ${match.kickoffTime}` : ""}
            {match.location ? ` · ${match.location}` : ""}
          </p>
          <p className="mb-1 text-sm text-muted-foreground">
            {confirmedCount} confirmado{confirmedCount === 1 ? "" : "s"} de {players.length}
          </p>

          <Link href={`/matches/${id}/board`} className="mb-4 block">
            <Button variant="outline" className="w-full justify-start">
              <ShieldHalf className="mr-2 h-4 w-4" />
              {isDt ? "Armar formación" : "Ver formación"}
            </Button>
          </Link>

          <div className="space-y-2">
            {players.map((player) => {
              const status = statusByPlayer.get(player.id) ?? "pending";
              const isSelf = player.id === playerId;
              const canEdit = isDt || isSelf;
              const color = player.color ?? getPositionColor(player.primaryPosition);

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {player.number}
                  </div>
                  <p className="min-w-0 flex-1 truncate font-medium">{getDisplayName(player)}</p>

                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant={status === "confirmed" ? "default" : "outline"}
                        aria-label={`Confirmar asistencia de ${player.name}`}
                        disabled={savingPlayerId === player.id}
                        onClick={() => handleSetStatus(player.id, "confirmed")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={status === "declined" ? "destructive" : "outline"}
                        aria-label={`Marcar que ${player.name} no va`}
                        disabled={savingPlayerId === player.id}
                        onClick={() => handleSetStatus(player.id, "declined")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {match && (
        <MatchForm
          open={formOpen}
          onOpenChange={setFormOpen}
          match={match}
          onSubmit={async (input) => {
            await updateMatch(id, input);
          }}
        />
      )}
    </div>
  );
}
