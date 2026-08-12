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

export type TacticalColor = "green" | "red";

/** Zona libre dibujada a mano alzada, propia del mapa táctico de un jugador. */
export interface ZoneGraphic {
  id: string;
  points: Point[];
  color: TacticalColor;
}

/** Flecha recta dibujada libremente por el DT en cualquier punto de la
 * cancha (no atada a la posición de ningún jugador). */
export interface ArrowGraphic {
  id: string;
  from: Point;
  to: Point;
  color: TacticalColor;
}

/** Mapa táctico curado por el DT para un jugador específico: qué compañeros
 * se le muestran (unidos por una línea blanca simple, sin flecha), qué
 * flechas de color dibujó libremente entre ellos, y qué zonas propias tiene
 * dibujadas. */
export interface PlayerTacticalMap {
  ownerId: string;
  connectedPlayerIds: string[];
  arrows: ArrowGraphic[];
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
