export const POSITIONS = [
  "POR",
  "DFC",
  "LAT",
  "MCD",
  "MC",
  "VOL",
  "EXT",
  "MP",
  "DEL",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  POR: "Portero",
  DFC: "Defensa Central",
  LAT: "Lateral",
  MCD: "Mediocampista Defensivo",
  MC: "Mediocampista Central",
  VOL: "Volante",
  EXT: "Extremo",
  MP: "Mediapunta",
  DEL: "Delantero",
};
