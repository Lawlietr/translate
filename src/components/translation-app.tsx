"use client";

import { Box, createTheme, ThemeProvider } from "@mui/material";
import { AppHeader } from "./app-header";
import { TranslationPage } from "./translation-page";
import { useThemeMode } from "../hooks/use-theme";

export function TranslationApp() {
  const { mode, toggle } = useThemeMode();
  const theme = createTheme({ palette: { mode } });

  return (
    <ThemeProvider theme={theme}>
      <Box className="min-h-full flex flex-col">
        <Box className="mx-auto w-full max-w-5xl px-4 pt-4">
          <AppHeader themeMode={mode} onToggleTheme={toggle} />
        </Box>
        <TranslationPage />
      </Box>
    </ThemeProvider>
  );
}
