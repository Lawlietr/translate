"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "translate:theme";

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount read avoids a hydration mismatch (server renders the dark default)
    if (stored === "light" || stored === "dark") setMode(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", mode === "light");
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, hydrated]);

  const toggle = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  return { mode, toggle };
}
