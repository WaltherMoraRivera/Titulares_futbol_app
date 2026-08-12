"use client";

import { useMemo } from "react";
import { ArrowGraphic, LineupAssignment, Point, TacticalColor, ZoneGraphic } from "@/types";
import { catmullRomToClosedBezierPath } from "@/utils/curve-smoothing";
import { TACTICAL_COLOR_HEX } from "@/utils/tactical-colors";

interface PlayerMapLayerProps {
  ownerAssignment: LineupAssignment;
  connectedAssignments: LineupAssignment[];
  arrows: ArrowGraphic[];
  zones: ZoneGraphic[];
}

function computeStraightPath(from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const trim = Math.min(6, dist * 0.3);

  const startX = from.x + ux * trim;
  const startY = from.y + uy * trim;
  const endX = to.x - ux * trim;
  const endY = to.y - uy * trim;

  return `M ${startX} ${startY} L ${endX} ${endY}`;
}

const COLORS: TacticalColor[] = ["green", "red"];

/** Overlay SVG del mapa táctico de un jugador:
 * - líneas blancas semi-transparentes, sin flecha, entre el dueño y cada
 *   compañero seleccionado (solo indican "están relacionados").
 * - flechas rectas de color (verde/rojo) dibujadas libremente por el DT
 *   entre cualquiera de los jugadores visibles en el mapa.
 * - zonas cerradas dibujadas a mano alzada, también en verde o rojo. */
export function PlayerMapLayer({
  ownerAssignment,
  connectedAssignments,
  arrows,
  zones,
}: PlayerMapLayerProps) {
  const positioned = useMemo(() => {
    const map = new Map<string, LineupAssignment>();
    map.set(ownerAssignment.playerId, ownerAssignment);
    for (const a of connectedAssignments) map.set(a.playerId, a);
    return map;
  }, [ownerAssignment, connectedAssignments]);

  const arrowPaths = useMemo(
    () =>
      arrows
        .map((arrow) => {
          const from = positioned.get(arrow.fromPlayerId);
          const to = positioned.get(arrow.toPlayerId);
          if (!from || !to) return null;
          return { id: arrow.id, color: arrow.color, path: computeStraightPath(from, to) };
        })
        .filter((a): a is { id: string; color: TacticalColor; path: string } => a !== null),
    [arrows, positioned]
  );

  const zonePaths = useMemo(
    () =>
      zones.map((z) => ({
        id: z.id,
        color: z.color,
        path: catmullRomToClosedBezierPath(z.points),
      })),
    [zones]
  );

  if (connectedAssignments.length === 0 && arrowPaths.length === 0 && zonePaths.length === 0) {
    return null;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        {COLORS.map((color) => (
          <marker
            key={color}
            id={`arrow-head-${color}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="3.2"
            markerHeight="3.2"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={TACTICAL_COLOR_HEX[color]} />
          </marker>
        ))}
      </defs>

      {connectedAssignments.map((a) => (
        <line
          key={a.playerId}
          x1={ownerAssignment.x}
          y1={ownerAssignment.y}
          x2={a.x}
          y2={a.y}
          stroke="white"
          strokeOpacity={0.35}
          strokeWidth={0.4}
        />
      ))}

      {zonePaths.map((zone) => (
        <path
          key={zone.id}
          d={zone.path}
          fill={TACTICAL_COLOR_HEX[zone.color]}
          fillOpacity={0.18}
          stroke={TACTICAL_COLOR_HEX[zone.color]}
          strokeOpacity={0.7}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      ))}

      {arrowPaths.map((arrow) => (
        <path
          key={arrow.id}
          d={arrow.path}
          fill="none"
          stroke={TACTICAL_COLOR_HEX[arrow.color]}
          strokeWidth={1.1}
          strokeLinecap="round"
          markerEnd={`url(#arrow-head-${arrow.color})`}
        />
      ))}
    </svg>
  );
}
