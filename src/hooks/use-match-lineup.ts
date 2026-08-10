import { create } from "zustand";
import { GraphicElement, MatchLineupData, Player, Point } from "@/types";
import { assignPlayersToFormation } from "@/utils/assign-formation";
import { getFormationPreset } from "@/utils/formation-presets";
import { fetchMatchLineup, saveMatchLineup } from "@/services/supabase-match-service";
import { useAuthStore } from "@/hooks/use-auth";

const MAX_GRAPHICS_HISTORY = 20;

interface MatchLineupState {
  matchId: string | null;
  lineup: MatchLineupData | null;
  loaded: boolean;
  graphicsHistory: GraphicElement[][];
  loadForMatch: (matchId: string) => Promise<void>;
  startFormation: (formationTemplateId: string, attendees: Player[]) => Promise<void>;
  moveToField: (playerId: string, x: number, y: number) => Promise<void>;
  moveToBench: (playerId: string) => Promise<void>;
  setInstructions: (playerId: string, instructions: string) => Promise<void>;
  addArrow: (fromPlayerId: string, toPlayerId: string) => Promise<void>;
  addZone: (points: Point[]) => Promise<void>;
  removeGraphic: (graphicId: string) => Promise<void>;
  undoGraphics: () => Promise<void>;
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

export const useMatchLineupStore = create<MatchLineupState>((set, get) => {
  /** Guarda un nuevo arreglo de graphics, empujando el estado anterior a la
   * pila de deshacer (acotada) antes de persistir. */
  async function saveGraphics(newGraphics: GraphicElement[]) {
    const { lineup, matchId, graphicsHistory } = get();
    if (!lineup || !matchId) return;
    const teamId = await requireTeamId();

    const updated = await saveMatchLineup(teamId, matchId, {
      formationTemplateId: lineup.formationTemplateId,
      assignments: lineup.assignments,
      bench: lineup.bench,
      graphics: newGraphics,
    });
    const history = [...graphicsHistory, lineup.graphics].slice(-MAX_GRAPHICS_HISTORY);
    set({ lineup: updated, graphicsHistory: history });
  }

  return {
    matchId: null,
    lineup: null,
    loaded: false,
    graphicsHistory: [],

    loadForMatch: async (matchId) => {
      set({ loaded: false, graphicsHistory: [] });
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
        graphics: [],
      });
      set({ lineup, graphicsHistory: [] });
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
        graphics: lineup.graphics,
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
        graphics: lineup.graphics,
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
        graphics: lineup.graphics,
      });
      set({ lineup: updated });
    },

    addArrow: async (fromPlayerId, toPlayerId) => {
      const { lineup } = get();
      if (!lineup || fromPlayerId === toPlayerId) return;
      const alreadyExists = lineup.graphics.some(
        (g) => g.type === "arrow" && g.fromPlayerId === fromPlayerId && g.toPlayerId === toPlayerId
      );
      if (alreadyExists) return;

      const arrow: GraphicElement = {
        id: crypto.randomUUID(),
        type: "arrow",
        fromPlayerId,
        toPlayerId,
      };
      await saveGraphics([...lineup.graphics, arrow]);
    },

    addZone: async (points) => {
      const { lineup } = get();
      if (!lineup) return;
      const zone: GraphicElement = { id: crypto.randomUUID(), type: "zone", points };
      await saveGraphics([...lineup.graphics, zone]);
    },

    removeGraphic: async (graphicId) => {
      const { lineup } = get();
      if (!lineup) return;
      await saveGraphics(lineup.graphics.filter((g) => g.id !== graphicId));
    },

    undoGraphics: async () => {
      const { lineup, matchId, graphicsHistory } = get();
      if (!lineup || !matchId || graphicsHistory.length === 0) return;
      const teamId = await requireTeamId();

      const previous = graphicsHistory[graphicsHistory.length - 1];
      const updated = await saveMatchLineup(teamId, matchId, {
        formationTemplateId: lineup.formationTemplateId,
        assignments: lineup.assignments,
        bench: lineup.bench,
        graphics: previous,
      });
      set({ lineup: updated, graphicsHistory: graphicsHistory.slice(0, -1) });
    },
  };
});
