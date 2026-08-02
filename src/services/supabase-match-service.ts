import { supabase } from "@/lib/supabase/client";
import { AttendanceStatus, Match, MatchAttendance, MatchInput } from "@/types";

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
