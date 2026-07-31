import { Player } from "@/types";
import { getPositionColor } from "@/utils/position-colors";

interface PlayerCardVisualProps {
  player: Player;
  variant?: "field" | "bench";
}

export function PlayerCardVisual({ player, variant = "field" }: PlayerCardVisualProps) {
  const color = player.color ?? getPositionColor(player.primaryPosition);
  const circleSize = variant === "field" ? "h-12 w-12" : "h-11 w-11";
  const circleShadow = variant === "field" ? "shadow-lg" : "";

  return (
    <>
      <span
        className={`flex ${circleSize} items-center justify-center rounded-full border-2 border-white text-base font-extrabold text-white ${circleShadow}`}
        style={{ backgroundColor: color }}
      >
        {player.number}
      </span>
      <span
        className={
          variant === "field"
            ? "max-w-[76px] truncate rounded bg-black/50 px-1.5 py-0.5 text-xs font-semibold leading-tight text-white"
            : "max-w-[76px] truncate text-xs font-semibold leading-tight text-foreground"
        }
      >
        {player.name.split(" ")[0]}
      </span>
    </>
  );
}
