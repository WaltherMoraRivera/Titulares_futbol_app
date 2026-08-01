import { forwardRef } from "react";
import { LineupAssignment, MatchLineup, Player } from "@/types";
import { getPositionColor } from "@/utils/position-colors";
import { getDisplayName } from "@/utils/player-display";
import { PitchBackground } from "./pitch-background";

interface ExportViewProps {
  lineup: MatchLineup;
  formationLabel: string;
  playersById: Map<string, Player>;
  bench: Player[];
}

function ExportChip({ player, assignment }: { player: Player; assignment: LineupAssignment }) {
  const color = player.color ?? getPositionColor(player.primaryPosition);
  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{
        left: `${assignment.x}%`,
        top: `${assignment.y}%`,
        translate: "-50% -50%",
      }}
    >
      <span className="relative">
        <span
          className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-white text-lg font-extrabold text-white shadow"
          style={{ backgroundColor: color }}
        >
          {player.number}
        </span>
        {assignment.instructions?.trim() && (
          <span
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white text-[10px]"
            style={{ backgroundColor: "#d9a24b" }}
          >
            📋
          </span>
        )}
      </span>
      <span className="max-w-[96px] truncate rounded bg-black/50 px-1.5 py-0.5 text-xs font-semibold text-white">
        {getDisplayName(player, { short: true })}
      </span>
    </div>
  );
}

export const ExportView = forwardRef<HTMLDivElement, ExportViewProps>(function ExportView(
  { lineup, formationLabel, playersById, bench },
  ref
) {
  const instructedAssignments = lineup.assignments.filter((a) => a.instructions?.trim());

  return (
    <div
      ref={ref}
      className="flex w-[720px] flex-col gap-4 p-6 font-sans"
      style={{ backgroundColor: "#17140f" }}
    >
      <div className="flex items-center justify-between text-white">
        <div>
          <p className="text-lg font-bold">
            ⚽ <span style={{ color: "#d9a24b" }}>TITULARES</span> ⚽ — {formationLabel}
          </p>
          <p className="text-sm text-white/60">
            {lineup.date}
            {lineup.kickoffTime ? ` · ${lineup.kickoffTime}` : ""}
            {lineup.opponent ? ` · vs ${lineup.opponent}` : ""}
          </p>
        </div>
      </div>

      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl">
        <PitchBackground />
        {lineup.assignments.map((a) => {
          const player = playersById.get(a.playerId);
          if (!player) return null;
          return <ExportChip key={a.playerId} player={player} assignment={a} />;
        })}
      </div>

      {instructedAssignments.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-white/60">Instrucciones tácticas</p>
          <div className="space-y-1.5">
            {instructedAssignments.map((a) => {
              const player = playersById.get(a.playerId);
              if (!player) return null;
              return (
                <p key={a.playerId} className="text-xs text-white">
                  <span className="font-bold" style={{ color: "#d9a24b" }}>
                    {player.number} {getDisplayName(player, { short: true })}:
                  </span>{" "}
                  {a.instructions}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {bench.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-white/60">Banca</p>
          <div className="flex flex-wrap gap-2">
            {bench.map((player) => {
              const color = player.color ?? getPositionColor(player.primaryPosition);
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                  style={{ backgroundColor: "#26211a" }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {player.number}
                  </span>
                  <span className="text-xs text-white">{getDisplayName(player)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
