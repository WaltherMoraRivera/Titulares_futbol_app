import { supabase } from "@/lib/supabase/client";
import {
  AttendanceStatus,
  EventParticipant,
  EventSide,
  LineupAssignment,
  Match,
  MatchAttendance,
  MatchEvent,
  MatchEventType,
  MatchInput,
  MatchLineupData,
  MatchResult,
  PlayerTacticalMap,
} from "@/types";

interface MatchRow {
  id: string;
  team_id: string;
  match_date: string;
  kickoff_time: string | null;
  opponent: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceRow {
  match_id: string;
  team_id: string;
  player_id: string;
  status: AttendanceStatus;
  updated_at: string;
}

function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    date: row.match_date,
    kickoffTime: row.kickoff_time?.slice(0, 5) ?? undefined,
    opponent: row.opponent ?? undefined,
    location: row.location ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAttendance(row: AttendanceRow): MatchAttendance {
  return {
    matchId: row.match_id,
    playerId: row.player_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function matchInputToFields(input: MatchInput) {
  return {
    match_date: input.date,
    kickoff_time: input.kickoffTime ?? null,
    opponent: input.opponent ?? null,
    location: input.location ?? null,
  };
}

export async function fetchTeamMatches(teamId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MatchRow[]).map(rowToMatch);
}

export async function fetchMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToMatch(data as MatchRow) : null;
}

export async function createTeamMatch(teamId: string, input: MatchInput): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .insert({ ...matchInputToFields(input), team_id: teamId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatch(data as MatchRow);
}

export async function updateTeamMatch(id: string, input: MatchInput): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .update({ ...matchInputToFields(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatch(data as MatchRow);
}

export async function deleteTeamMatch(id: string): Promise<void> {
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMatchAttendance(matchId: string): Promise<MatchAttendance[]> {
  const { data, error } = await supabase
    .from("match_attendance")
    .select("*")
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);
  return (data as AttendanceRow[]).map(rowToAttendance);
}

interface MatchLineupRow {
  match_id: string;
  team_id: string;
  formation_template_id: string;
  assignments: LineupAssignment[];
  bench: string[];
  tactical_maps: PlayerTacticalMap[];
  updated_at: string;
}

function rowToMatchLineup(row: MatchLineupRow): MatchLineupData {
  return {
    matchId: row.match_id,
    formationTemplateId: row.formation_template_id,
    assignments: row.assignments,
    bench: row.bench,
    tacticalMaps: row.tactical_maps ?? [],
    updatedAt: row.updated_at,
  };
}

export async function fetchMatchLineup(matchId: string): Promise<MatchLineupData | null> {
  const { data, error } = await supabase
    .from("match_lineups")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToMatchLineup(data as MatchLineupRow) : null;
}

interface SaveMatchLineupInput {
  formationTemplateId: string;
  assignments: LineupAssignment[];
  bench: string[];
  tacticalMaps: PlayerTacticalMap[];
}

export async function saveMatchLineup(
  teamId: string,
  matchId: string,
  input: SaveMatchLineupInput
): Promise<MatchLineupData> {
  const { data, error } = await supabase
    .from("match_lineups")
    .upsert(
      {
        match_id: matchId,
        team_id: teamId,
        formation_template_id: input.formationTemplateId,
        assignments: input.assignments,
        bench: input.bench,
        tactical_maps: input.tacticalMaps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatchLineup(data as MatchLineupRow);
}

interface MatchResultRow {
  match_id: string;
  team_id: string;
  team_score: number;
  opponent_score: number;
  notes: string | null;
  updated_at: string;
}

export interface MatchEventRow {
  id: string;
  match_id: string;
  side: EventSide;
  type: MatchEventType;
  minute: number | null;
  player: EventParticipant | null;
  player_out: EventParticipant | null;
  note: string | null;
  created_at: string;
}

function rowToMatchResult(row: MatchResultRow): MatchResult {
  return {
    matchId: row.match_id,
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function rowToMatchEvent(row: MatchEventRow): MatchEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    side: row.side,
    type: row.type,
    minute: row.minute ?? undefined,
    player: row.player ?? undefined,
    playerOut: row.player_out ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchMatchResult(matchId: string): Promise<MatchResult | null> {
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToMatchResult(data as MatchResultRow) : null;
}

export async function saveMatchResult(
  teamId: string,
  matchId: string,
  teamScore: number,
  opponentScore: number,
  notes: string
): Promise<MatchResult> {
  const { data, error } = await supabase
    .from("match_results")
    .upsert(
      {
        match_id: matchId,
        team_id: teamId,
        team_score: teamScore,
        opponent_score: opponentScore,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatchResult(data as MatchResultRow);
}

export async function fetchMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MatchEventRow[]).map(rowToMatchEvent);
}

export async function fetchTeamMatchEvents(teamId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from("match_events")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return (data as MatchEventRow[]).map(rowToMatchEvent);
}

export async function addMatchEvent(
  teamId: string,
  matchId: string,
  input: {
    side: EventSide;
    type: MatchEventType;
    minute?: number;
    player?: EventParticipant;
    playerOut?: EventParticipant;
    note?: string;
  }
): Promise<MatchEvent> {
  const { data, error } = await supabase
    .from("match_events")
    .insert({
      match_id: matchId,
      team_id: teamId,
      side: input.side,
      type: input.type,
      minute: input.minute ?? null,
      player: input.player ?? null,
      player_out: input.playerOut ?? null,
      note: input.note?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatchEvent(data as MatchEventRow);
}

export async function removeMatchEvent(id: string): Promise<void> {
  const { error } = await supabase.from("match_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchTeamAttendance(teamId: string): Promise<MatchAttendance[]> {
  const { data, error } = await supabase
    .from("match_attendance")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return (data as AttendanceRow[]).map(rowToAttendance);
}

export async function fetchTeamMatchResults(teamId: string): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return (data as MatchResultRow[]).map(rowToMatchResult);
}


export async function setAttendance(
  teamId: string,
  matchId: string,
  playerId: string,
  status: AttendanceStatus
): Promise<MatchAttendance> {
  const { data, error } = await supabase
    .from("match_attendance")
    .upsert(
      {
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,player_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToAttendance(data as AttendanceRow);
}
