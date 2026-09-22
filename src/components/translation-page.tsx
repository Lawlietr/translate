"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { CopyButton } from "./copy-button";
import { SUPPORTED_TRANSLATION_LANGUAGES, languageName } from "../lib/languages";
import { useWebGpu } from "../hooks/use-webgpu";
import { useAppSettings } from "../hooks/use-app-settings";
import { getModelInfo, VISIBLE_WEBGPU_MODELS } from "../lib/model-catalog";
import { cachedModelState, formatDuration, type CacheStatus } from "../lib/model-cache";
import { getProviderOrThrow } from "../lib/providers/registry";
import type { ProviderConfig } from "../lib/providers/types";
import { ActivityLogPanel } from "./activity-log-panel";

type Phase = "idle" | "translating";

interface TranslationPageProps {
  onOpenSettings: (tab?: "inference" | "general") => void;
  settingsOpen: boolean;
}

function errorHint(message: string, webgpu: boolean): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("no usable webgpu device"))
    return "This browser has no WebGPU device. Use a recent Chrome/Edge/Chromium build, enable WebGPU if it is disabled, or switch the backend to llama-server in Settings.";
  if (msg.includes("secure context") || msg.includes("only available in a secure"))
    return "WebGPU requires a secure context — open the app over HTTPS or http://localhost, not plain http over the LAN.";
  if (webgpu && (msg.includes("download") || msg.includes("cache")))
    return "The model is not fully downloaded in this browser — open Settings (Inference tab) and download it there first.";
  if (msg.includes("allocationsize") || msg.includes("insufficient"))
    return "The GPU ran out of memory for this model — open Settings (Inference tab), switch to the smaller model, or close GPU-heavy tabs and retry.";
  if (msg.includes("llama-server") || msg.includes("failed to fetch"))
    return "Could not reach llama-server — open Settings (Inference tab) and use Test connection to check the server, URL, and CORS.";
  return null;
}

