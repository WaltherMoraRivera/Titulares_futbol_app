"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHistoryStore } from "@/hooks/use-history";
import { usePlayersStore } from "@/hooks/use-players";
import { PitchBackground } from "@/features/board/pitch-background";
import { getFormationPreset } from "@/utils/formation-presets";
import { getPositionColor } from "@/utils/position-colors";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { lineups, loaded: historyLoaded, load: loadHistory, updateEntry, removeEntry } =
    useHistoryStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();

  useEffect(() => {
    if (!historyLoaded) loadHistory();
    if (!playersLoaded) loadPlayers();
  }, [historyLoaded, loadHistory, playersLoaded, loadPlayers]);

  const lineup = lineups.find((l) => l.id === id);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const formation = lineup ? getFormationPreset(lineup.formationTemplateId) : undefined;

  const [result, setResult] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (lineup) {
      setResult(lineup.result ?? "");
      setComments(lineup.comments ?? "");
    }
  }, [lineup]);

  if (historyLoaded && !lineup) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Formación no encontrada.</p>
        <Link href="/history">
          <Button variant="outline">Volver al historial</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-3 flex items-center gap-3">
        <Link href="/history">
          <Button size="icon" variant="ghost" aria-label="Volver al historial">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">
          {lineup?.opponent ? `vs ${lineup.opponent}` : formation?.label}
        </h1>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Eliminar formación del historial"
          onClick={async () => {
            if (lineup && confirm("¿Eliminar esta formación del historial?")) {
              await removeEntry(lineup.id);
              router.push("/history");
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      {lineup && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {lineup.date}
            {lineup.kickoffTime ? ` · ${lineup.kickoffTime}` : ""} · {formation?.label}
          </p>

          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-inner">
            <PitchBackground />
            {lineup.assignments.map((a) => {
              const player = playersById.get(a.playerId);
              if (!player) return null;
              const color = player.color ?? getPositionColor(player.primaryPosition);
              return (
                <div
                  key={a.playerId}
                  className="absolute flex flex-col items-center gap-0.5"
                  style={{ left: `${a.x}%`, top: `${a.y}%`, translate: "-50% -50%" }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 text-xs font-extrabold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {player.number}
                  </span>
                  <span className="max-w-[64px] truncate text-[10px] font-semibold text-white drop-shadow">
                    {player.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="result">Resultado</Label>
              <Input
                id="result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                onBlur={() => updateEntry(lineup.id, { result })}
                placeholder="3-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comments">Comentarios</Label>
              <Input
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                onBlur={() => updateEntry(lineup.id, { comments })}
                placeholder="Notas del partido..."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
