import { LineupAssignment, PlayerTacticalMap } from "./lineup";

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  kickoffTime?: string; // HH:MM
  opponent?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export type MatchInput = Omit<Match, "id" | "createdAt" | "updatedAt">;

export type AttendanceStatus = "pending" | "confirmed" | "declined";

export interface MatchAttendance {
  matchId: string;
  playerId: string;
  status: AttendanceStatus;
  updatedAt: string;
}

export interface MatchLineupData {
  matchId: string;
  formationTemplateId: string;
  assignments: LineupAssignment[];
  bench: string[];
  tacticalMaps: PlayerTacticalMap[];
  updatedAt: string;
}

export interface MatchResult {
  matchId: string;
  teamScore: number;
  opponentScore: number;
  notes?: string;
  updatedAt: string;
}

export type CardType = "yellow" | "red";

export interface MatchGoal {
  id: string;
  matchId: string;
  playerId: string;
  minute?: number;
}

export interface MatchCard {
  id: string;
  matchId: string;
  playerId: string;
  cardType: CardType;
  minute?: number;
}

/** Bitácora en vivo del partido: cada fila es un evento (gol, tarjeta,
 * cambio o comentario libre), de nuestro equipo o del rival. Del rival no
 * tenemos plantilla cargada — solo sabemos el dorsal y, si acaso, el
 * nombre — por eso `player`/`playerOut` son "quien sea que se conozca",
 * no un jugador obligatorio de la base. */
export type EventSide = "own" | "rival";
export type MatchEventType = "goal" | "yellow_card" | "red_card" | "substitution" | "comment";

export interface EventParticipant {
  /** Solo si side === "own": referencia a la plantilla propia. */
  playerId?: string;
  /** Dorsal. Obligatorio si side === "rival" (es lo único seguro que se ve). */
  number?: number;
  /** Nombre. Para "own" se resuelve casi siempre vía playerId; para
   * "rival" es opcional — a veces solo se tiene el número. */
  name?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  side: EventSide;
  type: MatchEventType;
  minute?: number;
  /** Protagonista: goleador, amonestado/expulsado, o quien entra en un cambio. */
  player?: EventParticipant;
  /** Solo type === "substitution": quien sale. */
  playerOut?: EventParticipant;
  /** Texto libre. Obligatorio si type === "comment"; opcional como aclaración en cualquier otro. */
  note?: string;
  createdAt: string;
}
