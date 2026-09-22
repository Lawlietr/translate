"use client";

import { useEffect, useState } from "react";

export interface GpuStatus {
  supported: boolean;
  checking: boolean;
  secureContext: boolean;
}

export function useWebGpu(): GpuStatus {
  const [gpu, setGpu] = useState<GpuStatus>({
    supported: false,
    checking: true,
    secureContext: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const secure = window.isSecureContext;
      if (!("gpu" in navigator)) {
        if (active) setGpu({ supported: false, checking: false, secureContext: secure });
        return;
      }
      const adapter = await navigator.gpu.requestAdapter().catch(() => null);
      if (active) {
        setGpu({ supported: adapter != null, checking: false, secureContext: secure });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return gpu;
}
