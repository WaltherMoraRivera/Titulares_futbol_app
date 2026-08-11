import { create } from "zustand";
import { MatchLineupData, Player, PlayerTacticalMap, Point } from "@/types";
import { assignPlayersToFormation } from "@/utils/assign-formation";
import { getFormationPreset } from "@/utils/formation-presets";
import { fetchMatchLineup, saveMatchLineup } from "@/services/supabase-match-service";
import { useAuthStore } from "@/hooks/use-auth";

const MAX_MAP_HISTORY = 20;

interface MatchLineupState {
  matchId: string | null;
  lineup: MatchLineupData | null;
  loaded: boolean;
  /** Pila de deshacer por jugador (ownerId -> versiones anteriores de su mapa). */
  mapHistory: Record<string, PlayerTacticalMap[]>;
  loadForMatch: (matchId: string) => Promise<void>;
  startFormation: (formationTemplateId: string, attendees: Player[]) => Promise<void>;
  moveToField: (playerId: string, x: number, y: number) => Promise<void>;
  moveToBench: (playerId: string) => Promise<void>;
  setInstructions: (playerId: string, instructions: string) => Promise<void>;
  setConnectedPlayers: (ownerId: string, connectedPlayerIds: string[]) => Promise<void>;
  addZone: (ownerId: string, points: Point[]) => Promise<void>;
  removeZone: (ownerId: string, zoneId: string) => Promise<void>;
  undoMap: (ownerId: string) => Promise<void>;
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

function getOrCreateMap(maps: PlayerTacticalMap[], ownerId: string): PlayerTacticalMap {
  return maps.find((m) => m.ownerId === ownerId) ?? { ownerId, connectedPlayerIds: [], zones: [] };
}

function upsertMap(maps: PlayerTacticalMap[], updated: PlayerTacticalMap): PlayerTacticalMap[] {
  const exists = maps.some((m) => m.ownerId === updated.ownerId);
  return exists ? maps.map((m) => (m.ownerId === updated.ownerId ? updated : m)) : [...maps, updated];
}

export const useMatchLineupStore = create<MatchLineupState>((set, get) => {
  /** Guarda el mapa actualizado de un jugador, empujando la versión anterior
   * a su pila de deshacer (acotada, y separada por jugador para que
   * "deshacer" en el mapa de un jugador nunca afecte el de otro). */
  async function saveMap(ownerId: string, updated: PlayerTacticalMap) {
    const { lineup, mapHistory } = get();
    if (!lineup) return;
    const teamId = await requireTeamId();
    const previous = getOrCreateMap(lineup.tacticalMaps, ownerId);

    const savedLineup = await saveMatchLineup(teamId, lineup.matchId, {
      formationTemplateId: lineup.formationTemplateId,
      assignments: lineup.assignments,
      bench: lineup.bench,
      tacticalMaps: upsertMap(lineup.tacticalMaps, updated),
    });

    const stack = [...(mapHistory[ownerId] ?? []), previous].slice(-MAX_MAP_HISTORY);
    set({ lineup: savedLineup, mapHistory: { ...mapHistory, [ownerId]: stack } });
  }

  return {
    matchId: null,
    lineup: null,
    loaded: false,
    mapHistory: {},

    loadForMatch: async (matchId) => {
      set({ loaded: false, mapHistory: {} });
      const lineup = await fetchMatchLineup(matchId);
      set({ matchId, lineup, loaded: true });
    },

    startFormation: async (formationTemplateId, attendees) => {
      const { matchId } = get();
      if (!matchId) return;
      const teamId = await requireTeamId();
      const template = getFormationPreset(formationTemplateId);
      if (!template) return;

      const { assignments, bench } = assignPlayersToFormation(attendees, template);
      const lineup = await saveMatchLineup(teamId, matchId, {
        formationTemplateId,
        assignments,
        bench,
        tacticalMaps: [],
      });
      set({ lineup, mapHistory: {} });
    },

    moveToField: async (playerId, x, y) => {
      const { lineup, matchId } = get();
      if (!lineup || !matchId) return;
      const teamId = await requireTeamId();

      const alreadyOnField = lineup.assignments.some((a) => a.playerId === playerId);
      const assignments = alreadyOnField
        ? lineup.assignments.map((a) => (a.playerId === playerId ? { ...a, x, y } : a))
        : [...lineup.assignments, { slotId: `manual-${playerId}`, playerId, x, y }];
      const bench = lineup.bench.filter((id) => id !== playerId);

      const updated = await saveMatchLineup(teamId, matchId, {
        formationTemplateId: lineup.formationTemplateId,
        assignments,
        bench,
        tacticalMaps: lineup.tacticalMaps,
      });
      set({ lineup: updated });
    },

    moveToBench: async (playerId) => {
      const { lineup, matchId } = get();
      if (!lineup || !matchId) return;
      const teamId = await requireTeamId();

      const assignments = lineup.assignments.filter((a) => a.playerId !== playerId);
      const bench = lineup.bench.includes(playerId) ? lineup.bench : [...lineup.bench, playerId];

      const updated = await saveMatchLineup(teamId, matchId, {
        formationTemplateId: lineup.formationTemplateId,
        assignments,
        bench,
        tacticalMaps: lineup.tacticalMaps,
      });
      set({ lineup: updated });
    },

    setInstructions: async (playerId, instructions) => {
      const { lineup, matchId } = get();
      if (!lineup || !matchId) return;
      const teamId = await requireTeamId();

      const trimmed = instructions.trim();
      const assignments = lineup.assignments.map((a) =>
        a.playerId === playerId ? { ...a, instructions: trimmed || undefined } : a
      );

      const updated = await saveMatchLineup(teamId, matchId, {
        formationTemplateId: lineup.formationTemplateId,
        assignments,
        bench: lineup.bench,
        tacticalMaps: lineup.tacticalMaps,
      });
      set({ lineup: updated });
    },

    setConnectedPlayers: async (ownerId, connectedPlayerIds) => {
      const { lineup } = get();
      if (!lineup) return;
      const current = getOrCreateMap(lineup.tacticalMaps, ownerId);
      await saveMap(ownerId, { ...current, connectedPlayerIds });
    },

    addZone: async (ownerId, points) => {
      const { lineup } = get();
      if (!lineup) return;
      const current = getOrCreateMap(lineup.tacticalMaps, ownerId);
      const zone = { id: crypto.randomUUID(), points };
      await saveMap(ownerId, { ...current, zones: [...current.zones, zone] });
    },

    removeZone: async (ownerId, zoneId) => {
      const { lineup } = get();
      if (!lineup) return;
      const current = getOrCreateMap(lineup.tacticalMaps, ownerId);
      await saveMap(ownerId, { ...current, zones: current.zones.filter((z) => z.id !== zoneId) });
    },

    undoMap: async (ownerId) => {
      const { lineup, matchId, mapHistory } = get();
      if (!lineup || !matchId) return;
      const stack = mapHistory[ownerId] ?? [];
      if (stack.length === 0) return;
      const teamId = await requireTeamId();

      const previous = stack[stack.length - 1];
      const savedLineup = await saveMatchLineup(teamId, matchId, {
        formationTemplateId: lineup.formationTemplateId,
        assignments: lineup.assignments,
        bench: lineup.bench,
        tacticalMaps: upsertMap(lineup.tacticalMaps, previous),
      });
      set({
        lineup: savedLineup,
        mapHistory: { ...mapHistory, [ownerId]: stack.slice(0, -1) },
      });
    },
  };
});
