import type { DownloadProgress } from "./types";
import { getModelInfo } from "./model-catalog";

export const TRANSFORMERS_CACHE_NAME = "transformers-cache";

export interface CacheStatus {
  cached: boolean;
  bytes: number;
}

export interface ModelFile {
  path: string;
  size: number;
}

function isModelUrl(url: string, modelId: string): boolean {
  const lower = url.toLowerCase();
  const plain = modelId.toLowerCase();
  const encoded = modelId.replaceAll("/", "%2f");
  return lower.includes(plain) || lower.includes(encoded.toLowerCase());
}

export function remoteFileUrl(modelId: string, filename: string): string {
  return `https://huggingface.co/${modelId}/resolve/main/${filename}`;
}

export async function cachedModelState(modelId: string): Promise<CacheStatus> {
  if (typeof caches === "undefined") return { cached: false, bytes: 0 };
  const info = getModelInfo(modelId);
  if (!info?.filePatterns) return { cached: false, bytes: 0 };
  const files = await listModelFiles(modelId, info.filePatterns);
  const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
  let bytes = 0;
  let missing = 0;
  for (const f of files) {
    const resp = await cache.match(remoteFileUrl(modelId, f.path));
    if (!resp) {
      missing++;
      continue;
    }
    const length = Number(resp.headers.get("content-length") ?? 0);
    bytes += Number.isFinite(length) ? length : 0;
  }
  return { cached: missing === 0 && files.length > 0, bytes };
}

export async function clearWebGpuModelCache(modelId?: string): Promise<void> {
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      for (const req of requests) {
        if (!req.url.includes("huggingface.co")) continue;
        if (!modelId || isModelUrl(req.url, modelId)) {
          await cache.delete(req);
        }
      }
    }
  }
}

export async function listModelFiles(
  modelId: string,
  patterns: string[],
  signal?: AbortSignal
): Promise<ModelFile[]> {
  const res = await fetch(
    `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
    { signal }
  );
  if (!res.ok) {
    throw new Error(`Failed to list model files: ${res.status} ${res.statusText}`);
  }
  const regexes = patterns.map((p) => new RegExp(p));
  const entries = (await res.json()) as { type: string; path: string; size?: number }[];
  return entries
    .filter((e) => e.type === "file")
    .map((e) => ({ path: e.path, size: e.size ?? 0 }))
    .filter((f) => regexes.some((re) => re.test(f.path)));
}

interface SpeedTracker {
  report(loaded: number, total: number): void;
}

function makeSpeedTracker(
  onProgress: (progress: DownloadProgress) => void
): SpeedTracker {
  let lastTime = 0;
  let lastLoaded = 0;
  let lastReport = 0;

  return {
    report(loaded: number, total: number) {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (loaded < lastLoaded + 262144 && now - lastReport < 250) {
        if (loaded < total) return;
      }
      const dt = lastTime > 0 ? (now - lastTime) / 1000 : 0;
      const raw = dt > 0.05 ? (loaded - lastLoaded) / dt : 0;
      const speedBps = raw > 0 && Number.isFinite(raw) && raw < 10 * 1024 * 1024 * 1024 ? raw : 0;
      lastTime = now;
      lastLoaded = loaded;
      lastReport = now;
      onProgress({
        loaded,
        total,
        percent: total > 0 ? Math.min(1, loaded / total) : 0,
        speedBps,
      });
    },
  };
}

export async function downloadModelFiles(
  modelId: string,
  files: ModelFile[],
  onProgress: (progress: DownloadProgress) => void,
  signal: AbortSignal
): Promise<void> {
  const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
  const total = files.reduce((a, f) => a + f.size, 0);
  let doneBytes = 0;
  const tracker = makeSpeedTracker(onProgress);

  for (const file of files) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const url = remoteFileUrl(modelId, file.path);
    const existing = await cache.match(url);
    if (existing) {
      doneBytes += file.size;
      tracker.report(doneBytes, total);
      continue;
    }
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(
        `Failed to download ${file.path}: ${res.status} ${res.statusText}`
      );
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let fileBytes = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        fileBytes += value.byteLength;
        tracker.report(doneBytes + fileBytes, total);
      }
    } else {
      const buf = new Uint8Array(await res.arrayBuffer());
      chunks.push(buf);
      fileBytes = buf.byteLength;
    }
    const body = new Uint8Array(fileBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    doneBytes += fileBytes;
    const headers = new Headers({
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-length": String(fileBytes),
    });
    await cache.put(url, new Response(body, { headers }));
    tracker.report(doneBytes, total);
  }
  tracker.report(doneBytes, total);
}

export interface PrefetchCallbacks {
  onProgress: (progress: DownloadProgress) => void;
  onPhase?: (phase: "downloading" | "loading") => void;
  signal?: AbortSignal;
}

export async function prefetchModel(
  modelId: string,
  { onProgress, onPhase, signal }: PrefetchCallbacks
): Promise<void> {
  const info = getModelInfo(modelId);
  const patterns = info?.filePatterns ?? [];
  if (patterns.length === 0) {
    throw new Error(`No file list defined for model ${modelId}`);
  }
  const files = await listModelFiles(modelId, patterns, signal);
  if (files.length === 0) {
    throw new Error("No model files found in the repository");
  }
  onPhase?.("downloading");
  await downloadModelFiles(
    modelId,
    files,
    onProgress,
    signal ?? new AbortController().signal
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds: number, decimals = 0): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return decimals > 0 ? `${seconds.toFixed(decimals)}s` : `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
