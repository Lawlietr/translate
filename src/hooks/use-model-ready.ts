"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cachedModelState } from "../lib/model-cache";
import { DEFAULT_WEBGPU_MODEL, WEBGPU_MODELS } from "../lib/model-catalog";

export interface ModelReady {
  checking: boolean;
  cachedModelIds: Set<string>;
  preselectModelId: string;
  recheck: () => void;
}

export function useModelReady(backend: string): ModelReady {
  const [checking, setChecking] = useState(true);
  const [cachedModelIds, setCachedModelIds] = useState<Set<string>>(new Set());
  const [preselectModelId, setPreselectModelId] = useState(DEFAULT_WEBGPU_MODEL);
  const [bump, setBump] = useState(0);
  const bumpRef = useRef(0);

  useEffect(() => {
    bumpRef.current = bump;
    const gen = bump;
    let active = true;
    (async () => {
      if (backend !== "webgpu") {
        if (active && gen === bumpRef.current) {
          setCachedModelIds(new Set());
          setChecking(false);
        }
        return;
      }
      setChecking(true);
      const results = await Promise.all(
        WEBGPU_MODELS.map((m) =>
          cachedModelState(m.id).catch(() => ({ cached: false, bytes: 0 }))
        )
      );
      if (!active || gen !== bumpRef.current) return;
      const cached = new Set<string>();
      WEBGPU_MODELS.forEach((m, i) => {
        if (results[i].cached) cached.add(m.id);
      });
      setCachedModelIds(cached);
      if (cached.size > 0) {
        setPreselectModelId(DEFAULT_WEBGPU_MODEL);
      } else {
        let bestId = DEFAULT_WEBGPU_MODEL;
        let bestBytes = -1;
        WEBGPU_MODELS.forEach((m, i) => {
          if (results[i].bytes > bestBytes) {
            bestBytes = results[i].bytes;
            bestId = m.id;
          }
        });
        setPreselectModelId(bestId);
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [backend, bump]);

  const recheck = useCallback(() => setBump((b) => b + 1), []);

  return { checking, cachedModelIds, preselectModelId, recheck };
}
