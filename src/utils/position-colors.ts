import { Position } from "@/types";

export const POSITION_COLORS: Record<Position, string> = {
  POR: "#f59e0b", // ámbar
  DFC: "#2563eb", // azul
  LAT: "#0ea5e9", // celeste
  MCD: "#8b5cf6", // violeta
  MC: "#4f46e5", // índigo
  VOL: "#22c55e", // verde
  EXT: "#14b8a6", // teal
  MP: "#ec4899", // rosa
  DEL: "#ef4444", // rojo
};

export function getPositionColor(position: Position): string {
  return POSITION_COLORS[position];
}
