"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
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
import {
  VISIBLE_VISION_MODELS,
  VISIBLE_WEBGPU_MODELS,
  getModelInfo,
} from "../lib/model-catalog";
import {
  cachedModelState,
  clearWebGpuModelCache,
  formatBytes,
  formatDuration,
  prefetchModel,
  type CacheStatus,
} from "../lib/model-cache";
import { getPromptProfile, resolveProfile } from "../lib/prompt-profiles";
import { useAppSettings } from "../hooks/use-app-settings";
import { useI18n } from "../hooks/useI18n";
import { useLocalVoices } from "../hooks/use-tts";
import { fetchAvailableModels } from "../lib/providers/llama-server";
import { getHistory, clearHistory } from "../lib/history-store";
import { HistoryClearDialog } from "./history-clear-dialog";
import {
  kokoroCacheState,
  prefetchKokoroModel,
  clearKokoroCache,
} from "../lib/tts/tts-model-cache";
import { KOKORO_VOICES, KOKORO_DTYPES } from "../lib/tts/kokoro";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import type { DownloadProgress } from "../lib/types";
type TabId = "model" | "general";

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
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    window.localStorage.setItem("translate:settingsTab", tab);
  }, [tab]);

  return (
    <>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {t("settings.title")}
        <IconButton size="small" onClick={onClose} aria-label={t("settings.closeAria")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, value) => setTab(value as TabId)} sx={{ mb: 3 }}>
          <Tab value="general" label={t("settings.tabGeneral")} />
          <Tab value="model" label={t("settings.tabModel")} />
        </Tabs>
        <Box sx={{ display: tab === "general" ? "block" : "none" }}>
          <GeneralTab />
        </Box>
        <Box sx={{ display: tab === "model" ? "block" : "none" }}>
          <ModelTab />
        </Box>
      </DialogContent>
    </>
  );
}

