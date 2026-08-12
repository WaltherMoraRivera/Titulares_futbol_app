"use client";

import { useRef, useState } from "react";
import { Point } from "@/types";

interface ArrowDrawingLayerProps {
  active: boolean;
  color: string;
  onComplete: (from: Point, to: Point) => void;
}

const MIN_ARROW_LENGTH = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Superficie de captura para dibujar flechas rectas libres (sin atarlas a
 * ningún jugador). Arrastrás desde el origen hasta el destino; al soltar,
 * si el trazo tiene largo mínimo, avisa al padre con `onComplete`. */
export function ArrowDrawingLayer({ active, color, onComplete }: ArrowDrawingLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [from, setFrom] = useState<Point | null>(null);
  const [to, setTo] = useState<Point | null>(null);

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
    setFrom(point);
    setTo(point);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!active || !drawingRef.current) return;
    const point = toPercent(event.clientX, event.clientY);
    if (!point) return;
    setTo(point);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setFrom((start) => {
      setTo((end) => {
        if (start && end && Math.hypot(end.x - start.x, end.y - start.y) >= MIN_ARROW_LENGTH) {
          onComplete(start, end);
        }
        return null;
      });
      return null;
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
      {from && to && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <marker
              id="arrow-preview-head"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="3.2"
              markerHeight="3.2"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          </defs>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={color}
            strokeWidth={1.1}
            strokeLinecap="round"
            markerEnd="url(#arrow-preview-head)"
          />
        </svg>
      )}
    </div>
  );
}
