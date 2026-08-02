import { create } from "zustand";
import { Player, PlayerInput } from "@/types";
import {
  createTeamPlayer,
  createTeamPlayers,
  deleteTeamPlayer,
  fetchTeamPlayers,
  updateTeamPlayer,
} from "@/services/supabase-player-service";
import { useAuthStore } from "@/hooks/use-auth";

interface PlayersState {
  players: Player[];
  loaded: boolean;
  load: () => Promise<void>;
  addPlayer: (input: PlayerInput) => Promise<Player>;
  addPlayers: (inputs: PlayerInput[]) => Promise<Player[]>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
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

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  loaded: false,

  load: async () => {
    let auth = useAuthStore.getState();
    if (!auth.loaded) {
      await auth.load();
      auth = useAuthStore.getState();
    }
    if (!auth.teamId) {
      set({ players: [], loaded: true });
      return;
    }
    const players = await fetchTeamPlayers(auth.teamId);
    set({ players, loaded: true });
  },

  addPlayer: async (input) => {
    const teamId = await requireTeamId();
    const player = await createTeamPlayer(teamId, input);
    set({ players: [...get().players, player] });
    return player;
  },

  addPlayers: async (inputs) => {
    const teamId = await requireTeamId();
    const newPlayers = await createTeamPlayers(teamId, inputs);
    set({ players: [...get().players, ...newPlayers] });
    return newPlayers;
  },

  updatePlayer: async (id, input) => {
    const updated = await updateTeamPlayer(id, input);
    set({ players: get().players.map((p) => (p.id === id ? updated : p)) });
  },

  removePlayer: async (id) => {
    await deleteTeamPlayer(id);
    set({ players: get().players.filter((p) => p.id !== id) });
  },
}));
