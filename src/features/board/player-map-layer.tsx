"use client";

import { useMemo } from "react";
import { LineupAssignment, Point, ZoneGraphic } from "@/types";
import { catmullRomToClosedBezierPath } from "@/utils/curve-smoothing";

interface PlayerMapLayerProps {
  ownerAssignment: LineupAssignment;
  connectedAssignments: LineupAssignment[];
  zones: ZoneGraphic[];
}

function computeArrowPath(from: Point, to: Point) {
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

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const curveAmount = dist * 0.15;
  const controlX = midX - uy * curveAmount;
  const controlY = midY + ux * curveAmount;

  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

/** Overlay SVG del mapa táctico de un jugador: una flecha desde su posición
 * hacia cada compañero que el DT seleccionó para su mapa, más las zonas
 * propias dibujadas a mano alzada. Mismo sistema de coordenadas en % que el
 * resto de la cancha. */
export function PlayerMapLayer({
  ownerAssignment,
  connectedAssignments,
  zones,
}: PlayerMapLayerProps) {
  const arrowPaths = useMemo(
    () =>
      connectedAssignments.map((a) => ({
        id: a.playerId,
        path: computeArrowPath(ownerAssignment, a),
      })),
    [ownerAssignment, connectedAssignments]
  );

  const zonePaths = useMemo(
    () => zones.map((z) => ({ id: z.id, path: catmullRomToClosedBezierPath(z.points) })),
    [zones]
  );

  if (arrowPaths.length === 0 && zonePaths.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <marker
          id="arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="3.2"
          markerHeight="3.2"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      {zonePaths.map((zone) => (
        <path
          key={zone.id}
          d={zone.path}
          fill="var(--primary)"
          fillOpacity={0.18}
          stroke="var(--primary)"
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
          stroke="var(--accent)"
          strokeWidth={1.1}
          strokeLinecap="round"
          markerEnd="url(#arrow-head)"
        />
      ))}
    </svg>
  );
}
