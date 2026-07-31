import { v4 as uuid } from "uuid";
import { Player, PlayerInput, PlayerSortField } from "@/types";
import { storageAdapter, STORAGE_KEYS } from "@/storage";
import {
  PlayerDraft,
  ValidationResult,
  validatePlayerDraft,
} from "@/utils/validate-player";
import { parseCsv } from "@/utils/csv-parser";

export async function loadPlayers(): Promise<Player[]> {
  return (await storageAdapter.get<Player[]>(STORAGE_KEYS.players)) ?? [];
}

export async function savePlayers(players: Player[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.players, players);
}

export function buildPlayer(input: PlayerInput): Player {
  const now = new Date().toISOString();
  return { id: uuid(), createdAt: now, updatedAt: now, ...input };
}

export function sortPlayers(players: Player[], field: PlayerSortField): Player[] {
  const sorted = [...players];
  sorted.sort((a, b) => {
    if (field === "number") return a.number - b.number;
    if (field === "primaryPosition")
      return a.primaryPosition.localeCompare(b.primaryPosition);
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

export function searchPlayers(players: Player[], query: string): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return players;
  return players.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      String(p.number).includes(q) ||
      p.primaryPosition.toLowerCase().includes(q)
  );
}

export interface ImportRowResult {
  row: number;
  draft: PlayerDraft;
  result: ValidationResult;
}

export function parseImportFile(
  fileName: string,
  content: string
): PlayerDraft[] {
  if (fileName.toLowerCase().endsWith(".json")) {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("El JSON debe ser un arreglo de jugadores.");
    }
    return data as PlayerDraft[];
  }

  const rows = parseCsv(content);
  return rows.map((r) => ({
    name: r.name ?? r.nombre ?? "",
    number: r.number ?? r.numero ?? r["número"] ?? "",
    primaryPosition: r.primaryPosition ?? r.posicionPrincipal ?? r["posición principal"] ?? "",
    secondaryPosition:
      r.secondaryPosition ?? r.posicionSecundaria ?? r["posición secundaria"] ?? "",
    dominantFoot: r.dominantFoot ?? r.pie ?? "",
    active: r.active ?? r.activo ?? "true",
  }));
}

export function exportPlayersToJson(players: Player[]): string {
  const exportable = players.map((p) => ({
    name: p.name,
    number: p.number,
    primaryPosition: p.primaryPosition,
    secondaryPosition: p.secondaryPosition,
    dominantFoot: p.dominantFoot,
    active: p.active,
  }));
  return JSON.stringify(exportable, null, 2);
}

export function validateImportDrafts(
  drafts: PlayerDraft[],
  existingNumbers: number[]
): ImportRowResult[] {
  const usedNumbers = [...existingNumbers];
  return drafts.map((draft, i) => {
    const result = validatePlayerDraft(draft, usedNumbers);
    if (result.valid && result.normalized) {
      usedNumbers.push(result.normalized.number);
    }
    return { row: i + 2, draft, result };
  });
}
