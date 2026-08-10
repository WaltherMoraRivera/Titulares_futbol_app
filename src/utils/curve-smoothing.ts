import { Point } from "@/types";

/**
 * Simplificación Ramer-Douglas-Peucker: descarta vértices casi colineales de
 * un trazo capturado a mano alzada, preservando los puntos de inflexión que
 * definen su forma. `tolerance` está en las mismas unidades que los puntos
 * (aquí, % de la cancha).
 */
export function simplifyPoints(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;

  const end = points.length - 1;
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * Convierte una lista de puntos en un `d` de SVG suave, interpolando un
 * spline de Catmull-Rom uniforme y traduciendo sus tangentes a curvas
 * cúbicas de Bézier (el atributo `d` de SVG no soporta Catmull-Rom nativo).
 * Los extremos se "clampan" duplicando el primer y último punto.
 */
export function catmullRomToBezierPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const padded = [points[0], ...points, points[points.length - 1]];
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/** Igual que `catmullRomToBezierPath`, pero cierra el contorno envolviendo
 * las tangentes alrededor del primer/último punto en vez de clamparlas —
 * para dibujar una "zona" cerrada en vez de un trazo abierto. */
export function catmullRomToClosedBezierPath(points: Point[]): string {
  const n = points.length;
  if (n < 3) return catmullRomToBezierPath(points);

  const padded = [points[n - 1], ...points, points[0], points[1]];
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < n; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d + " Z";
}
