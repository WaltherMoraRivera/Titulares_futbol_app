import type { EventParticipant, EventSide } from "@/types";

export interface GoalDraft {
  id: string | null;
  side: EventSide;
  player: EventParticipant | null;
}

export function resizeGoals(goals: GoalDraft[], side: EventSide, score: number) {
  if (!Number.isSafeInteger(score) || score < 0 || score > 99) {
    throw new Error("El marcador debe ser un entero entre 0 y 99.");
  }
  let difference = goals.filter((goal) => goal.side === side).length - score;
  const next = goals.filter((goal) => {
    const assigned = goal.player?.playerId || goal.player?.number != null || goal.player?.name?.trim();
    if (goal.side === side && difference > 0 && !assigned) {
      difference--;
      return false;
    }
    return true;
  });
  while (difference < 0) {
    next.push({ id: null, side, player: null });
    difference++;
  }
  return { goals: next, remainingRemovals: difference };
}
