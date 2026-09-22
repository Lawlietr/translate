"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { CopyButton } from "./copy-button";
import { useWebGpu } from "../hooks/use-webgpu";
import { VISIBLE_WEBGPU_MODELS, getModelInfo } from "../lib/model-catalog";
import {
  cachedModelState,
  formatBytes,
  formatDuration,
  prefetchModel,
  type CacheStatus,
} from "../lib/model-cache";
import { SUPPORTED_TRANSLATION_LANGUAGES } from "../lib/languages";
import { loadSettings, saveSettings } from "../lib/settings-manager";
import { getProviderOrThrow } from "../lib/providers/registry";
import type { DownloadProgress } from "../lib/types";

function errorHint(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes("download") || lower.includes("cache")) {
    return "Download the model first — use the Download model button above.";
  }
  if (lower.includes("memory") || lower.includes("oom") || lower.includes("allocat")) {
    return "This model is likely too large for your GPU memory — switch to the smaller model in the model picker above.";
  }
  return null;
}

export function TranslationPage() {
  const gpu = useWebGpu();
  const [modelId, setModelId] = useState(() => loadSettings().webgpuModelId);
  const [sourceLang, setSourceLang] = useState(() => loadSettings().defaultSourceLang);
  const [targetLang, setTargetLang] = useState(() => loadSettings().defaultTargetLang);
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [cache, setCache] = useState<CacheStatus>({ cached: false, bytes: 0 });
  const [cacheChecked, setCacheChecked] = useState(false);
  const [phase, setPhase] = useState<"idle" | "downloading" | "translating">("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const translateAc = useRef<AbortController | null>(null);
  const downloadAc = useRef<AbortController | null>(null);

  const model = getModelInfo(modelId) ?? VISIBLE_WEBGPU_MODELS[0];

  useEffect(() => {
    let active = true;
    void cachedModelState(modelId).then((s) => {
      if (active) {
        setCache(s);
        setCacheChecked(true);
      }
    });
    return () => {
      active = false;
    };
  }, [modelId, phase]);

  useEffect(() => {
    if (phase === "idle" || startedAt == null) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
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

  const swapLangs = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (output) {
      setText(output);
      setOutput("");
      setLatencyMs(null);
    }
  };

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
      signal: ac.signal,
    })
      .then(() => {
        setPhase("idle");
        setStartedAt(null);
        setProgress(null);
      })
      .catch((e: unknown) => {
        setPhase("idle");
        setStartedAt(null);
        setProgress(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  const cancelDownload = () => downloadAc.current?.abort();

  const translate = () => {
    if (!text.trim()) return;
    setError(null);
    setOutput("");
    setLatencyMs(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setPhase("translating");
    setStatus("starting");
    const ac = new AbortController();
    translateAc.current = ac;
    getProviderOrThrow("webgpu")
      .translate(
        { text: text.trim(), sourceLang, targetLang },
        { model: modelId, onStatus: setStatus },
        ac.signal
      )
      .then((res) => {
        setPhase("idle");
        setStartedAt(null);
        setStatus(null);
        setOutput(res.text);
        setLatencyMs(res.latencyMs);
      })
      .catch((e: unknown) => {
        setPhase("idle");
        setStartedAt(null);
        setStatus(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  const cancelTranslate = () => translateAc.current?.abort();

  const translating = phase === "translating";
  const downloading = phase === "downloading";
  const busy = downloading || translating;
  const modelReady = !cacheChecked || cache.cached;
  const hint = error ? errorHint(error) : null;

  const languageOptions = SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
    <MenuItem key={l.id} value={l.id}>
      {l.id === "zh-TW" ? "繁體中文" : l.id === "zh-CN" ? "簡體中文" : l.enName}
    </MenuItem>
  ));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 flex flex-col gap-4">
      {!gpu.secureContext && (
        <Alert severity="warning">
          This page is not served over HTTPS (or localhost), so WebGPU is disabled by the browser.
          From another machine, open{" "}
          <code>
            https://&lt;host-lan-ip&gt;:3443
          </code>{" "}
          (self-signed cert — accept the warning once).
        </Alert>
      )}
      {!gpu.checking && gpu.secureContext && !gpu.supported && (
        <Alert severity="error">
          WebGPU is not available in this browser. Use a recent Chrome or Edge with hardware
          acceleration enabled.
        </Alert>
      )}

      <Box className="flex flex-col gap-1">
        <Box className="flex flex-wrap items-center gap-2">
          <Select
            size="small"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            sx={{ minWidth: 300 }}
            disabled={busy}
            aria-label="Model"
          >
            {VISIBLE_WEBGPU_MODELS.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {formatBytes(model.sizeBytes)}
          </Typography>
          {cacheChecked &&
            (cache.cached ? (
              <Chip
                label={`downloaded · ${formatBytes(cache.bytes)}`}
                color="success"
                size="small"
              />
            ) : (
              <Chip label="not downloaded" size="small" />
            ))}
        </Box>
        {downloading && progress && (
          <Box className="flex flex-col gap-1">
            <LinearProgress variant="determinate" value={progress.percent * 100} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {formatBytes(progress.loaded)} / {formatBytes(progress.total)} ·{" "}
              {formatBytes(progress.speedBps)}/s · {formatDuration(elapsed)}
            </Typography>
          </Box>
        )}
        {downloading ? (
          <Button variant="outlined" color="error" onClick={cancelDownload} size="small">
            Cancel download
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={startDownload}
            size="small"
            disabled={cache.cached}
          >
            {cache.cached ? "Downloaded" : "Download model"}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box className="flex items-center justify-between gap-2">
            <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
              Source
            </Typography>
            <Box className="flex items-center gap-1">
              <Select
                size="small"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                sx={{ minWidth: 140 }}
                disabled={busy}
              >
                {languageOptions}
              </Select>
              <IconButton
                size="small"
                onClick={swapLangs}
                disabled={busy}
                title="Swap languages"
              >
                <SwapHorizIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ position: "relative" }}>
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={6}
              maxRows={16}
              fullWidth
              disabled={translating}
              placeholder="Type or paste text to translate"
              slotProps={{ input: { sx: { pb: 3 } } }}
            />
            <Box sx={{ position: "absolute", left: 4, bottom: 2 }}>
              <CopyButton value={text} label="Copy source" />
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box className="flex items-center justify-between gap-2">
            <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
              Target
            </Typography>
            <Select
              size="small"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              sx={{ minWidth: 140 }}
              disabled={busy}
            >
              {languageOptions}
            </Select>
          </Box>
          {!modelReady ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 4,
                opacity: 0.9,
              }}
            >
              <Typography variant="body2">
                No model downloaded for this browser yet.
              </Typography>
              <Button
                onClick={startDownload}
                variant="outlined"
                size="small"
                disabled={downloading}
              >
                Download model
              </Button>
            </Box>
          ) : (
            <Box sx={{ position: "relative", flex: 1 }}>
              <TextField
                value={output}
                multiline
                minRows={6}
                maxRows={16}
                fullWidth
                slotProps={{ input: { readOnly: true, sx: { pb: 3 } } }}
              />
              <Box sx={{ position: "absolute", left: 4, bottom: 2 }}>
                <CopyButton value={output} label="Copy translation" />
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Box className="flex items-center gap-4">
        {translating ? (
          <>
            <LinearProgress sx={{ flex: 1 }} />
            <Button variant="outlined" color="error" onClick={cancelTranslate}>
              Cancel
            </Button>
            <Box className="flex items-center gap-2">
              <CircularProgress size={18} />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {formatDuration(elapsed)} — {status ?? "starting"}
                {(status === "checking-cache" || status === "loading-model") &&
                  " (first run compiles shaders, can take minutes)"}
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              onClick={translate}
              disabled={
                !text.trim() ||
                busy ||
                gpu.checking ||
                !gpu.secureContext ||
                !gpu.supported ||
                !modelReady
              }
            >
              Translate
            </Button>
            {latencyMs != null && (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {(latencyMs / 1000).toFixed(1)} s
              </Typography>
            )}
          </>
        )}
      </Box>

      {error && (
        <Alert severity="error">
          {error}
          {hint && (
            <Box component="div" sx={{ mt: 1 }}>
              {hint}
            </Box>
          )}
        </Alert>
      )}

      <footer className="flex items-center justify-between gap-3">
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          {model.name} · WebGPU (in-browser) · nothing leaves this device
        </Typography>
        {gpu.checking ? (
          <Chip label="checking WebGPU…" size="small" />
        ) : !gpu.secureContext ? (
          <Chip label="NOT a secure context" color="warning" size="small" />
        ) : gpu.supported ? (
          <Chip label="WebGPU ready" color="success" size="small" />
        ) : (
          <Chip label="WebGPU unavailable" color="error" size="small" />
        )}
      </footer>
    </main>
  );
}
