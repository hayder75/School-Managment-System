import { create } from "zustand";
import api from "../lib/api";
import { clearClientCache } from "../lib/queryClient";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (identifier, password) => {
    const res = await api.post("/auth/login", { identifier, password });
    const { user, token } = res.data;
    // Drop any cached data belonging to a previous session.
    await clearClientCache();
    set({ user, token, isAuthenticated: true, isLoading: false });
    return user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    await clearClientCache();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
