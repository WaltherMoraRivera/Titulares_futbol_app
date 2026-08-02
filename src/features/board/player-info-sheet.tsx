"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Player, POSITION_LABELS } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { getDisplayName } from "@/utils/player-display";
import { Button } from "@/components/ui/button";

interface PlayerInfoSheetProps {
  player: Player | null;
  onOpenChange: (open: boolean) => void;
  onBench?: (player: Player) => void;
  showBenchAction: boolean;
  instructions?: string;
  onInstructionsChange?: (playerId: string, instructions: string) => void;
}

export function PlayerInfoSheet({
  player,
  onOpenChange,
  onBench,
  showBenchAction,
  instructions,
  onInstructionsChange,
}: PlayerInfoSheetProps) {
  const color = player ? player.color ?? getPositionColor(player.primaryPosition) : "#888";
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(instructions ?? "");
  }, [player?.id, instructions]);

  return (
    <Sheet open={!!player} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {player && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold text-white"
                  style={{ backgroundColor: color }}
                >
                  {player.number}
                </span>
                {getDisplayName(player)}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-2 px-4 pb-6 text-sm">
              {player.showAlias && player.alias?.trim() && (
                <p>
                  <span className="text-muted-foreground">Nombre: </span>
                  {player.name}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Posición principal: </span>
                {POSITION_LABELS[player.primaryPosition]}
              </p>
              {player.secondaryPosition && (
                <p>
                  <span className="text-muted-foreground">Posición secundaria: </span>
                  {POSITION_LABELS[player.secondaryPosition]}
                </p>
              )}
              {player.dominantFoot && (
                <p>
                  <span className="text-muted-foreground">Pie dominante: </span>
                  {player.dominantFoot}
                </p>
              )}

              {showBenchAction && onInstructionsChange && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="instructions">Instrucciones tácticas</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Ej: Marca personal al 10 rival, cerrar la banda izquierda..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => onInstructionsChange(player.id, draft)}
                    rows={3}
                  />
                </div>
              )}

              {showBenchAction && !onInstructionsChange && instructions?.trim() && (
                <div className="space-y-1.5 pt-1">
                  <Label>Instrucciones tácticas</Label>
                  <p className="rounded-md border bg-muted/50 p-2 text-sm">{instructions}</p>
                </div>
              )}

              {showBenchAction && onBench && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onBench(player);
                    onOpenChange(false);
                  }}
                >
                  Quitar de cancha
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
