import { v4 as uuid } from "uuid";
import { MatchLineup, MatchLineupInput } from "@/types";
import { storageAdapter, STORAGE_KEYS } from "@/storage";

export async function loadCurrentLineup(): Promise<MatchLineup | null> {
  return storageAdapter.get<MatchLineup>(STORAGE_KEYS.currentLineup);
}

export async function saveCurrentLineup(lineup: MatchLineup | null): Promise<void> {
  if (lineup === null) {
    await storageAdapter.remove(STORAGE_KEYS.currentLineup);
    return;
  }
  await storageAdapter.set(STORAGE_KEYS.currentLineup, lineup);
}

export function buildLineup(input: MatchLineupInput): MatchLineup {
  const now = new Date().toISOString();
  return { id: uuid(), createdAt: now, updatedAt: now, ...input };
}

export async function loadLineupHistory(): Promise<MatchLineup[]> {
  return (await storageAdapter.get<MatchLineup[]>(STORAGE_KEYS.lineups)) ?? [];
}

export async function saveLineupHistory(lineups: MatchLineup[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.lineups, lineups);
}
