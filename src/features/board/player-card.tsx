"use client";

import { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Player } from "@/types";
import { PlayerCardVisual } from "./player-card-visual";

interface PlayerCardProps {
  player: Player;
  onTap: (player: Player) => void;
  /** Posición absoluta en % dentro de la cancha. Si es undefined, la tarjeta fluye normalmente (banca). */
  position?: { x: number; y: number };
  variant?: "field" | "bench";
}

export function PlayerCard({ player, onTap, position, variant = "field" }: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
  });

  const positionStyle: CSSProperties = position
    ? {
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        translate: "-50% -50%",
        transitionProperty: isDragging ? "none" : "left, top, box-shadow",
        transitionDuration: "300ms",
        transitionTimingFunction: "cubic-bezier(0.34, 1.2, 0.64, 1)",
      }
    : {};

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`${player.name}, número ${player.number}`}
      onClick={() => !isDragging && onTap(player)}
      style={{ ...positionStyle, opacity: isDragging ? 0.35 : 1 }}
      className={
        variant === "field"
          ? "flex min-h-[64px] min-w-[56px] touch-none flex-col items-center justify-center gap-1 active:cursor-grabbing"
          : "flex min-h-[64px] min-w-[64px] touch-none shrink-0 flex-col items-center justify-center gap-1 rounded-lg border bg-card px-2 py-1.5 shadow-sm transition-shadow active:cursor-grabbing active:shadow-md"
      }
      data-dragging={isDragging}
    >
      <PlayerCardVisual player={player} variant={variant} />
    </button>
  );
}