function ModelTab() {
  const { settings, update, updateLlama } = useAppSettings();
  const { t } = useI18n();
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
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const detectModels = useCallback(() => {
    const baseUrl = settings.llamaServerConfig.baseUrl;
    if (!baseUrl.trim()) {
      setDetectError(t("provider.enterUrlFirst"));
      return;
    }
    setDetecting(true);
    setDetectError(null);
    fetchAvailableModels(baseUrl, settings.llamaServerConfig.apiKey || undefined)
      .then((models) => {
        setModelOptions(models);
        if (models.length === 0) {
          setDetectError(t("provider.noModels"));
        }
      })
      .catch((e: unknown) => setDetectError(e instanceof Error ? e.message : String(e)))
      .finally(() => setDetecting(false));
  }, [settings.llamaServerConfig.baseUrl, settings.llamaServerConfig.apiKey]);
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
              ? t("provider.connectedModels", { list: models.join(", ") })
              : t("provider.connectedEmpty"),
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
          detail: looksLikeNetwork ? `${msg} ${t("provider.corsHint")}` : msg,
        });
      })
      .finally(() => setTesting(false));
  };

  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="body1">{t("settings.backend")}</Typography>
        <Select
          size="small"
          value={settings.backend}
          onChange={(e) => update({ backend: e.target.value })}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="webgpu">{t("settings.backendWebgpu")}</MenuItem>
          <MenuItem value="llama-server">{t("settings.backendLlama")}</MenuItem>
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
              aria-label={t("settings.webgpuModelAria")}
            >
              {VISIBLE_WEBGPU_MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="body1" sx={{ opacity: 0.7 }}>
              {formatBytes(model.sizeBytes)}
            </Typography>
          </Box>
          {cache.cached ? (
            <Chip
              label={t("settings.downloadedChip", { bytes: formatBytes(cache.bytes) })}
              color="success"
              size="small"
            />
          ) : (
            <Chip label={t("settings.notDownloadedChip")} size="small" />
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
                {t("settings.cancelDownload")}
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={startDownload}
                size="small"
                disabled={cache.cached}
              >
                {cache.cached ? t("settings.downloaded") : t("settings.downloadModel")}
              </Button>
            )}
            {cache.cached && (
              <Button variant="text" color="warning" onClick={clearCache} size="small" disabled={clearing}>
                {clearing ? t("settings.clearing") : t("settings.clearCached")}
              </Button>
            )}
          </Box>
          {modelError && <Alert severity="error">{modelError}</Alert>}
          <TextField
            size="small"
            label={t("settings.systemPromptLabel")}
            value={settings.webgpuSystemPrompt}
            onChange={(e) => update({ webgpuSystemPrompt: e.target.value })}
            multiline
            minRows={2}
            maxRows={6}
            disabled={getPromptProfile(modelId) === "translategemma"}
            placeholder={t("settings.systemPromptPlaceholder")}
            helperText={
              getPromptProfile(modelId) === "translategemma"
                ? t("settings.systemPromptTgHelper")
                : t("settings.systemPromptWebgpuHelper")
            }
          />
        </Box>
      ) : (
        <Box className="flex flex-col gap-2">
          <TextField
            size="small"
            label={t("provider.server")}
            value={settings.llamaServerConfig.baseUrl}
            onChange={(e) => updateLlama({ baseUrl: e.target.value })}
            placeholder="http://<your-llama-server-host>:8080"
            helperText={t("provider.serverHelper")}
          />
          <Box>
            <Autocomplete
              freeSolo
              size="small"
              value={settings.llamaServerConfig.model}
              onChange={(_, v) => updateLlama({ model: typeof v === "string" ? v : "" })}
              onInputChange={(_, v, reason) => {
                if (reason === "reset" || reason === "blur") return;
                updateLlama({ model: v });
              }}
              options={modelOptions}
              onOpen={detectModels}
              loading={detecting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("provider.model")}
                  placeholder={t("provider.modelPlaceholder")}
                />
              )}
              sx={{ minWidth: 0 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Button
                size="small"
                startIcon={detecting ? undefined : <SearchIcon />}
                onClick={detectModels}
                disabled={detecting}
              >
                {detecting ? t("provider.detecting") : t("provider.detect")}
              </Button>
              {detectError && (
                <Typography variant="caption" color="error">{detectError}</Typography>
              )}
            </Box>
          </Box>
          <TextField
            size="small"
            label={t("provider.apiKey")}
            type="password"
            value={settings.llamaServerConfig.apiKey}
            onChange={(e) => updateLlama({ apiKey: e.target.value })}
            placeholder={t("provider.apiKeyPlaceholder")}
          />
          <Box className="flex items-center justify-between gap-2">
            <Typography variant="body1">{t("provider.preset")}</Typography>
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
          <TextField
            size="small"
            label={t("settings.systemPromptLabel")}
            value={settings.llamaServerConfig.systemPrompt}
            onChange={(e) => updateLlama({ systemPrompt: e.target.value })}
            multiline
            minRows={2}
            maxRows={6}
            disabled={
              resolveProfile(
                settings.llamaServerConfig.model,
                settings.llamaServerConfig.modelPreset
              ) === "translategemma"
            }
            placeholder={t("settings.systemPromptPlaceholder")}
            helperText={
              resolveProfile(
                settings.llamaServerConfig.model,
                settings.llamaServerConfig.modelPreset
              ) === "translategemma"
                ? t("settings.systemPromptTgHelper")
                : t("settings.systemPromptLlamaHelper")
            }
          />
          <Box>
            <Button variant="outlined" onClick={runTest} size="small" disabled={testing}>
              {testing ? (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              ) : null}
              {testing ? t("provider.testing") : t("provider.test")}
            </Button>
          </Box>
          {testResult && (
            <Alert severity={testResult.ok ? "success" : "error"}>{testResult.detail}</Alert>
          )}
        </Box>
      )}

      <Divider />

      {settings.backend === "webgpu" && <VisionSettings />}

      {settings.backend === "webgpu" && <Divider />}

      <TtsSettings />
    </Box>
  );
}

