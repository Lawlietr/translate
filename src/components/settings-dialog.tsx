"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { VISIBLE_WEBGPU_MODELS, getModelInfo } from "../lib/model-catalog";
import {
  cachedModelState,
  clearWebGpuModelCache,
  formatBytes,
  formatDuration,
  prefetchModel,
  type CacheStatus,
} from "../lib/model-cache";
import { SUPPORTED_TRANSLATION_LANGUAGES, languageName } from "../lib/languages";
import { useAppSettings } from "../hooks/use-app-settings";
import { fetchAvailableModels } from "../lib/providers/llama-server";
import CloseIcon from "@mui/icons-material/Close";
import type { DownloadProgress } from "../lib/types";
import type { UILanguage } from "../lib/settings-manager";

type TabId = "inference" | "general";

interface SettingsDialogProps {
  open: boolean;
  initialTab: TabId;
  onClose: () => void;
}

export function SettingsDialog({ open, initialTab, onClose }: SettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <SettingsBody initialTab={initialTab} onClose={onClose} />
    </Dialog>
  );
}

function SettingsBody({ initialTab, onClose }: { initialTab: TabId; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>(initialTab);

  return (
    <>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Settings
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, value) => setTab(value as TabId)} sx={{ mb: 3 }}>
          <Tab value="inference" label="Inference" />
          <Tab value="general" label="General" />
        </Tabs>
        <Box sx={{ display: tab === "inference" ? "block" : "none" }}>
          <InferenceTab />
        </Box>
        <Box sx={{ display: tab === "general" ? "block" : "none" }}>
          <GeneralTab />
        </Box>
      </DialogContent>
    </>
  );
}

