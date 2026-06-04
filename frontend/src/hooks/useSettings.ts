import { create } from "zustand";
import { adminApi } from "@/lib/api";

export interface BrandingSettings {
  logo_url: string;
  logo_data_url: string;
  business_name: string;
  legal_name: string | null;
  primary_color: string;
  accent_color: string;
}

interface SettingsState {
  branding: BrandingSettings;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: "",
  logo_data_url: "",
  business_name: "Repair Shop",
  legal_name: null,
  primary_color: "#1e3a5f",
  accent_color: "#d97706",
};

export const useSettings = create<SettingsState>((set) => ({
  branding: DEFAULT_BRANDING,
  loaded: false,
  fetchSettings: async () => {
    try {
      const res = await adminApi.getSettings();
      const b = res.branding_json ?? {};
      set({
        branding: {
          logo_url: String(b.logo_url || ""),
          logo_data_url: String(b.logo_data_url || ""),
          business_name: String(res.business_name || "Repair Shop"),
          legal_name: res.legal_name ?? null,
          primary_color: String(b.primary_color || "#1e3a5f"),
          accent_color: String(b.accent_color || "#d97706"),
        },
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
