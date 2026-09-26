"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { CopyButton } from "../../components/copy-button";
import { AppSettingsProvider } from "../../hooks/use-app-settings";
import { VISIBLE_WEBGPU_MODELS } from "../../lib/model-catalog";
import {
  cachedModelState,
  formatBytes,
  formatDuration,
  prefetchModel,
  type CacheStatus,
} from "../../lib/model-cache";
import { SUPPORTED_TRANSLATION_LANGUAGES, languageName } from "../../lib/languages";
import { loadSettings, saveSettings } from "../../lib/settings-manager";
import { getProviderOrThrow } from "../../lib/providers/registry";
import type { DownloadProgress } from "../../lib/types";
import {
  getActivityLog,
  installActivityLogPatches,
  logActivity,
  setActivityLogEnabled,
} from "../../lib/activity-log";

const darkTheme = createTheme({ palette: { mode: "dark" } });

interface GpuStatus {
  supported: boolean;
  checking: boolean;
  secureContext: boolean;
}

export default function Page() {
  const [gpu, setGpu] = useState<GpuStatus>({ supported: false, checking: true, secureContext: true });
  const [modelId, setModelId] = useState(() => loadSettings().webgpuModelId);
  const [sourceLang, setSourceLang] = useState(() => loadSettings().defaultSourceLang);
  const [targetLang, setTargetLang] = useState(() => loadSettings().defaultTargetLang);
  const [text, setText] = useState("");
  const [cache, setCache] = useState<CacheStatus>({ cached: false, bytes: 0 });
  const [phase, setPhase] = useState<"idle" | "downloading" | "translating">("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [output, setOutput] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [logView, setLogView] = useState<string[]>([]);
  const lastStage = useRef<string | null>(null);
  const downloadAc = useRef<AbortController | null>(null);
  const translateAc = useRef<AbortController | null>(null);

  useEffect(() => {
    installActivityLogPatches();
    setActivityLogEnabled(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLogView(getActivityLog().slice(-100)), 1000);
    return () => clearInterval(t);
  }, []);

  const model = VISIBLE_WEBGPU_MODELS.find((m) => m.id === modelId) ?? VISIBLE_WEBGPU_MODELS[0];

  useEffect(() => {
    let active = true;
    (async () => {
      const secure = typeof window !== "undefined" ? window.isSecureContext : true;
      if (typeof navigator === "undefined" || !("gpu" in navigator)) {
        if (active) setGpu({ supported: false, checking: false, secureContext: secure });
        return;
      }
      const adapter = await navigator.gpu.requestAdapter().catch(() => null);
      if (active) setGpu({ supported: adapter != null, checking: false, secureContext: secure });
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((e) => setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
        .catch(() => {});
    }
  }, []);

  const refreshCache = useCallback(
    async (id: string) => {
      setCache(await cachedModelState(id));
    },
    []
  );

  useEffect(() => {
    let active = true;
    void cachedModelState(modelId).then((s) => {
      if (active) setCache(s);
    });
    return () => {
      active = false;
    };
  }, [modelId, phase]);

  useEffect(() => {
    if (phase === "idle" || startedAt == null) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  useEffect(() => {
    saveSettings({
      ...loadSettings(),
      webgpuModelId: modelId,
      defaultSourceLang: sourceLang,
      defaultTargetLang: targetLang,
    });
  }, [modelId, sourceLang, targetLang]);

  const startDownload = () => {
    setError(null);
    setProgress(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setPhase("downloading");
    const ac = new AbortController();
    downloadAc.current = ac;
    prefetchModel(modelId, {
      onProgress: (p) => setProgress(p),
      onPhase: (ph) => {
        if (ph === "downloading") setPhase("downloading");
      },
      signal: ac.signal,
    })
      .then(() => {
        setPhase("idle");
        setStartedAt(null);
        void refreshCache(modelId);
      })
      .catch((e: unknown) => {
        setPhase("idle");
        setStartedAt(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  const cancelDownload = () => downloadAc.current?.abort();

  const swapLangs = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const translate = () => {
    if (!text.trim()) return;
    setError(null);
    setOutput("");
    setLatencyMs(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setPhase("translating");
    setStatus("starting");
    lastStage.current = "starting";
    logActivity(`translate start: ${modelId} (${sourceLang} → ${targetLang}), ${text.trim().length} chars`);
    const onStatus = (s: string) => {
      const base = s.startsWith("generating · token") ? "generating" : s;
      if (base !== lastStage.current) {
        lastStage.current = base;
        logActivity(`stage: ${base}`);
      }
      setStatus(s);
    };
    const ac = new AbortController();
    translateAc.current = ac;
    getProviderOrThrow("webgpu")
      .translate(
        { text: text.trim(), sourceLang, targetLang },
        { model: modelId, onStatus },
        ac.signal
      )
      .then((res) => {
        setPhase("idle");
        setStartedAt(null);
        setStatus(null);
        logActivity(`OK in ${res.latencyMs} ms`);
        setOutput(res.text);
        setLatencyMs(res.latencyMs);
      })
      .catch((e: unknown) => {
        setPhase("idle");
        setStartedAt(null);
        setStatus(null);
        if (e instanceof DOMException && e.name === "AbortError") {
          logActivity("aborted by user");
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        logActivity(`ERROR: ${msg}`);
        setError(msg);
      });
  };

  const cancelTranslate = () => translateAc.current?.abort();

  const busy = phase !== "idle";

  return (
    <AppSettingsProvider>
      <ThemeProvider theme={darkTheme}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 flex flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <Typography variant="h5">Translate</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              dev harness — local WebGPU inference (TODO #4)
            </Typography>
          </div>
          {gpu.checking ? (
            <Chip label="checking WebGPU…" size="small" />
          ) : !gpu.secureContext ? (
            <Chip label="NOT a secure context" color="warning" size="small" />
          ) : gpu.supported ? (
            <Chip label="WebGPU ready" color="success" size="small" />
          ) : (
            <Chip label="WebGPU unavailable" color="error" size="small" />
          )}
        </header>

        {!gpu.secureContext && (
          <Alert severity="warning">
            This page is not served over HTTPS (or localhost), so WebGPU is disabled by the browser.
            From another machine, open{" "}
            <code>
              https://&lt;dev-machine-lan-ip&gt;:3443
            </code>{" "}
            (self-signed cert — accept the warning once).
          </Alert>
        )}

        <Box className="flex flex-col gap-2">
          <Box className="flex flex-wrap items-center gap-3">
            <Select
              size="small"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              sx={{ minWidth: 320 }}
              disabled={busy}
            >
              {VISIBLE_WEBGPU_MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {formatBytes(model.sizeBytes)} · {model.source}
            </Typography>
            {cache.cached ? (
              <Chip label={`downloaded · ${formatBytes(cache.bytes)}`} color="success" size="small" />
            ) : (
              <Chip label="not downloaded" color="default" size="small" />
            )}
          </Box>
          {phase === "downloading" && progress && (
            <Box className="flex flex-col gap-1">
              <LinearProgress variant="determinate" value={progress.percent * 100} />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {formatBytes(progress.loaded)} / {formatBytes(progress.total)} ·{" "}
                {formatBytes(progress.speedBps)}/s · {formatDuration(elapsed)}
              </Typography>
            </Box>
          )}
          {phase === "downloading" ? (
            <Button variant="outlined" color="error" onClick={cancelDownload} size="small">
              Cancel download
            </Button>
          ) : (
            <Button variant="outlined" onClick={startDownload} size="small" disabled={cache.cached}>
              {cache.cached ? "Downloaded" : "Download model"}
            </Button>
          )}
        </Box>

        <Box className="flex flex-wrap items-center gap-3">
          <Select size="small" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} sx={{ minWidth: 180 }} disabled={busy}>
            {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.id === "zh-TW" ? "繁體中文" : l.id === "zh-CN" ? "簡體中文" : l.enName}
              </MenuItem>
            ))}
          </Select>
          <IconButton onClick={swapLangs} disabled={busy} title="swap languages">
            <SwapHorizIcon />
          </IconButton>
          <Select size="small" value={targetLang} onChange={(e) => setTargetLang(e.target.value)} sx={{ minWidth: 180 }} disabled={busy}>
            {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.id === "zh-TW" ? "繁體中文" : l.id === "zh-CN" ? "簡體中文" : l.enName}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
        <Box sx={{ position: "relative" }}>
          <TextField
            label="Source text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
            disabled={busy}
            slotProps={{ input: { sx: { pb: 3 } } }}
          />
          <Box sx={{ position: "absolute", left: 12, bottom: 6 }}>
            <CopyButton value={text} label="Copy source" />
          </Box>
        </Box>

        <Box sx={{ position: "relative" }}>
          <TextField
            label="Translation"
            value={output}
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
            slotProps={{ input: { readOnly: true, sx: { pb: 3 } } }}
          />
          <Box sx={{ position: "absolute", left: 12, bottom: 6 }}>
            <CopyButton value={output} label="Copy translation" />
          </Box>
        </Box>
        </Box>

        <Box className="flex items-center gap-4">
          {phase === "translating" ? (
            <>
              <Button variant="outlined" color="error" onClick={cancelTranslate}>
                Cancel
              </Button>
              <Box className="flex items-center gap-2">
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {formatDuration(elapsed)} — {status ?? "starting"}
                  {(status === "checking-cache" || status === "loading-model") &&
                    " (first run compiles shaders, can take minutes)"}
                </Typography>
              </Box>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={translate}
              disabled={!text.trim() || gpu.checking || !gpu.supported}
            >
              Translate
            </Button>
          )}
          {latencyMs != null && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {languageName(targetLang)} · {(latencyMs / 1000).toFixed(1)} s
            </Typography>
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {logView.length > 0 && (
          <Box sx={{ border: "1px solid rgba(128,128,128,0.35)", borderRadius: 1, p: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              activity log — stages + fetches (requests without a ← line are still pending)
            </Typography>
            <Box
              component="pre"
              sx={{ m: 0, fontSize: 11, overflow: "auto", maxHeight: 220, opacity: 0.85 }}
            >
              {logView.slice(-100).join("\n")}
            </Box>
          </Box>
        )}

        <footer>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>
            Model: {model.name} · backend: WebGPU (in-browser) · nothing leaves this device
            {storage &&
              ` · storage: ${formatBytes(storage.usage)} used / ${formatBytes(storage.quota)} quota`}
          </Typography>
        </footer>
      </main>
      </ThemeProvider>
    </AppSettingsProvider>
  );
}