function InferenceTab() {
  const { settings, update, updateLlama } = useAppSettings();
  const modelId = settings.webgpuModelId;
  const model = getModelInfo(modelId) ?? VISIBLE_WEBGPU_MODELS[0];
  const [cache, setCache] = useState<CacheStatus>({ cached: false, bytes: 0 });
  const [phase, setPhase] = useState<"idle" | "downloading">("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const downloadAc = useRef<AbortController | null>(null);

  const refreshCache = useCallback(async (id: string) => {
    setCache(await cachedModelState(id));
  }, []);

  useEffect(() => {
    return () => downloadAc.current?.abort();
  }, []);

  useEffect(() => {
    let active = true;
    void cachedModelState(modelId).then((s) => {
      if (active) setCache(s);
    });
    return () => {
      active = false;
    };
  }, [modelId]);

  useEffect(() => {
    if (phase !== "downloading" || startedAt == null) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  const startDownload = () => {
    setModelError(null);
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
        void refreshCache(modelId);
      })
      .catch((e: unknown) => {
        setPhase("idle");
        setStartedAt(null);
        setProgress(null);
        if (e instanceof DOMException && e.name === "AbortError") return;
        setModelError(e instanceof Error ? e.message : String(e));
      });
  };

  const cancelDownload = () => downloadAc.current?.abort();

  const clearCache = () => {
    setClearing(true);
    setModelError(null);
    clearWebGpuModelCache(modelId)
      .then(() => void refreshCache(modelId))
      .catch((e: unknown) =>
        setModelError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setClearing(false));
  };

  const runTest = () => {
    setTesting(true);
    setTestResult(null);
    fetchAvailableModels(
      settings.llamaServerConfig.baseUrl,
      settings.llamaServerConfig.apiKey || undefined
    )
      .then((models) => {
        setTestResult({
          ok: true,
          detail:
            models.length > 0
              ? `Connected — models: ${models.join(", ")}`
              : "Connected, but no models are exposed (GET /v1/models returned an empty list).",
        });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        const looksLikeNetwork =
          msg.includes("Failed to fetch") ||
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("timeout");
        setTestResult({
          ok: false,
          detail: looksLikeNetwork
            ? `${msg} — check the server is running and reachable; if it runs on another machine, make sure CORS is enabled (start llama-server without --no-cors).`
            : msg,
        });
      })
      .finally(() => setTesting(false));
  };

  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="body2">Backend</Typography>
        <Select
          size="small"
          value={settings.backend}
          onChange={(e) => update({ backend: e.target.value })}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="webgpu">WebGPU (in-browser)</MenuItem>
          <MenuItem value="llama-server">llama-server (local)</MenuItem>
        </Select>
      </Box>

      <Divider />

      {settings.backend === "webgpu" ? (
        <Box className="flex flex-col gap-2">
          <Box className="flex flex-wrap items-center gap-2">
            <Select
              size="small"
              value={modelId}
              onChange={(e) => update({ webgpuModelId: e.target.value })}
              sx={{ minWidth: 240 }}
              disabled={phase === "downloading"}
              aria-label="WebGPU model"
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
          </Box>
          {cache.cached ? (
            <Chip label={`downloaded · ${formatBytes(cache.bytes)}`} color="success" size="small" />
          ) : (
            <Chip label="not downloaded" size="small" />
          )}
          {phase === "downloading" && progress && (
            <Box className="flex flex-col gap-1">
              <LinearProgress variant="determinate" value={progress.percent * 100} />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {formatBytes(progress.loaded)} / {formatBytes(progress.total)} ·{" "}
                {formatBytes(progress.speedBps)}/s · {formatDuration(elapsed)}
              </Typography>
            </Box>
          )}
          <Box className="flex flex-wrap items-center gap-2">
            {phase === "downloading" ? (
              <Button
                variant="outlined"
                color="error"
                onClick={cancelDownload}
                size="small"
              >
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
            {cache.cached && (
              <Button variant="text" color="warning" onClick={clearCache} size="small" disabled={clearing}>
                {clearing ? "Clearing…" : "Clear cached model"}
              </Button>
            )}
          </Box>
          {modelError && <Alert severity="error">{modelError}</Alert>}
        </Box>
      ) : (
        <Box className="flex flex-col gap-2">
          <TextField
            size="small"
            label="Server"
            value={settings.llamaServerConfig.baseUrl}
            onChange={(e) => updateLlama({ baseUrl: e.target.value })}
            placeholder="http://<your-llama-server-host>:8080"
            helperText="host:port of your llama-server — the /v1 prefix is added automatically"
          />
          <TextField
            size="small"
            label="Model"
            value={settings.llamaServerConfig.model}
            onChange={(e) => updateLlama({ model: e.target.value })}
            placeholder="preset name or model id from /v1/models (blank = auto-detect)"
          />
          <TextField
            size="small"
            label="API Key"
            type="password"
            value={settings.llamaServerConfig.apiKey}
            onChange={(e) => updateLlama({ apiKey: e.target.value })}
            placeholder="only if llama-server was started with --api-key"
          />
          <Box className="flex items-center justify-between gap-2">
            <Typography variant="body2">Prompt preset</Typography>
            <Select
              size="small"
              value={settings.llamaServerConfig.modelPreset}
              onChange={(e) => updateLlama({ modelPreset: e.target.value })}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="auto">auto</MenuItem>
              <MenuItem value="hy-mt2">hy-mt2</MenuItem>
              <MenuItem value="translategemma">translategemma</MenuItem>
              <MenuItem value="generic">generic</MenuItem>
            </Select>
          </Box>
          <Box>
            <Button variant="outlined" onClick={runTest} size="small" disabled={testing}>
              {testing ? (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              ) : null}
              {testing ? "Testing…" : "Test connection"}
            </Button>
          </Box>
          {testResult && (
            <Alert severity={testResult.ok ? "success" : "error"}>{testResult.detail}</Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

function GeneralTab() {
  const { settings, update } = useAppSettings();

  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="body2">UI language</Typography>
        <Select
          size="small"
          value={settings.language}
          onChange={(e) => update({ language: e.target.value as UILanguage })}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="zh-TW">繁體中文</MenuItem>
          <MenuItem value="en">English</MenuItem>
        </Select>
      </Box>
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="body2">Default source language</Typography>
        <Select
          size="small"
          value={settings.defaultSourceLang}
          onChange={(e) => update({ defaultSourceLang: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {languageName(l.id)}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="body2">Default target language</Typography>
        <Select
          size="small"
          value={settings.defaultTargetLang}
          onChange={(e) => update({ defaultTargetLang: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {languageName(l.id)}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Divider />
      <Box className="flex items-center justify-between gap-2">
        <Box>
          <Typography variant="body2">Diagnostics</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Show the live activity log (stages, fetches, errors) on the main page
          </Typography>
        </Box>
        <Switch
          checked={settings.diagnostics}
          onChange={(e) => update({ diagnostics: e.target.checked })}
        />
      </Box>
    </Box>
  );
}
