import { create } from "zustand";
import api from "../lib/api";

// Per-tenant calendar display preference.
//   "ethiopian"  -> Ethiopian date only
//   "gregorian"  -> Gregorian date only
//   "both"       -> both, Ethiopian primary (default)
export const useCalendarStore = create((set, get) => ({
  calendar: "both",
  loaded: false,

  setCalendar: (calendar) => set({ calendar }),

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await api.get("/settings/calendar");
      set({ calendar: res.data || "both", loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  save: async (calendar) => {
    await api.put("/settings", { calendar });
    set({ calendar });
  },
}));
