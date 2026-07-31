export interface LineupAssignment {
  slotId: string;
  playerId: string;
  x: number;
  y: number;
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
