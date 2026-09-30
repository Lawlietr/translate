"use client";

import { useEffect, useState } from "react";
import { Box, createTheme, ThemeProvider } from "@mui/material";
import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";
import { TranslationPage } from "./translation-page";
import { SettingsDialog } from "./settings-dialog";
import { AppSettingsProvider, useAppSettings } from "../hooks/use-app-settings";
import { installActivityLogPatches, setActivityLogEnabled } from "../lib/activity-log";
import { useI18n } from "../hooks/useI18n";
import { useThemeMode } from "../hooks/use-theme";

function AppContent() {
  const { mode, toggle } = useThemeMode();
  const { lang } = useI18n();
  const { settings } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"model" | "general">(() => {
    if (typeof window === "undefined") return "general";
    const saved = window.localStorage.getItem("translate:settingsTab");
    return saved === "model" || saved === "general" ? saved : "general";
  });
  const theme = createTheme({ palette: { mode } });

  useEffect(() => {
    installActivityLogPatches();
  }, []);

  useEffect(() => {
    setActivityLogEnabled(settings.diagnostics);
  }, [settings.diagnostics]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const openSettings = (tab?: "model" | "general") => {
    if (tab) {
      setSettingsTab(tab);
    } else {
      const saved = window.localStorage.getItem("translate:settingsTab");
      setSettingsTab(saved === "model" || saved === "general" ? saved : "general");
    }
    setSettingsOpen(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box className="min-h-screen flex flex-col">
        <Box className="mx-auto w-full max-w-5xl px-4 py-4 border-b" sx={{ borderColor: "divider" }}>
          <AppHeader
            themeMode={mode}
            onToggleTheme={toggle}
            onOpenSettings={() => openSettings()}
          />
        </Box>
        <Box className="flex-1 flex">
          <TranslationPage
            onOpenSettings={openSettings}
            settingsOpen={settingsOpen}
          />
        </Box>
        <AppFooter />
        <SettingsDialog
          open={settingsOpen}
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
        />
      </Box>
    </ThemeProvider>
  );
}

export function TranslationApp() {
  return (
    <AppSettingsProvider>
      <AppContent />
    </AppSettingsProvider>
  );
}
