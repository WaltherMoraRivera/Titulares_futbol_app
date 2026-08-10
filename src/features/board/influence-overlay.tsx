"use client";

import { useMemo } from "react";
import { LineupAssignment, Player } from "@/types";
import { getPositionColor } from "@/utils/position-colors";

interface InfluenceOverlayProps {
  assignments: LineupAssignment[];
  playersById: Map<string, Player>;
}

interface PositionedAssignment extends LineupAssignment {
  color: string;
}

function distance(a: LineupAssignment, b: LineupAssignment) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Visualización puramente táctica sobre la formación ya cargada: no hay
 * datos reales de movimiento ni de pases, así que las "zonas" son un
 * degradé alrededor de la posición asignada a cada jugador, y las líneas
 * conectan a cada jugador con sus dos compañeros más cercanos en el
 * esquema (cercanía geométrica, no pases registrados).
 */
export function InfluenceOverlay({ assignments, playersById }: InfluenceOverlayProps) {
  const positioned = useMemo<PositionedAssignment[]>(
    () =>
      assignments
        .map((a) => {
          const player = playersById.get(a.playerId);
          if (!player) return null;
          return { ...a, color: player.color ?? getPositionColor(player.primaryPosition) };
        })
        .filter((a): a is PositionedAssignment => a !== null),
    [assignments, playersById]
  );

  const links = useMemo(() => {
    const pairs = new Map<string, { a: PositionedAssignment; b: PositionedAssignment }>();
    for (const a of positioned) {
      const nearest = positioned
        .filter((b) => b.playerId !== a.playerId)
        .sort((x, y) => distance(a, x) - distance(a, y))
        .slice(0, 2);
      for (const b of nearest) {
        const key = [a.playerId, b.playerId].sort().join("::");
        if (!pairs.has(key)) pairs.set(key, { a, b });
      }
    }
    return Array.from(pairs.entries()).map(([key, pair]) => ({ key, ...pair }));
  }, [positioned]);

  if (positioned.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        {positioned.map((a) => (
          <radialGradient key={a.playerId} id={`zone-${a.playerId}`}>
            <stop offset="0%" stopColor={a.color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={a.color} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>

      <g style={{ mixBlendMode: "screen" }}>
        {positioned.map((a) => (
          <circle key={a.playerId} cx={a.x} cy={a.y} r={13} fill={`url(#zone-${a.playerId})`} />
        ))}
      </g>

      <g stroke="white" strokeOpacity={0.28} strokeWidth={0.4}>
        {links.map(({ key, a, b }) => (
          <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>
    </svg>
  );
}
