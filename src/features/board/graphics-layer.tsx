"use client";

import { useMemo } from "react";
import { GraphicElement, LineupAssignment, Point } from "@/types";

interface GraphicsLayerProps {
  graphics: GraphicElement[];
  assignments: LineupAssignment[];
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

/** Superpone flechas y (más adelante) zonas libres sobre la cancha, en el
 * mismo sistema de coordenadas en % que usan las tarjetas de jugador. Las
 * flechas referencian playerId, no coordenadas fijas, así que se recalculan
 * solas cuando alguno de los dos jugadores se mueve. */
export function GraphicsLayer({ graphics, assignments }: GraphicsLayerProps) {
  const positioned = useMemo(() => {
    const byPlayer = new Map(assignments.map((a) => [a.playerId, a]));
    return graphics
      .map((g) => {
        if (g.type !== "arrow") return null;
        const from = byPlayer.get(g.fromPlayerId);
        const to = byPlayer.get(g.toPlayerId);
        if (!from || !to) return null;
        return { id: g.id, path: computeArrowPath(from, to) };
      })
      .filter((a): a is { id: string; path: string } => a !== null);
  }, [graphics, assignments]);

  if (positioned.length === 0) return null;

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

      {positioned.map((arrow) => (
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
