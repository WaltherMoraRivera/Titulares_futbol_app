"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  PointerSensorOptions,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { useMatchesStore } from "@/hooks/use-matches";
import { useMatchLineupStore } from "@/hooks/use-match-lineup";
import { fetchMatchAttendance } from "@/services/supabase-match-service";
import { Field } from "@/features/board/field";
import { BenchStrip } from "@/features/board/bench-strip";
import { PlayerCardVisual } from "@/features/board/player-card-visual";
import { PlayerInfoSheet } from "@/features/board/player-info-sheet";
import { ExportView } from "@/features/board/export-view";
import { FORMATION_PRESETS, getFormationPreset } from "@/utils/formation-presets";
import { captureElementAsBlob, shareOrDownloadImage } from "@/utils/export-image";
import { getDisplayName } from "@/utils/player-display";
import { ArrowGraphic, MatchLineup, Player } from "@/types";
import { ArrowLeft, PenLine, Radar, Share2, X } from "lucide-react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MatchBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { loaded: authLoaded, teamId, role, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { matches, loaded: matchesLoaded, load: loadMatches } = useMatchesStore();
  const {
    lineup,
    loaded: lineupLoaded,
    loadForMatch,
    startFormation,
    moveToField,
    moveToBench,
    setInstructions,
    addArrow,
    removeGraphic,
  } = useMatchLineupStore();

  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showInfluence, setShowInfluence] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [arrowOriginId, setArrowOriginId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!authLoaded || !teamId) return;
    fetchMatchAttendance(id).then((rows) => {
      setConfirmedIds(rows.filter((r) => r.status === "confirmed").map((r) => r.playerId));
      setAttendanceLoaded(true);
    });
  }, [authLoaded, teamId, id]);

  // Sensor de dnd-kit que se puede "apagar" en tiempo real sin cambiar la
  // cantidad de sensores registrados entre renders (pasar sensors={[]} en
  // vez de una lista de 1 elemento rompe el hook interno de dnd-kit con un
  // error de React sobre arrays de dependencias de tamaño variable).
  const dragDisabledRef = useRef(false);
  useEffect(() => {
    dragDisabledRef.current = !isDt || drawMode;
  }, [isDt, drawMode]);

  const ConditionalPointerSensor = useMemo(() => {
    return class extends PointerSensor {
      static activators = [
        {
          eventName: "onPointerDown" as const,
          handler: (event: React.PointerEvent, options: PointerSensorOptions) => {
            if (dragDisabledRef.current) return false;
            return PointerSensor.activators[0].handler(event, options);
          },
        },
      ];
    };
  }, []);

  const sensors = useSensors(
    useSensor(ConditionalPointerSensor, { activationConstraint: { distance: 8 } })
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const attendees = useMemo(
    () => confirmedIds.map((pid) => playersById.get(pid)).filter(Boolean) as Player[],
    [confirmedIds, playersById]
  );

  const benchPlayers = useMemo(
    () => (lineup?.bench ?? []).map((pid) => playersById.get(pid)).filter(Boolean) as Player[],
    [lineup, playersById]
  );

  const formation = lineup ? getFormationPreset(lineup.formationTemplateId) : undefined;
  const onFieldIds = useMemo(
    () => new Set(lineup?.assignments.map((a) => a.playerId) ?? []),
    [lineup]
  );
  const selectedInstructions = selectedPlayer
    ? lineup?.assignments.find((a) => a.playerId === selectedPlayer.id)?.instructions
    : undefined;

  const exportLineup: MatchLineup | null = useMemo(() => {
    if (!lineup || !match) return null;
    return {
      id: lineup.matchId,
      date: match.date,
      opponent: match.opponent,
      kickoffTime: match.kickoffTime,
      formationTemplateId: lineup.formationTemplateId,
      attendeeIds: [...lineup.assignments.map((a) => a.playerId), ...lineup.bench],
      assignments: lineup.assignments,
      bench: lineup.bench,
      createdAt: lineup.updatedAt,
      updatedAt: lineup.updatedAt,
    };
  }, [lineup, match]);

  function handleFieldTap(player: Player) {
    if (isDt && drawMode) {
      if (!arrowOriginId) {
        setArrowOriginId(player.id);
        toast.info(`Origen: ${getDisplayName(player)}. Toca el jugador destino.`);
        return;
      }
      if (arrowOriginId === player.id) {
        setArrowOriginId(null);
        toast.info("Selección cancelada.");
        return;
      }
      addArrow(arrowOriginId, player.id);
      setArrowOriginId(null);
      return;
    }
    setSelectedPlayer(player);
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePlayer(playersById.get(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePlayer(null);
    const { active } = event;
    const rect = active.rect.current.translated;
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const fieldEl = document.getElementById("field-container");
    if (fieldEl) {
      const fr = fieldEl.getBoundingClientRect();
      if (centerX >= fr.left && centerX <= fr.right && centerY >= fr.top && centerY <= fr.bottom) {
        const x = clamp(((centerX - fr.left) / fr.width) * 100, 3, 97);
        const y = clamp(((centerY - fr.top) / fr.height) * 100, 3, 97);
        moveToField(String(active.id), x, y);
        return;
      }
    }

    const benchEl = document.getElementById("bench-container");
    if (benchEl) {
      const br = benchEl.getBoundingClientRect();
      if (centerX >= br.left && centerX <= br.right && centerY >= br.top && centerY <= br.bottom) {
        moveToBench(String(active.id));
      }
    }
  }

  async function handleShare() {
    if (!exportRef.current) return;
    setSharing(true);
    try {
      const blob = await captureElementAsBlob(exportRef.current);
      const outcome = await shareOrDownloadImage(
        blob,
        `formacion-${match?.date ?? "partido"}.png`,
        "Formación del partido"
      );
      toast.success(outcome === "shared" ? "Formación compartida" : "Imagen descargada");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar la imagen.");
    } finally {
      setSharing(false);
    }
  }

  const loading = !authLoaded || !playersLoaded || !matchesLoaded || !lineupLoaded || !attendanceLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver esta formación.
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

  if (!loading && !lineup) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
        <header className="mb-3 flex items-center gap-3">
          <Link href={`/matches/${id}`}>
            <Button size="icon" variant="ghost" aria-label="Volver al partido">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="flex-1 text-xl font-semibold">
            {match?.opponent ? `vs ${match.opponent}` : "Formación"}
          </h1>
        </header>

        {isDt ? (
          attendees.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay jugadores confirmados para este partido.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {attendees.length} jugadores confirmados. Elige un esquema para ubicarlos
                automáticamente; después puedes moverlos como quieras.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FORMATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => startFormation(preset.id, attendees)}
                    className="rounded-xl border bg-card p-6 text-center text-lg font-semibold transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            El DT todavía no armó la formación para este partido.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/matches/${id}`}>
          <Button size="icon" variant="ghost" aria-label="Volver al partido">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">{formation?.label ?? "Formación"}</h1>
        <Button
          size="icon"
          variant={showInfluence ? "default" : "outline"}
          aria-label="Mostrar zonas de influencia"
          onClick={() => setShowInfluence((v) => !v)}
        >
          <Radar className="h-4 w-4" />
        </Button>
        {isDt && (
          <Button
            size="icon"
            variant={drawMode ? "default" : "outline"}
            aria-label="Modo dibujar flechas"
            onClick={() => {
              setDrawMode((v) => !v);
              setArrowOriginId(null);
            }}
          >
            <PenLine className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" onClick={handleShare} disabled={sharing}>
          <Share2 className="mr-1 h-4 w-4" />
          Compartir
        </Button>
      </header>

      {drawMode && (
        <p className="mb-3 rounded-lg border border-dashed bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          {arrowOriginId
            ? "Toca al jugador destino de la flecha (o vuelve a tocar el origen para cancelar)."
            : "Toca al jugador de origen de la flecha."}
        </p>
      )}

      {lineup && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActivePlayer(null)}
        >
          <Field
            assignments={lineup.assignments}
            playersById={playersById}
            onTapPlayer={handleFieldTap}
            showInfluence={showInfluence}
            graphics={lineup.graphics}
          />
          <BenchStrip bench={benchPlayers} onTapPlayer={setSelectedPlayer} />

          <DragOverlay dropAnimation={null}>
            {activePlayer && (
              <div className="flex min-h-[64px] min-w-[56px] scale-110 touch-none flex-col items-center justify-center gap-1 drop-shadow-2xl">
                <PlayerCardVisual player={activePlayer} variant="field" />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {isDt && drawMode && lineup && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Flechas ({lineup.graphics.filter((g) => g.type === "arrow").length})
          </p>
          <div className="space-y-1.5">
            {lineup.graphics
              .filter((g): g is ArrowGraphic => g.type === "arrow")
              .map((arrow) => {
                const from = playersById.get(arrow.fromPlayerId);
                const to = playersById.get(arrow.toPlayerId);
                return (
                  <div
                    key={arrow.id}
                    className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {from ? getDisplayName(from) : "?"} → {to ? getDisplayName(to) : "?"}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar flecha"
                      onClick={() => removeGraphic(arrow.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <PlayerInfoSheet
        player={selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        onBench={isDt ? (p) => moveToBench(p.id) : undefined}
        showBenchAction={!!selectedPlayer && onFieldIds.has(selectedPlayer.id)}
        instructions={selectedInstructions}
        onInstructionsChange={isDt ? setInstructions : undefined}
      />

      {exportLineup && (
        <div className="fixed left-[-9999px] top-0" aria-hidden>
          <ExportView
            ref={exportRef}
            lineup={exportLineup}
            formationLabel={formation?.label ?? ""}
            playersById={playersById}
            bench={benchPlayers}
          />
        </div>
      )}
    </div>
  );
}
