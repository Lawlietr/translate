"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Link,
  Typography,
} from "@mui/material";
import { useI18n } from "../hooks/useI18n";
import { useWebGpu } from "../hooks/use-webgpu";
import { useThemeMode } from "../hooks/use-theme";
import {
  downloadModelFiles,
  formatBytes,
  formatDuration,
  listModelFiles,
  type ModelFile,
} from "../lib/model-cache";
import {
  DEFAULT_WEBGPU_MODEL,
  VISIBLE_WEBGPU_MODELS,
  getModelInfo,
} from "../lib/model-catalog";
import { warmUpWebGpuModel } from "../lib/providers/webgpu";

type Phase = "idle" | "downloading" | "warming" | "error";

interface ModelLandingProps {
  preselectModelId: string;
  onReady: () => void;
  onUseLlamaServer: () => void;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5, py: 2 }}>
      <Typography
        variant="caption"
        sx={{ letterSpacing: "0.15em", textTransform: "uppercase", color: "text.secondary" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

export function ModelLanding({
  preselectModelId,
  onReady,
  onUseLlamaServer,
}: ModelLandingProps) {
  const { t } = useI18n();
  const gpu = useWebGpu();
  const { mode } = useThemeMode();
  const [modelId, setModelId] = useState(() =>
    getModelInfo(preselectModelId) ? preselectModelId : DEFAULT_WEBGPU_MODEL
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [files, setFiles] = useState<ModelFile[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [speedBps, setSpeedBps] = useState(0);
  const [statusLine, setStatusLine] = useState("");
  const [error, setError] = useState("");
  const [errorFrom, setErrorFrom] = useState<"downloading" | "warming">("downloading");
  const abortRef = useRef<AbortController | null>(null);

  const model = getModelInfo(modelId);
  const gpuAvailable = gpu.supported && gpu.secureContext;

  const rows = useMemo(() => {
    let cum = 0;
    return files.map((f) => {
      const start = cum;
      cum += f.size;
      const end = cum;
      let state: "done" | "active" | "pending";
      let pct = 0;
      if (f.size === 0 || loaded >= end) {
        state = "done";
        pct = 1;
      } else if (loaded > start) {
        state = "active";
        pct = Math.min(1, (loaded - start) / f.size);
      } else {
        state = "pending";
      }
      return { path: f.path, state, pct };
    });
  }, [files, loaded]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startWarm = useCallback(async (signal?: AbortSignal) => {
    setPhase("warming");
    await warmUpWebGpuModel(modelId, (s) => setStatusLine(s));
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    onReady();
  }, [modelId, onReady]);

  const start = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    let stage: Phase = "downloading";
    setError("");
    setStatusLine("");
    setFiles([]);
    setLoaded(0);
    setTotal(0);
    setSpeedBps(0);
    setPhase("downloading");
    try {
      const info = getModelInfo(modelId);
      if (!info) throw new Error(`Unknown model ${modelId}`);
      const list = await listModelFiles(modelId, info.filePatterns, controller.signal);
      if (list.length === 0) throw new Error("No model files found in the repository");
      const sum = list.reduce((a, f) => a + f.size, 0);
      setFiles(list);
      setTotal(sum);
      await downloadModelFiles(
        modelId,
        list,
        (p) => {
          setLoaded(p.loaded);
          setTotal(p.total);
          setSpeedBps(p.speedBps);
        },
        controller.signal
      );
      stage = "warming";
      await startWarm(controller.signal);
    } catch (e) {
      if (isAbort(e)) {
        if (stage === "downloading") {
          setPhase("idle");
          setFiles([]);
          setLoaded(0);
          setTotal(0);
        }
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setErrorFrom(stage === "warming" ? "warming" : "downloading");
      setPhase("error");
    }
  }, [modelId, startWarm]);

  const retry = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    if (errorFrom === "warming") {
      try {
        await startWarm();
      } catch (e) {
        if (isAbort(e)) return;
        setError(e instanceof Error ? e.message : String(e));
        setErrorFrom("warming");
        setPhase("error");
      }
    } else {
      await start();
    }
  }, [errorFrom, start, startWarm]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!model) return null;

  const eta =
    phase === "downloading" && speedBps > 0 && loaded < total
      ? formatDuration((total - loaded) / speedBps)
      : "—";

  return (
    <Box className="h-screen flex flex-col items-center justify-center overflow-y-auto px-4 py-8">
      <Box className="w-full max-w-xl flex flex-col items-center gap-5 text-center">
        <Typography
          variant="body2"
          sx={{ letterSpacing: "0.25em", textTransform: "uppercase", color: "text.secondary" }}
        >
          {t("landing.tagline")}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "3.5rem", sm: "5rem" },
            fontWeight: 800,
            lineHeight: 1.05,
            backgroundImage:
              mode === "dark"
                ? "linear-gradient(90deg, #ff6b57, #ffd9a0, #7ed9a2)"
                : "linear-gradient(90deg, #d64530, #b97a1e, #1f8a55)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {t("landing.title")}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: "34rem" }}>
          {t("landing.subtitle")}
        </Typography>

        <Box className="grid grid-cols-3 gap-3 w-full mt-2">
          <InfoCard label={t("landing.cardModel")} value={model.name} />
          <InfoCard label={t("landing.cardSize")} value={formatBytes(model.sizeBytes)} />
          <InfoCard label={t("landing.cardPrivacy")} value={t("landing.privacyValue")} />
        </Box>

        <Box className="w-full mt-2 flex flex-col items-center gap-4">
          {phase === "idle" && (
            <>
              {!gpuAvailable && !gpu.checking && (
                <Alert severity="info" sx={{ width: "100%" }}>
                  {t("landing.webgpuUnavailable")}
                </Alert>
              )}
              <Button
                variant="contained"
                size="large"
                disabled={!gpuAvailable || gpu.checking}
                onClick={start}
                sx={{ px: 6, py: 1.5, textTransform: "none", fontWeight: 600 }}
              >
                {t("landing.download", { size: formatBytes(model.sizeBytes) })}
              </Button>
              <Box className="flex items-center gap-4">
                <Button
                  size="small"
                  onClick={onUseLlamaServer}
                  sx={{ textTransform: "none" }}
                >
                  {t("landing.useLlamaServer")}
                </Button>
                <Button
                  size="small"
                  onClick={() => setPickerOpen((o) => !o)}
                  sx={{ textTransform: "none" }}
                >
                  {t("landing.chooseModel")}
                </Button>
              </Box>
              {pickerOpen && (
                <Box
                  className="w-full"
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                >
                  {VISIBLE_WEBGPU_MODELS.map((m) => (
                    <Button
                      key={m.id}
                      fullWidth
                      onClick={() => {
                        setModelId(m.id);
                        setPickerOpen(false);
                      }}
                      sx={{
                        justifyContent: "space-between",
                        textTransform: "none",
                        borderRadius: 0,
                        "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "divider" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: m.id === modelId ? 600 : 400 }}>
                        {m.id === modelId ? "● " : ""}
                        {m.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {formatBytes(m.sizeBytes)}
                      </Typography>
                    </Button>
                  ))}
                </Box>
              )}
            </>
          )}

          {phase === "downloading" && (
            <>
              <Button variant="contained" size="large" disabled sx={{ px: 6, py: 1.5, textTransform: "none", fontWeight: 600 }}>
                {t("landing.downloading")}
              </Button>
              <Box className="w-full flex flex-col gap-2">
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", color: "text.secondary" }}
                >
                  {formatBytes(loaded)} / {formatBytes(total)} · {formatBytes(speedBps)}/s · {eta}
                </Typography>
                {rows.map((r) => (
                  <Box key={r.path} className="w-full">
                    <Box className="flex items-center justify-between gap-2">
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          color: r.state === "done" ? "text.disabled" : "text.primary",
                          overflowWrap: "anywhere",
                          textAlign: "left",
                        }}
                      >
                        {r.path}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "monospace", color: "text.secondary", flexShrink: 0 }}
                      >
                        {r.state === "done"
                          ? t("landing.done")
                          : r.state === "active"
                            ? `${Math.floor(r.pct * 100)}%`
                            : ""}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(r.pct * 100)}
                      sx={{ height: 3, borderRadius: 2, mt: 0.25, opacity: r.state === "pending" ? 0.25 : 1 }}
                    />
                  </Box>
                ))}
                <Button size="small" onClick={cancel} sx={{ textTransform: "none", alignSelf: "center" }}>
                  {t("common.cancel")}
                </Button>
              </Box>
            </>
          )}

          {phase === "warming" && (
            <Box className="w-full flex flex-col items-center gap-2">
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {t("landing.warming")}
              </Typography>
              {statusLine && (
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", color: "text.secondary", overflowWrap: "anywhere" }}
                >
                  {statusLine}
                </Typography>
              )}
              <LinearProgress variant="indeterminate" sx={{ width: "100%", height: 4, borderRadius: 2 }} />
            </Box>
          )}

          {phase === "error" && (
            <Box className="w-full flex flex-col items-center gap-3">
              <Alert severity="error" sx={{ width: "100%" }}>
                {error}
              </Alert>
              <Button variant="outlined" onClick={retry} sx={{ textTransform: "none" }}>
                {t("common.retry")}
              </Button>
            </Box>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {t("landing.footerWeights")}{" "}
          <Link
            href={`https://huggingface.co/${model.id}`}
            underline="hover"
            target="_blank"
            sx={{ fontSize: "inherit", fontFamily: "monospace" }}
          >
            {model.id}
          </Link>
          {" · "}
          {t("landing.footerBuiltWith")}
        </Typography>
      </Box>
    </Box>
  );
}
