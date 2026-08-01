"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { usePlayersStore } from "@/hooks/use-players";
import { useBoardStore } from "@/hooks/use-board";
import { useHistoryStore } from "@/hooks/use-history";
import { Field } from "@/features/board/field";
import { BenchStrip } from "@/features/board/bench-strip";
import { PlayerCardVisual } from "@/features/board/player-card-visual";
import { PlayerInfoSheet } from "@/features/board/player-info-sheet";
import { ShareDialog } from "@/features/board/share-dialog";
import { ExportView } from "@/features/board/export-view";
import { getFormationPreset } from "@/utils/formation-presets";
import { captureElementAsBlob, shareOrDownloadImage } from "@/utils/export-image";
import { Player } from "@/types";
import { ArrowLeft, Share2 } from "lucide-react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function BoardPage() {
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const {
    lineup,
    loaded: boardLoaded,
    load: loadBoard,
    moveToField,
    moveToBench,
    updateMeta,
  } = useBoardStore();

  const { addOrUpdate: archiveLineup } = useHistoryStore();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playersLoaded) loadPlayers();
    if (!boardLoaded) loadBoard();
  }, [playersLoaded, loadPlayers, boardLoaded, loadBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const benchPlayers = useMemo(
    () => (lineup?.bench ?? []).map((id) => playersById.get(id)).filter(Boolean) as Player[],
    [lineup, playersById]
  );

  const formation = lineup ? getFormationPreset(lineup.formationTemplateId) : undefined;
  const onFieldIds = useMemo(
    () => new Set(lineup?.assignments.map((a) => a.playerId) ?? []),
    [lineup]
  );

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

  async function handleShareGenerate(meta: { opponent: string; kickoffTime: string }) {
    await updateMeta(meta);
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!exportRef.current) return;
    try {
      const blob = await captureElementAsBlob(exportRef.current);
      const outcome = await shareOrDownloadImage(
        blob,
        `formacion-${lineup?.date ?? "partido"}.png`,
        "Formación del partido"
      );
      if (lineup) await archiveLineup(lineup);
      toast.success(
        outcome === "shared" ? "Formación compartida" : "Imagen descargada"
      );
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar la imagen.");
    }
  }

  if (boardLoaded && !lineup) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no armaste una formación. Empieza marcando la asistencia.
        </p>
        <Link href="/attendance">
          <Button>Marcar asistencia</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-3 flex items-center gap-3">
        <Link href="/formation">
          <Button size="icon" variant="ghost" aria-label="Volver a elegir formación">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">{formation?.label ?? "Formación"}</h1>
        <Button size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1 h-4 w-4" />
          Compartir
        </Button>
      </header>

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
            onTapPlayer={setSelectedPlayer}
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

      <PlayerInfoSheet
        player={selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        onBench={(p) => moveToBench(p.id)}
        showBenchAction={!!selectedPlayer && onFieldIds.has(selectedPlayer.id)}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        initialOpponent={lineup?.opponent}
        initialKickoffTime={lineup?.kickoffTime}
        onGenerate={handleShareGenerate}
      />

      {lineup && (
        <div className="fixed left-[-9999px] top-0" aria-hidden>
          <ExportView
            ref={exportRef}
            lineup={lineup}
            formationLabel={formation?.label ?? ""}
            playersById={playersById}
            bench={benchPlayers}
          />
        </div>
      )}
    </div>
  );
}
