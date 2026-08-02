import { supabase } from "@/lib/supabase/client";
import { Player, PlayerInput, Position, DominantFoot } from "@/types";

interface PlayerRow {
  id: string;
  team_id: string;
  name: string;
  alias: string | null;
  show_alias: boolean;
  number: number;
  primary_position: string;
  secondary_position: string | null;
  dominant_foot: string | null;
  active: boolean;
  color: string | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias ?? undefined,
    showAlias: row.show_alias,
    number: row.number,
    primaryPosition: row.primary_position as Position,
    secondaryPosition: (row.secondary_position ?? undefined) as Position | undefined,
    dominantFoot: (row.dominant_foot ?? undefined) as DominantFoot | undefined,
    active: row.active,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function playerInputToFields(input: PlayerInput) {
  return {
    name: input.name,
    alias: input.alias ?? null,
    show_alias: input.showAlias ?? false,
    number: input.number,
    primary_position: input.primaryPosition,
    secondary_position: input.secondaryPosition ?? null,
    dominant_foot: input.dominantFoot ?? null,
    active: input.active,
    color: input.color ?? null,
  };
}

export async function fetchTeamPlayers(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("number");
  if (error) throw new Error(error.message);
  return (data as PlayerRow[]).map(rowToPlayer);
}

export async function createTeamPlayer(teamId: string, input: PlayerInput): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .insert({ ...playerInputToFields(input), team_id: teamId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToPlayer(data as PlayerRow);
}

export async function createTeamPlayers(
  teamId: string,
  inputs: PlayerInput[]
): Promise<Player[]> {
  const rows = inputs.map((input) => ({ ...playerInputToFields(input), team_id: teamId }));
  const { data, error } = await supabase.from("players").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data as PlayerRow[]).map(rowToPlayer);
}

export async function updateTeamPlayer(id: string, input: PlayerInput): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .update({ ...playerInputToFields(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToPlayer(data as PlayerRow);
}

export async function deleteTeamPlayer(id: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
