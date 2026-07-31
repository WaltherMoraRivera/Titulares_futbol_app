import { create } from "zustand";
import { loadAttendance, saveAttendance } from "@/services/attendance-service";

interface AttendanceState {
  attendeeIds: string[];
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (playerId: string) => Promise<void>;
  setAll: (playerIds: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendeeIds: [],
  loaded: false,

  load: async () => {
    const attendeeIds = await loadAttendance();
    set({ attendeeIds, loaded: true });
  },

  toggle: async (playerId) => {
    const current = get().attendeeIds;
    const attendeeIds = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId];
    set({ attendeeIds });
    await saveAttendance(attendeeIds);
  },

  setAll: async (playerIds) => {
    set({ attendeeIds: playerIds });
    await saveAttendance(playerIds);
  },

  clearAll: async () => {
    set({ attendeeIds: [] });
    await saveAttendance([]);
  },
}));