function VisionSettings() {
  const { settings, update } = useAppSettings();
  const { t } = useI18n();
  const visionId = settings.visionModelId;
  const model = getModelInfo(visionId) ?? VISIBLE_VISION_MODELS[0];
  const [cache, setCache] = useState<CacheStatus>({ cached: false, bytes: 0 });
  const [phase, setPhase] = useState<"idle" | "downloading">("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const downloadAc = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void cachedModelState(visionId).then((s) => {
      if (active) setCache(s);
    });
    return () => {
      active = false;
    };
  }, [visionId]);

  useEffect(() => {
    return () => downloadAc.current?.abort();
  }, []);

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
    prefetchModel(visionId, {
      onProgress: (p) => setProgress(p),
      signal: ac.signal,
    })
      .then(() => {
        setPhase("idle");
        setStartedAt(null);
        setProgress(null);
        void cachedModelState(visionId).then(setCache);
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
    clearWebGpuModelCache(visionId)
      .then(() => cachedModelState(visionId).then(setCache))
      .catch((e: unknown) =>
        setModelError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setClearing(false));
  };

  return (
    <Box className="flex flex-col gap-2">
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {t("settings.visionTitle")}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        {t("settings.visionHelper")}
      </Typography>
      <Box className="flex flex-wrap items-center gap-2">
        <Select
          size="small"
          value={visionId}
          onChange={(e) => update({ visionModelId: e.target.value })}
          sx={{ minWidth: 240 }}
          disabled={phase === "downloading"}
          aria-label={t("settings.visionModel")}
        >
          {VISIBLE_VISION_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.name}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          {formatBytes(model.sizeBytes)}
        </Typography>
      </Box>
      {cache.cached ? (
        <Chip
          label={t("settings.downloadedChip", { bytes: formatBytes(cache.bytes) })}
          color="success"
          size="small"
        />
      ) : (
        <Chip label={t("settings.notDownloadedChip")} size="small" />
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
            {t("settings.cancelDownload")}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={startDownload}
            size="small"
            disabled={cache.cached}
          >
            {cache.cached ? t("settings.downloaded") : t("settings.downloadModel")}
          </Button>
        )}
        {cache.cached && (
          <Button
            variant="text"
            color="warning"
            onClick={clearCache}
            size="small"
            disabled={clearing}
          >
            {clearing ? t("settings.clearing") : t("settings.clearCached")}
          </Button>
        )}
      </Box>
      {modelError && <Alert severity="error">{modelError}</Alert>}
    </Box>
  );
}

