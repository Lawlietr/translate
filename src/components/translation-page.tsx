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
import HistoryIcon from "@mui/icons-material/History";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { CopyButton } from "./copy-button";
import { HistoryPanel } from "./history-panel";
import { SpeakerButton } from "./speaker-button";
import { useTts } from "../hooks/use-tts";

import {
  HISTORY_MAX_INPUT_CHARS,
  addHistory,
  getHistory,
  type HistoryEntry,
} from "../lib/history-store";
import { SUPPORTED_TRANSLATION_LANGUAGES, languageName } from "../lib/languages";
import { useAppSettings } from "../hooks/use-app-settings";
import { useI18n } from "../hooks/useI18n";
import type { Messages } from "../lib/i18n/translations";
import { useWebGpu } from "../hooks/use-webgpu";
import { useWorkspace } from "../hooks/use-workspace";
import { getModelInfo, VISIBLE_WEBGPU_MODELS } from "../lib/model-catalog";
import { cachedModelState, formatDuration, type CacheStatus } from "../lib/model-cache";
import { getProviderOrThrow } from "../lib/providers/registry";
import type { ProviderConfig } from "../lib/providers/types";
import { ActivityLogPanel } from "./activity-log-panel";

type Phase = "idle" | "translating";

interface TranslationPageProps {
  onOpenSettings: (tab?: "model" | "general") => void;
  settingsOpen: boolean;
}

function errorHint(
  message: string,
  webgpu: boolean,
  t: (key: keyof Messages, vars?: Record<string, string | number>) => string
): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("no usable webgpu device")) return t("hint.noDevice");
  if (msg.includes("secure context") || msg.includes("only available in a secure"))
    return t("hint.secureContext");
  if (webgpu && (msg.includes("download") || msg.includes("cache")))
    return t("hint.notDownloaded");
  if (msg.includes("allocationsize") || msg.includes("insufficient"))
    return t("hint.outOfMemory");
  if (msg.includes("llama-server") || msg.includes("failed to fetch"))
    return t("hint.llamaUnreachable");
  return null;
}

