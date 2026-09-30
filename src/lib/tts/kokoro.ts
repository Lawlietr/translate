import { TRANSFORMERS_CACHE_NAME, remoteFileUrl } from "../model-cache";
import { phonemeArrayToTokenIds, KOKORO_PAD_ID } from "./vocab";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

export const KOKORO_SAMPLE_RATE = 24000;
export const KOKORO_STYLE_DIM = 256;
export const KOKORO_MAX_PHONEMES = 510;
export const KOKORO_DEFAULT_SPEED = 1.0;

export type KokoroDtype = "fp32" | "fp16" | "q4f16" | "q8f16";

export interface KokoroDtypeOption {
  id: KokoroDtype;
  file: string;
  sizeBytes: number;
}

// Sizes verified from the HF tree API (onnx-community/Kokoro-82M-v1.0-ONNX, 2026-09).
export const KOKORO_DTYPES: KokoroDtypeOption[] = [
  { id: "fp16", file: "onnx/model_fp16.onnx", sizeBytes: 163234740 },
  { id: "fp32", file: "onnx/model.onnx", sizeBytes: 325532232 },
  { id: "q4f16", file: "onnx/model_q4f16.onnx", sizeBytes: 154586422 },
  { id: "q8f16", file: "onnx/model_q8f16.onnx", sizeBytes: 86033585 },
];

export const KOKORO_DEFAULT_DTYPE: KokoroDtype = "fp16";

// Small EN voice subset (af_/am_/bf_/bm_ = American/British female/male),
// ~522 KB each. Never ship all ~58 voices.
export const KOKORO_VOICES: { id: string; label: string }[] = [
  { id: "af_bella", label: "af_bella (US F)" },
  { id: "am_adam", label: "am_adam (US M)" },
  { id: "bf_emma", label: "bf_emma (UK F)" },
  { id: "bm_george", label: "bm_george (UK M)" },
];

export const KOKORO_DEFAULT_VOICE = "af_bella";

export function kokoroModelPath(dtype: KokoroDtype): string {
  return KOKORO_DTYPES.find((d) => d.id === dtype)?.file ?? "onnx/model_fp16.onnx";
}

export function kokoroVoicePath(voice: string): string {
  return `voices/${voice}.bin`;
}

export interface TtsSession {
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array; dims: number[] }>>;
  release: () => Promise<void>;
}

async function readCachedArrayBuffer(modelId: string, path: string): Promise<ArrayBuffer> {
  const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
  const resp = await cache.match(remoteFileUrl(modelId, path));
  if (!resp) {
    throw new Error(
      `TTS file not downloaded: ${path} — download it in Settings first.`,
    );
  }
  return resp.arrayBuffer();
}

// The app shares a single onnxruntime-web instance with @huggingface/transformers
// (deduped to one copy). Loading transformers.js first guarantees its default
// wasmPaths (new URL(..., import.meta.url)) are set, so the shared ort finds the
// same 17.82 MiB wasm the translation model uses. No second wasm is ever emitted.
async function loadKokoroSessionImpl(
  modelArrayBuffer: ArrayBuffer,
  useWebGpu: boolean,
): Promise<TtsSession> {
  await import("@huggingface/transformers");
  const ort = (await import("onnxruntime-web")) as unknown as {
    InferenceSession: {
      create: (
        data: ArrayBuffer,
        options: { executionProviders?: string[] },
      ) => Promise<{
        run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array; dims: number[] }>>;
        release: () => Promise<void>;
      }>;
    };
    Tensor: new (
      type: string,
      data: number[] | Float32Array,
      dims: number[],
    ) => unknown;
  };

  const providers = useWebGpu ? ["webgpu"] : ["wasm"];
  const session = await ort.InferenceSession.create(modelArrayBuffer, {
    executionProviders: providers,
  });
  return session;
}

export function voiceFloatsFromBuffer(arrayBuffer: ArrayBuffer): Float32Array {
  return new Float32Array(arrayBuffer);
}

// style: row index = min(token count, row count - 1). A longer text picks a
// longer voice row (the voice file is N x 256; Kokoro indexes by token count).
function pickStyleRow(voiceFloats: Float32Array, tokenCount: number): Float32Array {
  const rows = Math.floor(voiceFloats.length / KOKORO_STYLE_DIM);
  if (rows === 0) {
    throw new Error(`Voice buffer too small: ${voiceFloats.length} floats.`);
  }
  const idx = Math.min(tokenCount, rows - 1);
  return voiceFloats.slice(idx * KOKORO_STYLE_DIM, (idx + 1) * KOKORO_STYLE_DIM);
}

export interface KokoroForwardArgs {
  session: TtsSession;
  tokenIds: number[];
  voiceFloats: Float32Array;
  speed: number;
}

export async function runKokoroForward({
  session,
  tokenIds,
  voiceFloats,
  speed,
}: KokoroForwardArgs): Promise<Float32Array> {
  const ort = (await import("onnxruntime-web")) as unknown as {
    Tensor: new (type: string, data: number[] | Float32Array, dims: number[]) => unknown;
  };

  const inputIds = [KOKORO_PAD_ID, ...tokenIds.slice(0, KOKORO_MAX_PHONEMES), KOKORO_PAD_ID];
  const style = pickStyleRow(voiceFloats, tokenIds.length);

  const feeds = {
    input_ids: new ort.Tensor("int64", inputIds, [1, inputIds.length]),
    style: new ort.Tensor("float32", style, [1, KOKORO_STYLE_DIM]),
    speed: new ort.Tensor("float32", [speed], [1]),
  };

  const out = await session.run(feeds);
  const firstKey = Object.keys(out)[0];
  const data = out[firstKey]?.data;
  if (!data) {
    throw new Error(`Kokoro forward returned no output (keys: ${Object.keys(out).join(", ")}).`);
  }
  return data;
}

export interface KokoroSynthesizeArgs {
  session: TtsSession;
  voiceFloats: Float32Array;
  text: string;
  speed?: number;
  phonemize: (text: string, language: string) => Promise<string[]>;
}

export async function synthesizeKokoro({
  session,
  voiceFloats,
  text,
  speed = KOKORO_DEFAULT_SPEED,
  phonemize,
}: KokoroSynthesizeArgs): Promise<Float32Array> {
  const phonemes = await phonemize(text, "en-us");
  const { ids, unknown } = phonemeArrayToTokenIds(phonemes);
  if (ids.length === 0) {
    throw new Error("Kokoro: no phonemes produced (empty input?).");
  }
  if (unknown > 0) {
    console.warn(`Kokoro: ${unknown} phonemes not in vocab (dropped).`);
  }
  return runKokoroForward({ session, tokenIds: ids, voiceFloats, speed });
}

export async function loadKokoroFromCache({
  dtype,
  voice,
  useWebGpu,
}: {
  dtype: KokoroDtype;
  voice: string;
  useWebGpu: boolean;
}): Promise<{ session: TtsSession; voiceFloats: Float32Array }> {
  const [modelAb, voiceAb] = await Promise.all([
    readCachedArrayBuffer(KOKORO_MODEL_ID, kokoroModelPath(dtype)),
    readCachedArrayBuffer(KOKORO_MODEL_ID, kokoroVoicePath(voice)),
  ]);
  const session = await loadKokoroSessionImpl(modelAb, useWebGpu);
  const voiceFloats = voiceFloatsFromBuffer(voiceAb);
  return { session, voiceFloats };
}
