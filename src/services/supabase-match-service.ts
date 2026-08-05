import { supabase } from "@/lib/supabase/client";
import {
  AttendanceStatus,
  CardType,
  LineupAssignment,
  Match,
  MatchAttendance,
  MatchCard,
  MatchGoal,
  MatchInput,
  MatchLineupData,
  MatchResult,
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
  updated_at: string;
}

function rowToMatchLineup(row: MatchLineupRow): MatchLineupData {
  return {
    matchId: row.match_id,
    formationTemplateId: row.formation_template_id,
    assignments: row.assignments,
    bench: row.bench,
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

export async function saveMatchLineup(
  teamId: string,
  matchId: string,
  formationTemplateId: string,
  assignments: LineupAssignment[],
  bench: string[]
): Promise<MatchLineupData> {
  const { data, error } = await supabase
    .from("match_lineups")
    .upsert(
      {
        match_id: matchId,
        team_id: teamId,
        formation_template_id: formationTemplateId,
        assignments,
        bench,
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

interface MatchGoalRow {
  id: string;
  match_id: string;
  player_id: string;
  minute: number | null;
}

interface MatchCardRow {
  id: string;
  match_id: string;
  player_id: string;
  card_type: CardType;
  minute: number | null;
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

function rowToMatchGoal(row: MatchGoalRow): MatchGoal {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    minute: row.minute ?? undefined,
  };
}

function rowToMatchCard(row: MatchCardRow): MatchCard {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    cardType: row.card_type,
    minute: row.minute ?? undefined,
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

export async function fetchMatchGoals(matchId: string): Promise<MatchGoal[]> {
  const { data, error } = await supabase
    .from("match_goals")
    .select("*")
    .eq("match_id", matchId)
    .order("minute", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as MatchGoalRow[]).map(rowToMatchGoal);
}

export async function addMatchGoal(
  teamId: string,
  matchId: string,
  playerId: string,
  minute?: number
): Promise<MatchGoal> {
  const { data, error } = await supabase
    .from("match_goals")
    .insert({ match_id: matchId, team_id: teamId, player_id: playerId, minute: minute ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatchGoal(data as MatchGoalRow);
}

export async function removeMatchGoal(id: string): Promise<void> {
  const { error } = await supabase.from("match_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMatchCards(matchId: string): Promise<MatchCard[]> {
  const { data, error } = await supabase
    .from("match_cards")
    .select("*")
    .eq("match_id", matchId)
    .order("minute", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as MatchCardRow[]).map(rowToMatchCard);
}

export async function addMatchCard(
  teamId: string,
  matchId: string,
  playerId: string,
  cardType: CardType,
  minute?: number
): Promise<MatchCard> {
  const { data, error } = await supabase
    .from("match_cards")
    .insert({
      match_id: matchId,
      team_id: teamId,
      player_id: playerId,
      card_type: cardType,
      minute: minute ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToMatchCard(data as MatchCardRow);
}

export async function removeMatchCard(id: string): Promise<void> {
  const { error } = await supabase.from("match_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
