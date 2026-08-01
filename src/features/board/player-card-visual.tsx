import { Player } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { getDisplayName } from "@/utils/player-display";

interface PlayerCardVisualProps {
  player: Player;
  variant?: "field" | "bench";
  hasInstructions?: boolean;
}

export function PlayerCardVisual({
  player,
  variant = "field",
  hasInstructions = false,
}: PlayerCardVisualProps) {
  const color = player.color ?? getPositionColor(player.primaryPosition);
  const circleSize = variant === "field" ? "h-12 w-12" : "h-11 w-11";
  const circleShadow = variant === "field" ? "shadow-lg" : "";

  return (
    <>
      <span className="relative">
        <span
          className={`flex ${circleSize} items-center justify-center rounded-full border-2 border-white text-base font-extrabold text-white ${circleShadow}`}
          style={{ backgroundColor: color }}
        >
          {player.number}
        </span>
        {hasInstructions && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white text-[9px]"
            style={{ backgroundColor: "var(--primary)" }}
            title="Tiene instrucciones tácticas"
          >
            📋
          </span>
        )}
      </span>
      <span
        className={
          variant === "field"
            ? "max-w-[76px] truncate rounded bg-black/50 px-1.5 py-0.5 text-xs font-semibold leading-tight text-white"
            : "max-w-[76px] truncate text-xs font-semibold leading-tight text-foreground"
        }
      >
        {getDisplayName(player, { short: true })}
      </span>
    </>
  );
}
