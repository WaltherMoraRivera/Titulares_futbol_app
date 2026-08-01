"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Player, POSITION_LABELS } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { getDisplayName } from "@/utils/player-display";
import { Button } from "@/components/ui/button";

interface PlayerInfoSheetProps {
  player: Player | null;
  onOpenChange: (open: boolean) => void;
  onBench?: (player: Player) => void;
  showBenchAction: boolean;
}

export function PlayerInfoSheet({
  player,
  onOpenChange,
  onBench,
  showBenchAction,
}: PlayerInfoSheetProps) {
  const color = player ? player.color ?? getPositionColor(player.primaryPosition) : "#888";

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

              {showBenchAction && onBench && (
                <Button
                  variant="outline"
                  className="mt-3 w-full"
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