export function TranslationPage({ onOpenSettings, settingsOpen }: TranslationPageProps) {
  const { settings, update } = useAppSettings();
  const { t } = useI18n();
  const backend = settings.backend;
  const webgpuBackend = backend === "webgpu";
  const modelId = settings.webgpuModelId;
  const model = getModelInfo(modelId) ?? VISIBLE_WEBGPU_MODELS[0];
  const gpu = useWebGpu();

  const workspace = useWorkspace();
  const text = workspace.text;
  const output = workspace.output;
  const tts = useTts();
  const { stop: ttsStop } = tts;
  const ttsAvailable = tts.available;
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastDuration, setLastDuration] = useState(0);
  const [cache, setCache] = useState<CacheStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  useEffect(() => {
    if (!ttsAvailable) ttsStop();
  }, [ttsAvailable, ttsStop]);

  useEffect(() => {
    setHistory(getHistory());
  }, [settingsOpen]);

  useEffect(() => {
    setHistoryOpen(window.localStorage.getItem("translate:historyOpen") === "1");
  }, []);

  const applyHistoryOpen = (next: boolean) => {
    setHistoryOpen(next);
    window.localStorage.setItem("translate:historyOpen", next ? "1" : "0");
  };

  const modelReady = !webgpuBackend || cache === null || cache.cached;

  const startTranslate = () => {
    if (!text.trim()) return;
    if (webgpuBackend && cache !== null && !cache.cached) {
      setError(t("page.noModelLong"));
      return;
    }
    setError(null);
    workspace.set({ output: "" });
    setStatus("");
    const started = Date.now();
    setStartedAt(started);
    setElapsed(0);
    setPhase("translating");
    const ac = new AbortController();
    acRef.current = ac;
    const config: ProviderConfig = webgpuBackend
      ? { model: modelId, systemPrompt: settings.webgpuSystemPrompt, onStatus: setStatus }
      : { ...settings.llamaServerConfig, onStatus: setStatus };
    getProviderOrThrow(backend)
      .translate(
        { text: text.trim(), sourceLang: settings.defaultSourceLang, targetLang: settings.defaultTargetLang },
        config,
        ac.signal
      )
      .then((result) => {
        const src = text.trim();
        workspace.set({ output: result.text });
        if (src.length <= HISTORY_MAX_INPUT_CHARS) {
          setHistory(
            addHistory(
              {
                sourceText: src,
                targetText: result.text,
                sourceLang: settings.defaultSourceLang,
                targetLang: settings.defaultTargetLang,
              },
              { disabled: settings.historyDisabled }
            )
          );
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError(t("page.cancelled"));
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        setLastDuration((Date.now() - started) / 1000);
        setStatus("");
        setPhase("idle");
        setStartedAt(null);
      });
  };

  const cancel = () => acRef.current?.abort();

  const clear = () => {
    workspace.clear();
    setError(null);
  };

  const swap = () => {
    if (output) {
      workspace.set({ text: output, output: "" });
    }
    update({
      defaultSourceLang: settings.defaultTargetLang,
      defaultTargetLang: settings.defaultSourceLang,
    });
  };

  const restoreEntry = (entry: HistoryEntry) => {
    workspace.set({ text: entry.sourceText, output: entry.targetText });
    update({
      defaultSourceLang: entry.sourceLang,
      defaultTargetLang: entry.targetLang,
    });
  };

  return (
    <Box className="flex-1 w-full flex min-h-0">
      {historyOpen && (
        <HistoryPanel
          entries={history}
          onUpdate={setHistory}
          onClose={() => applyHistoryOpen(false)}
          onRestore={restoreEntry}
        />
      )}
      <Box className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 flex flex-col gap-3 min-w-0 overflow-y-auto">
      {webgpuBackend && !gpu.secureContext && (
        <Alert severity="warning">
          {t("page.insecureAlert")}
        </Alert>
      )}
      {webgpuBackend && !gpu.checking && gpu.secureContext && !gpu.supported && (
        <Alert severity="error">
          {t("page.unsupportedAlert")}
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
              aria-label={t("page.sourceLangAria")}
            >
              {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {languageName(l.id)}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title={t("page.swapTooltip")}>
              <IconButton onClick={swap} size="small" aria-label={t("page.swapAria")}>
                <SwapHorizIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={7}
            placeholder={t("page.inputPlaceholder")}
            value={text}
            onChange={(e) => workspace.set({ text: e.target.value })}
            slotProps={{ input: { "aria-label": t("page.sourceTextAria") } }}
            size="small"
          />
          <Box className="flex items-center justify-between">
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {t("common.chars", { n: text.length.toLocaleString() })}
            </Typography>
            <Box className="flex items-center gap-1">
              {ttsAvailable && (
                <SpeakerButton
                  speaking={tts.speaking === "input"}
                  loading={tts.loading}
                  disabled={!text.trim()}
                  label={t("page.speakInput")}
                  stopLabel={t("page.stopSpeak")}
                  onClick={() =>
                    tts.speaking === "input"
                      ? tts.stop()
                      : void tts.speak(
                          "input",
                          text,
                          settings.defaultSourceLang,
                          settings.ttsVoiceName
                        )
                  }
                />
              )}
              <CopyButton value={text} label={t("page.copySource")} />
              <Tooltip title={t("page.clearAria")}>
                <IconButton size="small" onClick={clear} aria-label={t("page.clearAria")}>
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
              aria-label={t("page.targetLangAria")}
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
              onChange={(e) => workspace.set({ output: e.target.value })}
              placeholder={
                webgpuBackend
                  ? t("page.outputPlaceholderWebgpu")
                  : t("page.outputPlaceholderLlama")
              }
              slotProps={{ input: { "aria-label": t("page.outputTextAria") } }}
              size="small"
            />
          ) : (
            <Box className="flex-1 flex flex-col items-center justify-center gap-3 border border-dashed rounded-md p-6 text-center">
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {t("page.noModelShort")}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onOpenSettings("model")}
              >
                {t("page.chooseModel")}
              </Button>
            </Box>
          )}
          <Box className="flex items-center justify-between">
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {t("common.chars", { n: output.length.toLocaleString() })}
            </Typography>
            <Box className="flex items-center gap-1">
              {ttsAvailable && (
                <SpeakerButton
                  speaking={tts.speaking === "output"}
                  loading={tts.loading}
                  disabled={!output.trim()}
                  label={t("page.speakOutput")}
                  stopLabel={t("page.stopSpeak")}
                  onClick={() =>
                    tts.speaking === "output"
                      ? tts.stop()
                      : void tts.speak(
                          "output",
                          output,
                          settings.defaultTargetLang,
                          settings.ttsVoiceName
                        )
                  }
                />
              )}
              <CopyButton value={output} label={t("page.copyOutput")} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className="flex flex-wrap items-center gap-2">
        {translating ? (
          <Button
            variant="outlined"
            color="error"
            onClick={cancel}
            sx={{ fontSize: "1.25rem", px: 4, py: 1.25 }}
          >
            {t("common.cancel")}
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
            sx={{ fontSize: "1.25rem", px: 4, py: 1.25 }}
          >
            {t("page.translate")}
          </Button>
        )}
        {status && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {status}
          </Typography>
        )}
        {(translating || lastDuration > 0) && (
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {formatDuration(translating ? elapsed : lastDuration, 1)}
          </Typography>
        )}
      </Box>

      {error && (
        <Box className="flex flex-col gap-1">
          <Alert severity="error">{error}</Alert>
          {errorHint(error, webgpuBackend, t) && (
            <Typography variant="caption" sx={{ opacity: 0.7, pl: 1 }}>
              {errorHint(error, webgpuBackend, t)}
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
              ? t("page.footerWebgpu", { model: model.name })
              : t("page.footerLlama", {
                  model: settings.llamaServerConfig.model || t("common.autoDetect"),
                })}
          </Typography>
          {webgpuBackend ? (
            gpu.checking ? (
              <Chip label={t("chip.checking")} size="small" />
            ) : !gpu.secureContext ? (
              <Chip label={t("chip.notSecure")} color="warning" size="small" />
            ) : !gpu.supported ? (
              <Chip label={t("chip.unavailable")} color="error" size="small" />
            ) : cache !== null && !cache.cached ? (
              <Chip label={t("chip.notDownloaded")} color="warning" size="small" />
            ) : (
              <Chip label={t("chip.ready")} color="success" size="small" />
            )
          ) : (
            <Chip label={t("chip.llamaLocal")} size="small" />
          )}
        </Box>
      </Box>
      <Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HistoryIcon />}
          onClick={() => applyHistoryOpen(!historyOpen)}
          aria-expanded={historyOpen}
        >
          {t("history.button")}
        </Button>
      </Box>
      </Box>
    </Box>
  );
}

