import { MatchEvent } from "@/types";

/** Marcador derivado de la bitácora en vivo: cuenta los goles cargados
 * por lado. Es la única fuente del marcador — no se tipea a mano en
 * ningún lado. */
export function computeScoreFromEvents(events: MatchEvent[]) {
  let teamScore = 0;
  let opponentScore = 0;
  for (const e of events) {
    if (e.type !== "goal") continue;
    if (e.side === "own") teamScore++;
    else opponentScore++;
  }
  return { teamScore, opponentScore };
}
