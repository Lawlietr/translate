import type { DownloadProgress } from "../types";
import {
  TRANSFORMERS_CACHE_NAME,
  remoteFileUrl,
  downloadModelFiles,
  type ModelFile,
} from "../model-cache";
import {
  KOKORO_MODEL_ID,
  KOKORO_DTYPES,
  kokoroVoicePath,
  type KokoroDtype,
} from "./kokoro";

const KOKORO_VOICE_SIZE = 522_240;

export function kokoroFilesToDownload(
  dtype: KokoroDtype,
  voice: string,
): ModelFile[] {
  const dtypeInfo = KOKORO_DTYPES.find((d) => d.id === dtype);
  if (!dtypeInfo) throw new Error(`Unknown Kokoro dtype: ${dtype}`);
  return [
    { path: dtypeInfo.file, size: dtypeInfo.sizeBytes },
    { path: kokoroVoicePath(voice), size: KOKORO_VOICE_SIZE },
  ];
}

export async function kokoroCacheState(
  dtype: KokoroDtype,
  voice: string,
): Promise<{ cached: boolean; bytes: number }> {
  if (typeof caches === "undefined") return { cached: false, bytes: 0 };
  const files = kokoroFilesToDownload(dtype, voice);
  const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
  let bytes = 0;
  let missing = 0;
  for (const f of files) {
    const resp = await cache.match(remoteFileUrl(KOKORO_MODEL_ID, f.path));
    if (!resp) {
      missing++;
      continue;
    }
    const len = Number(resp.headers.get("content-length") ?? 0);
    bytes += Number.isFinite(len) ? len : 0;
  }
  return { cached: missing === 0 && files.length > 0, bytes };
}

export interface KokoroDownloadCallbacks {
  onProgress: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

export async function prefetchKokoroModel(
  dtype: KokoroDtype,
  voice: string,
  { onProgress, signal }: KokoroDownloadCallbacks,
): Promise<void> {
  const files = kokoroFilesToDownload(dtype, voice);
  await downloadModelFiles(
    KOKORO_MODEL_ID,
    files,
    onProgress,
    signal ?? new AbortController().signal,
  );
}

export async function clearKokoroCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
  const requests = await cache.keys();
  for (const req of requests) {
    if (req.url.includes(KOKORO_MODEL_ID)) {
      await cache.delete(req);
    }
  }
}
