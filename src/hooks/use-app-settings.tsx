"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type LlamaServerConfig,
} from "../lib/settings-manager";

interface AppSettingsValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  updateLlama: (patch: Partial<LlamaServerConfig>) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const value = useMemo<AppSettingsValue>(
    () => ({
      settings,
      update: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      updateLlama: (patch) =>
        setSettings((prev) => ({
          ...prev,
          llamaServerConfig: { ...prev.llamaServerConfig, ...patch },
        })),
    }),
    [settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
