"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cachedModelState } from "../lib/model-cache";
import { DEFAULT_WEBGPU_MODEL, WEBGPU_MODELS } from "../lib/model-catalog";

export type ModelReadyStatus = "checking" | "landing" | "ready";

export interface ModelReady {
  status: ModelReadyStatus;
  preselectModelId: string;
  recheck: () => void;
}

export function useModelReady(backend: string): ModelReady {
  const [status, setStatus] = useState<ModelReadyStatus>("checking");
  const [preselectModelId, setPreselectModelId] = useState(DEFAULT_WEBGPU_MODEL);
  const [bump, setBump] = useState(0);
  const bumpRef = useRef(0);

  useEffect(() => {
    bumpRef.current = bump;
    const gen = bump;
    let active = true;
    (async () => {
      if (backend !== "webgpu") {
        if (active && gen === bumpRef.current) setStatus("ready");
        return;
      }
      const results = await Promise.all(
        WEBGPU_MODELS.map((m) =>
          cachedModelState(m.id).catch(() => ({ cached: false, bytes: 0 }))
        )
      );
      if (!active || gen !== bumpRef.current) return;
      const anyCached = results.some((r) => r.cached);
      if (anyCached) {
        setPreselectModelId(DEFAULT_WEBGPU_MODEL);
        setStatus("ready");
        return;
      }
      let bestId = DEFAULT_WEBGPU_MODEL;
      let bestBytes = -1;
      WEBGPU_MODELS.forEach((m, i) => {
        if (results[i].bytes > bestBytes) {
          bestBytes = results[i].bytes;
          bestId = m.id;
        }
      });
      setPreselectModelId(bestId);
      setStatus("landing");
    })();
    return () => {
      active = false;
    };
  }, [backend, bump]);

  const recheck = useCallback(() => setBump((b) => b + 1), []);

  return { status, preselectModelId, recheck };
}
