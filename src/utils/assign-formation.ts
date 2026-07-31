import { FormationTemplate, LineupAssignment, Player } from "@/types";

export interface AssignmentResult {
  assignments: LineupAssignment[];
  bench: string[];
}

/**
 * Asigna jugadores asistentes a los slots de la formación, priorizando
 * coincidencia de posición principal, luego secundaria, luego lo que quede.
 * El resto de los asistentes va a banca.
 */
export function assignPlayersToFormation(
  attendees: Player[],
  template: FormationTemplate
): AssignmentResult {
  const pool = [...attendees];
  const assignments: LineupAssignment[] = [];

  function takeBySlotPosition(slotPosition: string, bySecondary: boolean) {
    const idx = pool.findIndex((p) =>
      bySecondary ? p.secondaryPosition === slotPosition : p.primaryPosition === slotPosition
    );
    if (idx === -1) return null;
    return pool.splice(idx, 1)[0];
  }

  for (const slot of template.slots) {
    let player =
      takeBySlotPosition(slot.suggestedPosition, false) ??
      takeBySlotPosition(slot.suggestedPosition, true);

    if (!player && pool.length > 0) {
      player = pool.shift()!;
    }

    if (player) {
      assignments.push({
        slotId: slot.id,
        playerId: player.id,
        x: slot.x,
        y: slot.y,
      });
    }
  }

  return { assignments, bench: pool.map((p) => p.id) };
}
