"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { useMatchesStore } from "@/hooks/use-matches";
import { useMatchLineupStore } from "@/hooks/use-match-lineup";
import { PlayerMapField } from "@/features/board/player-map-field";
import { getDisplayName } from "@/utils/player-display";
import { cn } from "@/lib/utils";
import { LineupAssignment, Player, Point } from "@/types";
import { ArrowLeft, Shapes, Undo2, X } from "lucide-react";

export default function PlayerTacticalMapPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = use(params);

  const { loaded: authLoaded, teamId, role, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { matches, loaded: matchesLoaded, load: loadMatches } = useMatchesStore();
  const {
    lineup,
    loaded: lineupLoaded,
    mapHistory,
    loadForMatch,
    setInstructions,
    setConnectedPlayers,
    addZone,
    removeZone,
    undoMap,
  } = useMatchLineupStore();

  const [zoneToolActive, setZoneToolActive] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");

  const isDt = role === "dt";
  const match = matches.find((m) => m.id === id);

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) {
      loadPlayers();
      loadMatches();
      loadForMatch(id);
    }
  }, [authLoaded, teamId, loadPlayers, loadMatches, loadForMatch, id]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const owner = playersById.get(playerId);
  const ownerAssignment = lineup?.assignments.find((a) => a.playerId === playerId);
  const map = lineup?.tacticalMaps.find((m) => m.ownerId === playerId);
  const connectedIds = useMemo(() => map?.connectedPlayerIds ?? [], [map]);
  const zones = useMemo(() => map?.zones ?? [], [map]);
  const history = mapHistory[playerId] ?? [];

  useEffect(() => {
    setInstructionsDraft(ownerAssignment?.instructions ?? "");
  }, [ownerAssignment?.instructions]);

  const connected = useMemo(() => {
    if (!lineup) return [];
    return connectedIds
      .map((pid) => {
        const player = playersById.get(pid);
        const assignment = lineup.assignments.find((a) => a.playerId === pid);
        if (!player || !assignment) return null;
        return { player, assignment };
      })
      .filter((v): v is { player: Player; assignment: LineupAssignment } => v !== null);
  }, [connectedIds, lineup, playersById]);

  const candidateTeammates = useMemo(
    () =>
      (lineup?.assignments ?? [])
        .filter((a) => a.playerId !== playerId)
        .map((a) => playersById.get(a.playerId))
        .filter((p): p is Player => !!p),
    [lineup, playersById, playerId]
  );

  function toggleConnected(teammateId: string) {
    const next = connectedIds.includes(teammateId)
      ? connectedIds.filter((pid) => pid !== teammateId)
      : [...connectedIds, teammateId];
    setConnectedPlayers(playerId, next);
  }

  function handleZoneComplete(points: Point[]) {
    addZone(playerId, points);
  }

  const loading = !authLoaded || !playersLoaded || !matchesLoaded || !lineupLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver este mapa táctico.
        </p>
        <Link href="/login">
          <Button>Ingresar con código</Button>
        </Link>
      </div>
    );
  }

  if (!loading && (!match || !owner)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">No se encontró este mapa táctico.</p>
        <Link href={`/matches/${id}/board`}>
          <Button variant="outline">Volver a la formación</Button>
        </Link>
      </div>
    );
  }

  if (!loading && !ownerAssignment) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
        <header className="mb-3 flex items-center gap-3">
          <Link href={`/matches/${id}/board`}>
            <Button size="icon" variant="ghost" aria-label="Volver a la formación">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="flex-1 text-xl font-semibold">{owner ? getDisplayName(owner) : ""}</h1>
        </header>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Este jugador no está en la cancha en esta formación.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/matches/${id}/board`}>
          <Button size="icon" variant="ghost" aria-label="Volver a la formación">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">
          {owner ? getDisplayName(owner) : "Jugador"}
        </h1>
        {isDt && (
          <>
            <Button
              size="icon"
              variant={zoneToolActive ? "default" : "outline"}
              aria-label="Modo dibujar zonas"
              onClick={() => setZoneToolActive((v) => !v)}
            >
              <Shapes className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Deshacer último cambio del mapa"
              disabled={history.length === 0}
              onClick={() => undoMap(playerId)}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </header>

      {isDt && zoneToolActive && (
        <p className="mb-3 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          Dibuja el contorno de la zona con el dedo y suelta para terminar.
        </p>
      )}

      {owner && ownerAssignment && (
        <PlayerMapField
          owner={owner}
          ownerAssignment={ownerAssignment}
          connected={connected}
          zones={zones}
          zoneToolActive={isDt && zoneToolActive}
          onZoneComplete={isDt ? handleZoneComplete : undefined}
        />
      )}

      {isDt ? (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="instructions">Instrucciones tácticas</Label>
          <Textarea
            id="instructions"
            placeholder="Ej: Marca personal al 10 rival, cerrar la banda izquierda..."
            value={instructionsDraft}
            onChange={(e) => setInstructionsDraft(e.target.value)}
            onBlur={() => setInstructions(playerId, instructionsDraft)}
            rows={3}
          />
        </div>
      ) : (
        ownerAssignment?.instructions?.trim() && (
          <div className="mt-3 rounded-lg border bg-card p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Instrucciones tácticas
            </p>
            <p className="text-sm">{ownerAssignment.instructions}</p>
          </div>
        )
      )}

      {isDt && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Compañeros en el mapa
          </p>
          <div className="flex flex-wrap gap-2">
            {candidateTeammates.map((teammate) => {
              const selected = connectedIds.includes(teammate.id);
              return (
                <button
                  key={teammate.id}
                  type="button"
                  onClick={() => toggleConnected(teammate.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-accent bg-accent/20 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary"
                  )}
                >
                  {teammate.number} {getDisplayName(teammate)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isDt && zones.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Zonas ({zones.length})
          </p>
          <div className="space-y-1.5">
            {zones.map((zone, index) => (
              <div
                key={zone.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">Zona {index + 1}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar zona"
                  onClick={() => removeZone(playerId, zone.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
