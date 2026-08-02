import { create } from "zustand";
import { Match, MatchInput } from "@/types";
import {
  createTeamMatch,
  deleteTeamMatch,
  fetchTeamMatches,
  updateTeamMatch,
} from "@/services/supabase-match-service";
import { useAuthStore } from "@/hooks/use-auth";

interface MatchesState {
  matches: Match[];
  loaded: boolean;
  load: () => Promise<void>;
  addMatch: (input: MatchInput) => Promise<Match>;
  updateMatch: (id: string, input: MatchInput) => Promise<void>;
  removeMatch: (id: string) => Promise<void>;
}

async function requireTeamId(): Promise<string> {
  let auth = useAuthStore.getState();
  if (!auth.loaded) {
    await auth.load();
    auth = useAuthStore.getState();
  }
  if (!auth.teamId) throw new Error("No hay sesión de equipo activa.");
  return auth.teamId;
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  matches: [],
  loaded: false,

  load: async () => {
    let auth = useAuthStore.getState();
    if (!auth.loaded) {
      await auth.load();
      auth = useAuthStore.getState();
    }
    if (!auth.teamId) {
      set({ matches: [], loaded: true });
      return;
    }
    const matches = await fetchTeamMatches(auth.teamId);
    set({ matches, loaded: true });
  },

  addMatch: async (input) => {
    const teamId = await requireTeamId();
    const match = await createTeamMatch(teamId, input);
    set({ matches: [...get().matches, match].sort((a, b) => a.date.localeCompare(b.date)) });
    return match;
  },

  updateMatch: async (id, input) => {
    const updated = await updateTeamMatch(id, input);
    set({
      matches: get()
        .matches.map((m) => (m.id === id ? updated : m))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  },

  removeMatch: async (id) => {
    await deleteTeamMatch(id);
    set({ matches: get().matches.filter((m) => m.id !== id) });
  },
}));
