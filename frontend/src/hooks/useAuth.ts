import { create } from "zustand";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login(email, password, "sunset-demo");
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("refresh_token", res.refresh_token);
      set({ user: res.user as User, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },
  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const user = await authApi.me();
      set({ user: user as User });
    } catch {
      localStorage.removeItem("access_token");
    }
  },
}));
