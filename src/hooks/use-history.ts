import { create } from "zustand";
import { MatchLineup } from "@/types";
import { loadLineupHistory, saveLineupHistory } from "@/services/lineup-service";

interface HistoryState {
  lineups: MatchLineup[];
  loaded: boolean;
  load: () => Promise<void>;
  addOrUpdate: (lineup: MatchLineup) => Promise<void>;
  updateEntry: (
    id: string,
    updates: Partial<Pick<MatchLineup, "result" | "comments" | "opponent">>
  ) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  lineups: [],
  loaded: false,

  load: async () => {
    const lineups = await loadLineupHistory();
    set({ lineups });
    set({ loaded: true });
  },

  addOrUpdate: async (lineup) => {
    const existing = get().lineups;
    const withoutCurrent = existing.filter((l) => l.id !== lineup.id);
    const lineups = [lineup, ...withoutCurrent].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    set({ lineups });
    await saveLineupHistory(lineups);
  },

  updateEntry: async (id, updates) => {
    const lineups = get().lineups.map((l) =>
      l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
    );
    set({ lineups });
    await saveLineupHistory(lineups);
  },

  removeEntry: async (id) => {
    const lineups = get().lineups.filter((l) => l.id !== id);
    set({ lineups });
    await saveLineupHistory(lineups);
  },
}));
