export interface LineupAssignment {
  slotId: string;
  playerId: string;
  x: number;
  y: number;
  instructions?: string;
}

export interface Point {
  x: number;
  y: number;
}

/** Flecha entre dos jugadores: guarda la relación, no coordenadas fijas —
 * al mover a cualquiera de los dos, la curva se recalcula sola. */
export interface ArrowGraphic {
  id: string;
  type: "arrow";
  fromPlayerId: string;
  toPlayerId: string;
}

/** Zona libre dibujada a mano alzada (Fase 7.3). */
export interface ZoneGraphic {
  id: string;
  type: "zone";
  points: Point[];
}

export type GraphicElement = ArrowGraphic | ZoneGraphic;

export interface MatchLineup {
  id: string;
  date: string;
  opponent?: string;
  kickoffTime?: string;
  result?: string;
  comments?: string;
  formationTemplateId: string;
  attendeeIds: string[];
  assignments: LineupAssignment[];
  bench: string[];
  createdAt: string;
  updatedAt: string;
}

export type MatchLineupInput = Omit<
  MatchLineup,
  "id" | "createdAt" | "updatedAt"
>;
