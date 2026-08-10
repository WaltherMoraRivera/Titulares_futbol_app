import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export type TeamRole = "player" | "dt" | "admin";
export type PreviewRole = "player" | "dt";

const PREVIEW_ROLE_KEY = "titulares:admin-preview-role";

function loadPreviewRole(): PreviewRole {
  if (typeof window === "undefined") return "dt";
  const stored = window.localStorage.getItem(PREVIEW_ROLE_KEY);
  return stored === "player" ? "player" : "dt";
}

function savePreviewRole(role: PreviewRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
}

interface AuthState {
  loaded: boolean;
  teamId: string | null;
  teamName: string | null;
  /** Rol "efectivo" que consume el resto de la app: para una cuenta admin,
   * es la vista elegida en el switcher (Jugador o DT/Capitán), no el rol
   * real guardado en la base. */
  role: PreviewRole | null;
  /** Rol real devuelto por Supabase, sin aplicar la vista del switcher. */
  actualRole: TeamRole | null;
  playerId: string | null;
  load: () => Promise<void>;
  loginWithCode: (code: string) => Promise<TeamRole>;
  claimPlayer: (playerId: string) => Promise<void>;
  logout: () => Promise<void>;
  setPreviewRole: (role: PreviewRole) => void;
}

async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

function resolveDisplayRole(actualRole: TeamRole): PreviewRole {
  return actualRole === "admin" ? loadPreviewRole() : (actualRole as PreviewRole);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loaded: false,
  teamId: null,
  teamName: null,
  role: null,
  actualRole: null,
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
    const actualRole = row.role as TeamRole;
    set({
      loaded: true,
      teamId: row.team_id,
      teamName: row.team_name,
      role: resolveDisplayRole(actualRole),
      actualRole,
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
    const actualRole = row.role as TeamRole;
    set({
      teamId: row.team_id,
      teamName: row.team_name,
      role: resolveDisplayRole(actualRole),
      actualRole,
      playerId: null,
    });
    return actualRole;
  },

  claimPlayer: async (playerId) => {
    const { error } = await supabase.rpc("claim_player", { p_player_id: playerId });
    if (error) throw new Error("No se pudo reclamar el jugador.");
    set({ playerId });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ teamId: null, teamName: null, role: null, actualRole: null, playerId: null });
  },

  setPreviewRole: (previewRole) => {
    if (get().actualRole !== "admin") return;
    savePreviewRole(previewRole);
    set({ role: previewRole });
  },
}));