export function TranslationPage({ onOpenSettings, settingsOpen }: TranslationPageProps) {
  const { settings, update } = useAppSettings();
  const backend = settings.backend;
  const webgpuBackend = backend === "webgpu";
  const modelId = settings.webgpuModelId;
  const model = getModelInfo(modelId) ?? VISIBLE_WEBGPU_MODELS[0];
  const gpu = useWebGpu();

  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cache, setCache] = useState<CacheStatus | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const translating = phase === "translating";

  useEffect(() => {
    if (!webgpuBackend) return;
    let active = true;
    void cachedModelState(modelId).then((s) => {
      if (active) setCache(s);
    });
    return () => {
      active = false;
    };
  }, [modelId, settingsOpen, webgpuBackend]);

  useEffect(() => {
    if (!translating || startedAt == null) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => clearInterval(timer);
  }, [translating, startedAt]);

  useEffect(() => () => acRef.current?.abort(), []);

  const modelReady = !webgpuBackend || cache === null || cache.cached;

  const startTranslate = () => {
    if (!text.trim()) return;
    if (webgpuBackend && cache !== null && !cache.cached) {
      setError("No model downloaded in this browser yet. Open Settings (Inference tab) and download the model first.");
      return;
    }
    setError(null);
    setOutput("");
    setStatus("");
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase("translating");
    const ac = new AbortController();
    acRef.current = ac;
    const config: ProviderConfig = webgpuBackend
      ? { model: modelId, onStatus: setStatus }
      : { ...settings.llamaServerConfig, onStatus: setStatus };
    getProviderOrThrow(backend)
      .translate(
        { text: text.trim(), sourceLang: settings.defaultSourceLang, targetLang: settings.defaultTargetLang },
        config,
        ac.signal
      )
      .then((result) => setOutput(result.text))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError("Cancelled.");
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        setPhase("idle");
        setStartedAt(null);
      });
  };

  const cancel = () => acRef.current?.abort();

  const clear = () => {
    setText("");
    setOutput("");
    setError(null);
  };

  const swap = () => {
    if (output) {
      setText(output);
      setOutput("");
    }
    update({
      defaultSourceLang: settings.defaultTargetLang,
      defaultTargetLang: settings.defaultSourceLang,
    });
  };

  return (
    <Box className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 flex flex-col gap-3">
      {webgpuBackend && !gpu.secureContext && (
        <Alert severity="warning">
          WebGPU needs a secure context — open over https:// or http://localhost.
        </Alert>
      )}
      {webgpuBackend && !gpu.checking && gpu.secureContext && !gpu.supported && (
        <Alert severity="error">
          WebGPU is not available in this browser. Use a recent Chrome/Edge/Chromium build with
          WebGPU enabled, or switch the backend to llama-server in Settings.
        </Alert>
      )}

      <Box
        className="grid gap-3"
        sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
      >
        <Box className="flex flex-col gap-2 min-h-[260px]">
          <Box className="flex items-center gap-1">
            <Select
              size="small"
              value={settings.defaultSourceLang}
              onChange={(e) => update({ defaultSourceLang: e.target.value })}
              sx={{ minWidth: 150 }}
              aria-label="Source language"
            >
              {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {languageName(l.id)}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title="Swap languages (moves the result into the source box)">
              <IconButton onClick={swap} size="small" aria-label="Swap languages">
                <SwapHorizIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={7}
            placeholder="Type or paste text to translate…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            slotProps={{ input: { "aria-label": "Source text" } }}
            size="small"
          />
          <Box className="flex items-center justify-between">
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {text.length.toLocaleString()} chars
            </Typography>
            <Box className="flex items-center gap-1">
              <CopyButton value={text} label="Copy source" />
              <Tooltip title="Clear">
                <IconButton size="small" onClick={clear} aria-label="Clear">
                  <DeleteSweepIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Box className="flex flex-col gap-2 min-h-[260px]">
          <Box className="flex items-center gap-1">
            <Select
              size="small"
              value={settings.defaultTargetLang}
              onChange={(e) => update({ defaultTargetLang: e.target.value })}
              sx={{ minWidth: 150 }}
              aria-label="Target language"
            >
              {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {languageName(l.id)}
                </MenuItem>
              ))}
            </Select>
          </Box>
          {modelReady ? (
            <TextField
              fullWidth
              multiline
              minRows={7}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder={
                webgpuBackend
                  ? "Translation appears here (editable)."
                  : "Translation appears here (editable) — sent to your llama-server."
              }
              slotProps={{ input: { "aria-label": "Translated text" } }}
              size="small"
            />
          ) : (
            <Box className="flex-1 flex flex-col items-center justify-center gap-3 border border-dashed rounded-md p-6 text-center">
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                No model downloaded in this browser yet.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onOpenSettings("inference")}
              >
                Choose & download a model in Settings
              </Button>
            </Box>
          )}
          <Box className="flex items-center justify-between">
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {output.length.toLocaleString()} chars
            </Typography>
            <CopyButton value={output} label="Copy translation" />
          </Box>
        </Box>
      </Box>

      <Box className="flex flex-wrap items-center gap-2">
        {translating ? (
          <Button variant="outlined" color="error" onClick={cancel}>
            Cancel
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={startTranslate}
            disabled={
              !text.trim() ||
              !modelReady ||
              (webgpuBackend && (gpu.checking || !gpu.secureContext || !gpu.supported))
            }
          >
            Translate
          </Button>
        )}
        {status && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {status}
          </Typography>
        )}
        {translating && startedAt != null && (
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {formatDuration(elapsed)}
          </Typography>
        )}
      </Box>

      {error && (
        <Box className="flex flex-col gap-1">
          <Alert severity="error">{error}</Alert>
          {errorHint(error, webgpuBackend) && (
            <Typography variant="caption" sx={{ opacity: 0.7, pl: 1 }}>
              {errorHint(error, webgpuBackend)}
            </Typography>
          )}
        </Box>
      )}

      {settings.diagnostics && <ActivityLogPanel />}

      <Divider sx={{ opacity: 0.2 }} />
      <Box className="flex items-center justify-between gap-2 flex-wrap">
        <Box className="flex items-center gap-2 flex-wrap">
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {webgpuBackend
              ? `${model.name} · WebGPU (in-browser)`
              : `llama-server · ${settings.llamaServerConfig.model || "auto-detect"}`}
          </Typography>
          {webgpuBackend ? (
            gpu.checking ? (
              <Chip label="checking WebGPU…" size="small" />
            ) : !gpu.secureContext ? (
              <Chip label="NOT a secure context" color="warning" size="small" />
            ) : !gpu.supported ? (
              <Chip label="WebGPU unavailable" color="error" size="small" />
            ) : cache !== null && !cache.cached ? (
              <Chip label="model not downloaded" color="warning" size="small" />
            ) : (
              <Chip label="WebGPU ready" color="success" size="small" />
            )
          ) : (
            <Chip label="llama-server (local)" size="small" />
          )}
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          nothing leaves this device
        </Typography>
      </Box>
    </Box>
  );
}
