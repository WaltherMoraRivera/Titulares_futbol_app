import { MatchEvent, MatchLineupData } from "@/types";

/** Duración de un partido de la liga: 30' por tiempo. */
export const MATCH_DURATION_MINUTES = 60;

/**
 * Minutos jugados por cada jugador propio en un partido, a partir de la
 * formación inicial (`match_lineups.assignments`) y los cambios/expulsiones
 * cargados en la bitácora en vivo (`match_events`).
 *
 * Devuelve `null` si el partido no tiene ningún cambio cargado — no hay
 * forma de distinguir "nadie salió" de "los cambios no se cargaron", así
 * que ese partido queda afuera de la estadística de minutos en vez de
 * arriesgar un número incorrecto (decisión tomada con el usuario).
 */
export function computeMinutesPlayed(
  lineup: MatchLineupData,
  events: MatchEvent[]
): Record<string, number> | null {
  const substitutions = events.filter((e) => e.type === "substitution" && e.side === "own");
  if (substitutions.length === 0) return null;

  const maxEventMinute = events.reduce((max, e) => Math.max(max, e.minute ?? 0), 0);
  const endMinute = Math.max(MATCH_DURATION_MINUTES, maxEventMinute);

  const entryMinute = new Map<string, number>();
  for (const assignment of lineup.assignments) entryMinute.set(assignment.playerId, 0);

  const exitMinute = new Map<string, number>();

  for (const sub of [...substitutions].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))) {
    const minute = sub.minute ?? 0;
    if (sub.playerOut?.playerId) exitMinute.set(sub.playerOut.playerId, minute);
    if (sub.player?.playerId) entryMinute.set(sub.player.playerId, minute);
  }

  // Una expulsión también corta los minutos de quien la recibe.
  for (const card of events) {
    if (card.type !== "red_card" || card.side !== "own" || !card.player?.playerId) continue;
    const playerId = card.player.playerId;
    const minute = card.minute ?? endMinute;
    const current = exitMinute.get(playerId);
    if (current === undefined || minute < current) exitMinute.set(playerId, minute);
  }

  const minutes: Record<string, number> = {};
  for (const [playerId, entry] of entryMinute) {
    const exit = exitMinute.get(playerId) ?? endMinute;
    minutes[playerId] = Math.max(0, exit - entry);
  }
  return minutes;
}