function TtsSettings() {
  const { settings, update } = useAppSettings();
  const { t } = useI18n();
  const voices = useLocalVoices();
  const [kokoroCache, setKokoroCache] = useState<{ cached: boolean; bytes: number } | null>(null);
  const [kokoroDownloading, setKokoroDownloading] = useState(false);
  const [kokoroProgress, setKokoroProgress] = useState(0);
  const kokoroAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void kokoroCacheState(settings.ttsKokoroDtype, settings.ttsKokoroVoice).then((s) => {
      if (active) setKokoroCache(s);
    });
    return () => { active = false; };
  }, [settings.ttsKokoroDtype, settings.ttsKokoroVoice]);

  const startKokoroDownload = useCallback(async () => {
    setKokoroDownloading(true);
    setKokoroProgress(0);
    const ac = new AbortController();
    kokoroAbortRef.current = ac;
    try {
      await prefetchKokoroModel(settings.ttsKokoroDtype, settings.ttsKokoroVoice, {
        onProgress: (p) => setKokoroProgress(p.percent),
        signal: ac.signal,
      });
      const s = await kokoroCacheState(settings.ttsKokoroDtype, settings.ttsKokoroVoice);
      setKokoroCache(s);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error("Kokoro download failed", e);
    } finally {
      setKokoroDownloading(false);
      kokoroAbortRef.current = null;
    }
  }, [settings.ttsKokoroDtype, settings.ttsKokoroVoice]);

  const cancelKokoroDownload = useCallback(() => {
    kokoroAbortRef.current?.abort();
  }, []);

  const doClearKokoroCache = useCallback(async () => {
    await clearKokoroCache();
    setKokoroCache({ cached: false, bytes: 0 });
  }, []);

  return (
    <Box className="flex flex-col gap-2">
      <Typography variant="body1" sx={{ fontWeight: 600 }}>{t("tts.title")}</Typography>
      <Box className="flex items-center justify-between gap-2">
        <Box>
          <Typography variant="body1">{t("tts.toggle")}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {t("tts.toggleHelper")}
          </Typography>
        </Box>
        <Switch
          checked={settings.ttsEnabled}
          onChange={(e) => update({ ttsEnabled: e.target.checked })}
        />
      </Box>
      {settings.ttsEnabled && (
        <>
          {voices.length > 0 ? (
            <Box className="flex items-center justify-between gap-2">
              <Typography variant="body1">{t("tts.voice")}</Typography>
              <Select
                size="small"
                value={settings.ttsVoiceName}
                onChange={(e) => update({ ttsVoiceName: e.target.value })}
                sx={{ minWidth: 240 }}
              >
                <MenuItem value="">{t("tts.voiceAuto")}</MenuItem>
                {voices.map((v) => (
                  <MenuItem key={v.name + v.lang} value={v.name}>
                    {v.name} ({v.lang})
                  </MenuItem>
                ))}
              </Select>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {t("tts.noVoices")}
            </Typography>
          )}
          <Box className="flex flex-col gap-2">
            <Box className="flex items-center justify-between gap-2">
              <Typography variant="body1">{t("tts.kokoroVoice")}</Typography>
              <Select
                size="small"
                value={settings.ttsKokoroVoice}
                onChange={(e) => update({ ttsKokoroVoice: e.target.value })}
                sx={{ minWidth: 160 }}
              >
                {KOKORO_VOICES.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box className="flex items-center justify-between gap-2">
              <Typography variant="body1">Dtype</Typography>
              <Select
                size="small"
                value={settings.ttsKokoroDtype}
                onChange={(e) =>
                  update({ ttsKokoroDtype: e.target.value as typeof settings.ttsKokoroDtype })
                }
                sx={{ minWidth: 100 }}
              >
                {KOKORO_DTYPES.filter((d) => d.id === "fp32").map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.id} ({formatBytes(d.sizeBytes)})
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {kokoroCache?.cached ? (
              <Box className="flex items-center gap-2">
                <Chip
                  label={`${t("tts.kokoroDownloaded")} · ${formatBytes(kokoroCache.bytes)}`}
                  size="small"
                  color="success"
                />
                <Button size="small" color="error" onClick={() => void doClearKokoroCache()}>
                  {t("tts.kokoroClear")}
                </Button>
              </Box>
            ) : kokoroDownloading ? (
              <Box className="flex flex-col gap-1">
                <LinearProgress
                  variant="determinate"
                  value={kokoroProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Box className="flex items-center justify-between">
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    {Math.round(kokoroProgress)}%
                  </Typography>
                  <Button size="small" color="inherit" onClick={cancelKokoroDownload}>
                    {t("common.cancel")}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box className="flex items-center gap-2">
                <Chip label={t("tts.kokoroNotDownloaded")} size="small" color="default" />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void startKokoroDownload()}
                >
                  {t("tts.kokoroDownload")}
                </Button>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

function GeneralTab() {
  const { settings, update } = useAppSettings();
  const { t } = useI18n();
  const [clearOpen, setClearOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(getHistory().length);
  }, []);

  return (
    <Box className="flex flex-col gap-3">
      <Divider />
      <Box className="flex flex-col gap-2">
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{t("general.privacy")}</Typography>
        <Box className="flex items-center justify-between gap-2">
          <Box>
            <Typography variant="body1">{t("general.neverRecord")}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {t("general.neverRecordHelper")}
            </Typography>
          </Box>
          <Switch
            checked={settings.historyDisabled}
            onChange={(e) => update({ historyDisabled: e.target.checked })}
          />
        </Box>
        <Button
          variant="outlined"
          color="error"
          size="small"
          disabled={historyCount === 0}
          onClick={() => setClearOpen(true)}
        >
          {t("general.deleteAllHistory", { n: historyCount })}
        </Button>
      </Box>
      <HistoryClearDialog
        open={clearOpen}
        count={historyCount}
        onConfirm={() => {
          clearHistory();
          setHistoryCount(0);
          setClearOpen(false);
        }}
        onClose={() => setClearOpen(false)}
      />
      <Divider />
      <Box className="flex items-center justify-between gap-2">
        <Box>
          <Typography variant="body1">{t("general.diagnostics")}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {t("general.diagnosticsHelper")}
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
