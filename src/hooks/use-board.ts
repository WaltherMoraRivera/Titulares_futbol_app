import { create } from "zustand";
import { MatchLineup } from "@/types";
import { assignPlayersToFormation } from "@/utils/assign-formation";
import { getFormationPreset } from "@/utils/formation-presets";
import {
  buildLineup,
  loadCurrentLineup,
  saveCurrentLineup,
} from "@/services/lineup-service";
import { useHistoryStore } from "@/hooks/use-history";
import { Player } from "@/types";

interface BoardState {
  lineup: MatchLineup | null;
  loaded: boolean;
  load: () => Promise<void>;
  startFormation: (formationTemplateId: string, attendees: Player[]) => Promise<void>;
  movePlayerOnField: (playerId: string, x: number, y: number) => Promise<void>;
  moveToBench: (playerId: string) => Promise<void>;
  moveToField: (playerId: string, x: number, y: number) => Promise<void>;
  updateMeta: (meta: Partial<Pick<MatchLineup, "opponent" | "kickoffTime" | "comments" | "date">>) => Promise<void>;
  clear: () => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  lineup: null,
  loaded: false,

  load: async () => {
    const lineup = await loadCurrentLineup();
    set({ lineup, loaded: true });
  },

  startFormation: async (formationTemplateId, attendees) => {
    const template = getFormationPreset(formationTemplateId);
    if (!template) return;

    const previous = get().lineup ?? (await loadCurrentLineup());
    if (previous && previous.assignments.length > 0) {
      await useHistoryStore.getState().addOrUpdate(previous);
    }

    const { assignments, bench } = assignPlayersToFormation(attendees, template);
    const lineup = buildLineup({
      date: new Date().toISOString().slice(0, 10),
      formationTemplateId,
      attendeeIds: attendees.map((p) => p.id),
      assignments,
      bench,
    });

    set({ lineup });
    await saveCurrentLineup(lineup);
  },

  movePlayerOnField: async (playerId, x, y) => {
    const lineup = get().lineup;
    if (!lineup) return;
    const updated: MatchLineup = {
      ...lineup,
      assignments: lineup.assignments.map((a) =>
        a.playerId === playerId ? { ...a, x, y } : a
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ lineup: updated });
    await saveCurrentLineup(updated);
  },

  moveToBench: async (playerId) => {
    const lineup = get().lineup;
    if (!lineup) return;
    const updated: MatchLineup = {
      ...lineup,
      assignments: lineup.assignments.filter((a) => a.playerId !== playerId),
      bench: lineup.bench.includes(playerId) ? lineup.bench : [...lineup.bench, playerId],
      updatedAt: new Date().toISOString(),
    };
    set({ lineup: updated });
    await saveCurrentLineup(updated);
  },

  moveToField: async (playerId, x, y) => {
    const lineup = get().lineup;
    if (!lineup) return;
    const alreadyOnField = lineup.assignments.some((a) => a.playerId === playerId);
    const updated: MatchLineup = {
      ...lineup,
      bench: lineup.bench.filter((id) => id !== playerId),
      assignments: alreadyOnField
        ? lineup.assignments.map((a) => (a.playerId === playerId ? { ...a, x, y } : a))
        : [
            ...lineup.assignments,
            { slotId: `manual-${playerId}`, playerId, x, y },
          ],
      updatedAt: new Date().toISOString(),
    };
    set({ lineup: updated });
    await saveCurrentLineup(updated);
  },

  updateMeta: async (meta) => {
    const lineup = get().lineup;
    if (!lineup) return;
    const updated: MatchLineup = { ...lineup, ...meta, updatedAt: new Date().toISOString() };
    set({ lineup: updated });
    await saveCurrentLineup(updated);
  },

  clear: async () => {
    set({ lineup: null });
    await saveCurrentLineup(null);
  },
}));
