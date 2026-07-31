"use client";

import { Player, POSITION_LABELS } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface PlayerRowProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}

export function PlayerRow({ player, onEdit, onDelete }: PlayerRowProps) {
  const color = player.color ?? getPositionColor(player.primaryPosition);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {player.number}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{player.name}</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Badge variant="secondary" style={{ color }}>
            {POSITION_LABELS[player.primaryPosition]}
          </Badge>
          {player.secondaryPosition && (
            <Badge variant="outline">{POSITION_LABELS[player.secondaryPosition]}</Badge>
          )}
          {!player.active && <Badge variant="destructive">Inactivo</Badge>}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Editar a ${player.name}`}
          onClick={() => onEdit(player)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Eliminar a ${player.name}`}
          onClick={() => onDelete(player)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
