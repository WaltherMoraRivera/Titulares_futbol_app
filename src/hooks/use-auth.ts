import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export type TeamRole = "player" | "dt";

interface AuthState {
  loaded: boolean;
  teamId: string | null;
  teamName: string | null;
  role: TeamRole | null;
  playerId: string | null;
  load: () => Promise<void>;
  loginWithCode: (code: string) => Promise<TeamRole>;
  claimPlayer: (playerId: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export const useAuthStore = create<AuthState>((set) => ({
  loaded: false,
  teamId: null,
  teamName: null,
  role: null,
  playerId: null,

  load: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      set({ loaded: true });
      return;
    }

    const { data: teamData, error } = await supabase.rpc("get_my_team");
    if (error || !teamData || teamData.length === 0) {
      set({ loaded: true });
      return;
    }

    const row = teamData[0];
    set({
      loaded: true,
      teamId: row.team_id,
      teamName: row.team_name,
      role: row.role,
      playerId: row.player_id,
    });
  },

  loginWithCode: async (code) => {
    await ensureAnonymousSession();
    const { data, error } = await supabase.rpc("claim_team", { code: code.trim() });
    if (error || !data || data.length === 0) {
      throw new Error("Código inválido.");
    }
    const row = data[0];
    set({
      teamId: row.team_id,
      teamName: row.team_name,
      role: row.role,
      playerId: null,
    });
    return row.role as TeamRole;
  },

  claimPlayer: async (playerId) => {
    const { error } = await supabase.rpc("claim_player", { p_player_id: playerId });
    if (error) throw new Error("No se pudo reclamar el jugador.");
    set({ playerId });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ teamId: null, teamName: null, role: null, playerId: null });
  },
}));
