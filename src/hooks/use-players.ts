import { create } from "zustand";
import { Player, PlayerInput } from "@/types";
import { buildPlayer, loadPlayers, savePlayers } from "@/services/player-service";
import { DEFAULT_PLAYERS } from "@/data/default-players";

interface PlayersState {
  players: Player[];
  loaded: boolean;
  load: () => Promise<void>;
  addPlayer: (input: PlayerInput) => Promise<Player>;
  addPlayers: (inputs: PlayerInput[]) => Promise<Player[]>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  loaded: false,

  load: async () => {
    let players = await loadPlayers();
    if (players.length === 0) {
      players = DEFAULT_PLAYERS.map(buildPlayer);
      await savePlayers(players);
    }
    set({ players, loaded: true });
  },

  addPlayer: async (input) => {
    const player = buildPlayer(input);
    const players = [...get().players, player];
    set({ players });
    await savePlayers(players);
    return player;
  },

  addPlayers: async (inputs) => {
    const newPlayers = inputs.map(buildPlayer);
    const players = [...get().players, ...newPlayers];
    set({ players });
    await savePlayers(players);
    return newPlayers;
  },

  updatePlayer: async (id, input) => {
    const players = get().players.map((p) =>
      p.id === id
        ? { ...p, ...input, id: p.id, createdAt: p.createdAt, updatedAt: new Date().toISOString() }
        : p
    );
    set({ players });
    await savePlayers(players);
  },

  removePlayer: async (id) => {
    const players = get().players.filter((p) => p.id !== id);
    set({ players });
    await savePlayers(players);
  },
}));
