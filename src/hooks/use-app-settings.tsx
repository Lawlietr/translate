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
  defaultSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
  type LlamaServerConfig,
} from "../lib/settings-manager";
import { normalizeLanguage } from "../lib/i18n/translations";

interface AppSettingsValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  updateLlama: (patch: Partial<LlamaServerConfig>) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = normalizeLanguage(settings.language);
  }, [settings.language, hydrated]);

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
