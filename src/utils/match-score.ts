import { MatchEvent } from "@/types";

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
