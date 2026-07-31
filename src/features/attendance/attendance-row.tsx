"use client";

import { Player, POSITION_LABELS } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { Checkbox } from "@/components/ui/checkbox";

interface AttendanceRowProps {
  player: Player;
  checked: boolean;
  onToggle: (playerId: string) => void;
}

export function AttendanceRow({ player, checked, onToggle }: AttendanceRowProps) {
  const color = player.color ?? getPositionColor(player.primaryPosition);

  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors data-[checked=true]:border-primary data-[checked=true]:bg-primary/5"
      data-checked={checked}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {player.number}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{player.name}</p>
        <p className="text-xs text-muted-foreground">
          {POSITION_LABELS[player.primaryPosition]}
        </p>
      </div>

      <Checkbox checked={checked} onCheckedChange={() => onToggle(player.id)} />
    </label>
  );
}
