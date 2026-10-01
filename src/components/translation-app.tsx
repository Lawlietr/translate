"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, createTheme, ThemeProvider, Typography } from "@mui/material";
import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";
import { TranslationPage } from "./translation-page";
import { SettingsDialog } from "./settings-dialog";
import { ModelLanding } from "./model-landing";
import { AppSettingsProvider, useAppSettings } from "../hooks/use-app-settings";
import { installActivityLogPatches, setActivityLogEnabled } from "../lib/activity-log";
import { useI18n } from "../hooks/useI18n";
import { useThemeMode } from "../hooks/use-theme";
import { useModelReady } from "../hooks/use-model-ready";

function AppContent() {
  const { mode, toggle } = useThemeMode();
  const { t, lang } = useI18n();
  const { settings } = useAppSettings();
  const ready = useModelReady(settings.backend);
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
      {ready.status === "checking" ? (
        <Box className="h-screen flex flex-col items-center justify-center gap-3">
          <CircularProgress size={28} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("landing.checking")}
          </Typography>
        </Box>
      ) : ready.status === "landing" ? (
        <>
          <ModelLanding
            preselectModelId={ready.preselectModelId}
            onReady={ready.recheck}
            onUseLlamaServer={() => openSettings("model")}
          />
          <SettingsDialog
            open={settingsOpen}
            initialTab={settingsTab}
            onClose={() => setSettingsOpen(false)}
          />
        </>
      ) : (
        <Box className="h-screen flex flex-col overflow-hidden">
          <Box className="mx-auto w-full max-w-5xl px-4 py-4 border-b" sx={{ borderColor: "divider" }}>
            <AppHeader
              themeMode={mode}
              onToggleTheme={toggle}
              onOpenSettings={() => openSettings()}
            />
          </Box>
          <Box className="flex-1 flex min-h-0">
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
      )}
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
