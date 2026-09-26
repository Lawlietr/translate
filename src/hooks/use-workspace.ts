"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearWorkspace,
  emptyWorkspace,
  loadWorkspace,
  saveWorkspace,
  type WorkspaceState,
} from "../lib/workspace";

const SAVE_DEBOUNCE_MS = 400;

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(emptyWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setWorkspace(loadWorkspace());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveWorkspace(workspace), SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [workspace, hydrated]);

  const set = (patch: Partial<WorkspaceState>) =>
    setWorkspace((prev) => ({ ...prev, ...patch }));

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setWorkspace(emptyWorkspace());
    clearWorkspace();
  };

  return { ...workspace, hydrated, set, clear };
}
