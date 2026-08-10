"use client";

import { useRef, useState } from "react";
import { Point } from "@/types";
import { catmullRomToBezierPath, simplifyPoints } from "@/utils/curve-smoothing";

interface ZoneDrawingLayerProps {
  active: boolean;
  onComplete: (points: Point[]) => void;
}

const SIMPLIFY_TOLERANCE = 1.2;
const MIN_ZONE_POINTS = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Superficie de captura para dibujar zonas libres a mano alzada. Solo se
 * monta (y bloquea gestos) cuando `active` es true. Guarda el trazo crudo
 * en estado local mientras se dibuja y recién al soltar el dedo lo
 * simplifica (Ramer-Douglas-Peucker) y avisa al padre con `onComplete`. */
export function ZoneDrawingLayer({ active, onComplete }: ZoneDrawingLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);

  function toPercent(clientX: number, clientY: number): Point | null {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!active) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = toPercent(event.clientX, event.clientY);
    setDraftPoints(point ? [point] : []);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!active || !drawingRef.current) return;
    const point = toPercent(event.clientX, event.clientY);
    if (!point) return;
    setDraftPoints((prev) => [...prev, point]);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDraftPoints((prev) => {
      const simplified = simplifyPoints(prev, SIMPLIFY_TOLERANCE);
      if (simplified.length >= MIN_ZONE_POINTS) onComplete(simplified);
      return [];
    });
  }

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrawing}
      onPointerCancel={finishDrawing}
    >
      {draftPoints.length >= 2 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d={catmullRomToBezierPath(draftPoints)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
