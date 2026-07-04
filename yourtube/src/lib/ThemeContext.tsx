"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "@/lib/api-client";

export type AppTheme = "light" | "dark";

type Appearance = {
  theme: AppTheme;
  isSouthIndia: boolean;
  isMorningWindow: boolean;
  istHour: number;
  region: string;
};

type ThemeContextValue = {
  theme: AppTheme;
  appearance: Appearance | null;
  loading: boolean;
  refreshAppearance: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAppearance = useCallback(async () => {
    try {
      const { data } = await api.get("/context/appearance");
      const next: Appearance = {
        theme: data.theme === "light" ? "light" : "dark",
        isSouthIndia: Boolean(data.isSouthIndia),
        isMorningWindow: Boolean(data.isMorningWindow),
        istHour: data.istHour ?? 0,
        region: data.region ?? "Unknown",
      };
      setAppearance(next);
      applyThemeClass(next.theme);
    } catch {
      applyThemeClass("dark");
      setAppearance({
        theme: "dark",
        isSouthIndia: false,
        isMorningWindow: false,
        istHour: 0,
        region: "Unknown",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAppearance();
    const interval = setInterval(refreshAppearance, 60_000);
    return () => clearInterval(interval);
  }, [refreshAppearance]);

  return (
    <ThemeContext.Provider
      value={{
        theme: appearance?.theme ?? "dark",
        appearance,
        loading,
        refreshAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
