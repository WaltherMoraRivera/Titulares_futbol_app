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

/** Zona libre dibujada a mano alzada, propia del mapa táctico de un jugador. */
export interface ZoneGraphic {
  id: string;
  points: Point[];
}

/** Mapa táctico curado por el DT para un jugador específico: qué compañeros
 * se le muestran (con una flecha desde su posición hacia cada uno) y qué
 * zonas propias tiene dibujadas. No hay coordenadas fijas para las flechas
 * — se recalculan desde la posición actual de cada jugador en `assignments`. */
export interface PlayerTacticalMap {
  ownerId: string;
  connectedPlayerIds: string[];
  zones: ZoneGraphic[];
}

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
