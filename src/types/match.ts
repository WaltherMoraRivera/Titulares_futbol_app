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
