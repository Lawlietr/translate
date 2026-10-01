"use client";

import { useEffect, useRef, useState } from "react";
import { Box, createTheme, ThemeProvider } from "@mui/material";
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
  const { lang } = useI18n();
  const { settings } = useAppSettings();
  const ready = useModelReady(settings.backend);
  const webgpu = settings.backend === "webgpu";
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"model" | "general">(() => {
    if (typeof window === "undefined") return "general";
    const saved = window.localStorage.getItem("translate:settingsTab");
    return saved === "model" || saved === "general" ? saved : "general";
  });
  const blockRef = useRef<HTMLDivElement | null>(null);
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

  const showBlock = !webgpu || (sessionLoaded && ready.cachedModelIds.size > 0);

  useEffect(() => {
    if (!webgpu || !showBlock) return;
    requestAnimationFrame(() => {
      blockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [webgpu, showBlock]);

  const openSettings = (tab?: "model" | "general") => {
    if (tab) {
      setSettingsTab(tab);
    } else {
      const saved = window.localStorage.getItem("translate:settingsTab");
      setSettingsTab(saved === "model" || saved === "general" ? saved : "general");
    }
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    if (webgpu) ready.recheck();
  };

  const translationBlock = (
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
    </Box>
  );

  const landingKey = ready.cachedModelIds.size > 0 ? "cached" : "none";

  return (
    <ThemeProvider theme={theme}>
      {webgpu ? (
        <>
          <ModelLanding
            key={landingKey}
            checking={ready.checking}
            cachedModelIds={ready.cachedModelIds}
            preselectModelId={ready.preselectModelId}
            onLoaded={() => setSessionLoaded(true)}
            onUseLlamaServer={() => openSettings("model")}
          />
          {showBlock && (
            <div ref={blockRef}>{translationBlock}</div>
          )}
          <SettingsDialog
            open={settingsOpen}
            initialTab={settingsTab}
            onClose={closeSettings}
          />
        </>
      ) : (
        <>
          {translationBlock}
          <SettingsDialog
            open={settingsOpen}
            initialTab={settingsTab}
            onClose={closeSettings}
          />
        </>
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
