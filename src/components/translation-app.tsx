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
  const [settingsTab, setSettingsTab] = useState<"inference" | "general">("inference");
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

  const openSettings = (tab: "inference" | "general" = "inference") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box className="min-h-full flex flex-col">
        <Box className="mx-auto w-full max-w-5xl px-4 py-4 border-b" sx={{ borderColor: "divider" }}>
          <AppHeader
            themeMode={mode}
            onToggleTheme={toggle}
            onOpenSettings={() => openSettings("inference")}
          />
        </Box>
        <Box className="flex-1">
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
