import { FormationSlot, FormationTemplate } from "@/types";

/**
 * Coordenadas en % sobre la cancha. y=0 es el arco rival (ataque),
 * y=100 es el arco propio (defensa). x=0 es el lateral izquierdo.
 */
function slots(
  entries: [x: number, y: number, position: FormationSlot["suggestedPosition"]][]
): FormationSlot[] {
  return entries.map(([x, y, suggestedPosition], i) => ({
    id: `slot-${i}`,
    x,
    y,
    suggestedPosition,
  }));
}

export const FORMATION_PRESETS: FormationTemplate[] = [
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: slots([
      [50, 92, "POR"],
      [12, 72, "LAT"],
      [35, 75, "DFC"],
      [65, 75, "DFC"],
      [88, 72, "LAT"],
      [15, 45, "VOL"],
      [38, 48, "MC"],
      [62, 48, "MC"],
      [85, 45, "VOL"],
      [38, 15, "DEL"],
      [62, 15, "DEL"],
    ]),
  },
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: slots([
      [50, 92, "POR"],
      [12, 72, "LAT"],
      [35, 75, "DFC"],
      [65, 75, "DFC"],
      [88, 72, "LAT"],
      [30, 50, "MC"],
      [50, 55, "MCD"],
      [70, 50, "MC"],
      [15, 18, "EXT"],
      [50, 12, "DEL"],
      [85, 18, "EXT"],
    ]),
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: slots([
      [50, 92, "POR"],
      [12, 72, "LAT"],
      [35, 75, "DFC"],
      [65, 75, "DFC"],
      [88, 72, "LAT"],
      [35, 58, "MCD"],
      [65, 58, "MCD"],
      [20, 35, "MP"],
      [50, 32, "MP"],
      [80, 35, "MP"],
      [50, 12, "DEL"],
    ]),
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: slots([
      [50, 92, "POR"],
      [25, 75, "DFC"],
      [50, 78, "DFC"],
      [75, 75, "DFC"],
      [10, 45, "VOL"],
      [30, 50, "MC"],
      [50, 52, "MCD"],
      [70, 50, "MC"],
      [90, 45, "VOL"],
      [38, 15, "DEL"],
      [62, 15, "DEL"],
    ]),
  },
  {
    id: "5-3-2",
    label: "5-3-2",
    slots: slots([
      [50, 92, "POR"],
      [10, 70, "LAT"],
      [30, 75, "DFC"],
      [50, 78, "DFC"],
      [70, 75, "DFC"],
      [90, 70, "LAT"],
      [30, 48, "MC"],
      [50, 52, "MCD"],
      [70, 48, "MC"],
      [38, 15, "DEL"],
      [62, 15, "DEL"],
    ]),
  },
  {
    id: "4-1-4-1",
    label: "4-1-4-1",
    slots: slots([
      [50, 92, "POR"],
      [12, 72, "LAT"],
      [35, 75, "DFC"],
      [65, 75, "DFC"],
      [88, 72, "LAT"],
      [50, 60, "MCD"],
      [15, 40, "VOL"],
      [38, 42, "MC"],
      [62, 42, "MC"],
      [85, 40, "VOL"],
      [50, 12, "DEL"],
    ]),
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: slots([
      [50, 92, "POR"],
      [25, 75, "DFC"],
      [50, 78, "DFC"],
      [75, 75, "DFC"],
      [15, 45, "VOL"],
      [38, 48, "MC"],
      [62, 48, "MC"],
      [85, 45, "VOL"],
      [15, 18, "EXT"],
      [50, 12, "DEL"],
      [85, 18, "EXT"],
    ]),
  },
];

export function getFormationPreset(id: string): FormationTemplate | undefined {
  return FORMATION_PRESETS.find((f) => f.id === id);
}
