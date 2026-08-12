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
import { useMatchLineupStore } from "@/hooks/use-match-lineup";
import { PitchBackground } from "@/features/board/pitch-background";
import { PlayerCardVisual } from "@/features/board/player-card-visual";
import { PlayerMapLayer } from "@/features/board/player-map-layer";
import { ZoneDrawingLayer } from "@/features/board/zone-drawing-layer";
import { getDisplayName } from "@/utils/player-display";
import { TACTICAL_COLOR_HEX } from "@/utils/tactical-colors";
import { cn } from "@/lib/utils";
import { LineupAssignment, Point, TacticalColor } from "@/types";
import { ArrowLeft, PenLine, Shapes, Undo2, X } from "lucide-react";

type Tool = "none" | "arrow" | "zone";

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
    addArrow,
    removeArrow,
    addZone,
    removeZone,
    undoMap,
  } = useMatchLineupStore();

  const [editingCompanions, setEditingCompanions] = useState(false);
  const [tool, setTool] = useState<Tool>("none");
  const [drawColor, setDrawColor] = useState<TacticalColor>("green");
  const [arrowOriginId, setArrowOriginId] = useState<string | null>(null);
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
  const arrows = useMemo(() => map?.arrows ?? [], [map]);
  const zones = useMemo(() => map?.zones ?? [], [map]);
  const history = mapHistory[playerId] ?? [];

  useEffect(() => {
    setInstructionsDraft(ownerAssignment?.instructions ?? "");
  }, [ownerAssignment?.instructions]);

  const connectedAssignments = useMemo(() => {
    if (!lineup) return [];
    return connectedIds
      .map((pid) => lineup.assignments.find((a) => a.playerId === pid))
      .filter((a): a is LineupAssignment => !!a);
  }, [connectedIds, lineup]);

  const otherOnFieldAssignments = useMemo(
    () => (lineup?.assignments ?? []).filter((a) => a.playerId !== playerId),
    [lineup, playerId]
  );

  function selectTool(next: Tool) {
    setTool((current) => (current === next ? "none" : next));
    setArrowOriginId(null);
  }

  function startEditingCompanions() {
    setTool("none");
    setArrowOriginId(null);
    setEditingCompanions(true);
  }

  function confirmCompanions() {
    setEditingCompanions(false);
  }

  function toggleCompanion(teammateId: string) {
    const next = connectedIds.includes(teammateId)
      ? connectedIds.filter((pid) => pid !== teammateId)
      : [...connectedIds, teammateId];
    setConnectedPlayers(playerId, next);
  }

  function handleArrowTap(tappedId: string) {
    if (!arrowOriginId) {
      setArrowOriginId(tappedId);
      const player = playersById.get(tappedId);
      toast.info(`Origen: ${player ? getDisplayName(player) : ""}. Toca el destino.`);
      return;
    }
    if (arrowOriginId === tappedId) {
      setArrowOriginId(null);
      toast.info("Selección cancelada.");
      return;
    }
    addArrow(playerId, arrowOriginId, tappedId, drawColor);
    setArrowOriginId(null);
  }

  function handleZoneComplete(points: Point[]) {
    addZone(playerId, points, drawColor);
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
      </header>

      {isDt && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {editingCompanions ? (
            <Button size="sm" onClick={confirmCompanions}>
              Confirmar
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={startEditingCompanions}>
                Editar compañeros
              </Button>
              <Button
                size="icon"
                variant={tool === "arrow" ? "default" : "outline"}
                aria-label="Modo dibujar flechas"
                onClick={() => selectTool("arrow")}
              >
                <PenLine className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={tool === "zone" ? "default" : "outline"}
                aria-label="Modo dibujar zonas"
                onClick={() => selectTool("zone")}
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
              {tool !== "none" && (
                <div className="flex items-center gap-1.5">
                  {(["green", "red"] as TacticalColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Color ${color === "green" ? "verde" : "rojo"}`}
                      onClick={() => setDrawColor(color)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2",
                        drawColor === color ? "border-foreground" : "border-transparent"
                      )}
                      style={{ backgroundColor: TACTICAL_COLOR_HEX[color] }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editingCompanions && (
        <p className="mb-3 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          Toca a los jugadores que quieres agregar o quitar del mapa de {owner ? getDisplayName(owner) : "este jugador"}.
        </p>
      )}
      {!editingCompanions && tool === "arrow" && (
        <p className="mb-3 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          {arrowOriginId
            ? "Toca el jugador destino de la flecha (o vuelve a tocar el origen para cancelar)."
            : "Toca el jugador de origen de la flecha."}
        </p>
      )}
      {!editingCompanions && tool === "zone" && (
        <p className="mb-3 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          Dibuja el contorno de la zona con el dedo y suelta para terminar.
        </p>
      )}

      {owner && ownerAssignment && (
        <div
          id="field-container"
          className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-inner"
        >
          <PitchBackground />

          {!editingCompanions && (
            <PlayerMapLayer
              ownerAssignment={ownerAssignment}
              connectedAssignments={connectedAssignments}
              arrows={arrows}
              zones={zones}
            />
          )}

          {isDt && !editingCompanions && tool === "zone" && (
            <ZoneDrawingLayer
              active
              color={TACTICAL_COLOR_HEX[drawColor]}
              onComplete={handleZoneComplete}
            />
          )}

          <button
            type="button"
            disabled={editingCompanions || !isDt || tool !== "arrow"}
            onClick={() => handleArrowTap(owner.id)}
            className="absolute flex min-h-[64px] min-w-[56px] flex-col items-center justify-center gap-1"
            style={{
              left: `${ownerAssignment.x}%`,
              top: `${ownerAssignment.y}%`,
              translate: "-50% -50%",
            }}
          >
            <PlayerCardVisual
              player={owner}
              variant="field"
              hasInstructions={!!ownerAssignment.instructions?.trim()}
            />
          </button>

          {editingCompanions
            ? otherOnFieldAssignments.map((a) => {
                const player = playersById.get(a.playerId);
                if (!player) return null;
                const selected = connectedIds.includes(a.playerId);
                return (
                  <button
                    key={a.playerId}
                    type="button"
                    onClick={() => isDt && toggleCompanion(a.playerId)}
                    className="absolute flex min-h-[64px] min-w-[56px] flex-col items-center justify-center gap-1 transition-opacity"
                    style={{
                      left: `${a.x}%`,
                      top: `${a.y}%`,
                      translate: "-50% -50%",
                      opacity: selected ? 1 : 0.3,
                    }}
                  >
                    <PlayerCardVisual player={player} variant="field" />
                  </button>
                );
              })
            : connectedAssignments.map((a) => {
                const player = playersById.get(a.playerId);
                if (!player) return null;
                return (
                  <button
                    key={a.playerId}
                    type="button"
                    disabled={!isDt || tool !== "arrow"}
                    onClick={() => handleArrowTap(a.playerId)}
                    className="absolute flex min-h-[64px] min-w-[56px] flex-col items-center justify-center gap-1"
                    style={{
                      left: `${a.x}%`,
                      top: `${a.y}%`,
                      translate: "-50% -50%",
                    }}
                  >
                    <PlayerCardVisual player={player} variant="field" />
                  </button>
                );
              })}
        </div>
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

      {isDt && !editingCompanions && arrows.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Flechas ({arrows.length})
          </p>
          <div className="space-y-1.5">
            {arrows.map((arrow) => {
              const from = playersById.get(arrow.fromPlayerId);
              const to = playersById.get(arrow.toPlayerId);
              return (
                <div
                  key={arrow.id}
                  className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: TACTICAL_COLOR_HEX[arrow.color] }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {from ? getDisplayName(from) : "?"} → {to ? getDisplayName(to) : "?"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Quitar flecha"
                    onClick={() => removeArrow(playerId, arrow.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isDt && !editingCompanions && zones.length > 0 && (
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
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: TACTICAL_COLOR_HEX[zone.color] }}
                />
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
