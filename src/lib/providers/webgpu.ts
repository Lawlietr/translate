import type { AIProvider, ProviderConfig, TranslationRequest, TranslationResponse } from "./types";
import { isWebGpuSupported } from "./webgpu-support";
import { DEFAULT_WEBGPU_MODEL, getModelInfo } from "../model-catalog";
import { cachedModelState } from "../model-cache";
import { buildMessages, resolveProfile, type ChatMessage } from "../prompt-profiles";
import { toTraditionalChinese } from "../zh-variant";

interface GpuRequestAdapterFn {
  (options?: { powerPreference?: "low-power" | "high-performance" }): Promise<unknown>;
}
let webGpuHighPerfPatched = false;
function preferHighPerformanceGpu() {
  if (webGpuHighPerfPatched) return;
  if (typeof navigator === "undefined") return;
  const gpu = (navigator as { gpu?: { requestAdapter?: GpuRequestAdapterFn } }).gpu;
  if (!gpu || typeof gpu.requestAdapter !== "function") return;
  const original = gpu.requestAdapter.bind(gpu);
  gpu.requestAdapter = (options) =>
    original({ powerPreference: "high-performance", ...options });
  webGpuHighPerfPatched = true;
}
preferHighPerformanceGpu();

type TransformersModule = typeof import("@huggingface/transformers");

interface CausalInputs {
  input_ids: { dims: readonly (number | null)[] };
  [key: string]: unknown;
}

interface CausalOutputs {
  dims: readonly (number | null)[];
  slice(...slices: (number | number[] | null)[]): CausalOutputs;
}

interface CausalTokenizer {
  apply_chat_template(
    messages: ChatMessage[],
    options: { add_generation_prompt: boolean; tokenize?: boolean }
  ): string;
  (input: string[]): Promise<CausalInputs>;
  decode(
    input: CausalOutputs | number[],
    options: { skip_special_tokens: boolean }
  ): string;
}

interface CausalModel {
  generate(
    options: Record<string, unknown> & {
      progress_callback?: (p: { status?: string; progress?: number; total?: number }) => void;
    }
  ): Promise<CausalOutputs>;
}

interface CausalPipeline {
  model: CausalModel;
  tokenizer: CausalTokenizer;
}

const MAX_NEW_TOKENS_CAP = 3072;

const pipelines = new Map<string, Promise<CausalPipeline>>();

let transformersPromise: Promise<TransformersModule> | null = null;

function loadTransformers(): Promise<TransformersModule> {
  transformersPromise ??= import("@huggingface/transformers");
  return transformersPromise;
}

async function loadPipeline(
  modelId: string,
  onStatus?: (status: string) => void
): Promise<CausalPipeline> {
  const existing = pipelines.get(modelId);
  if (existing) return existing;
  const promise = (async () => {
    onStatus?.("checking-cache");
    const status = await cachedModelState(modelId);
    if (!status.cached) {
      throw new Error(
        `Model ${modelId} is not fully downloaded — download it first (Settings → Manage models).`
      );
    }
    onStatus?.("loading-model");
    const { AutoModelForCausalLM, AutoTokenizer, env } = await loadTransformers();
    env.allowLocalModels = false;
    const info = getModelInfo(modelId);
    const device = (await isWebGpuSupported()) ? "webgpu" : "wasm";
    const [model, tokenizer] = await Promise.all([
      AutoModelForCausalLM.from_pretrained(modelId, {
        device,
        dtype: info?.dtype ?? "q4",
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === "progress" && p.file) {
            onStatus?.(`loading-model ${p.file} ${Math.round(p.progress ?? 0)}%`);
          }
        },
      }),
      AutoTokenizer.from_pretrained(modelId),
    ]);
    if (!model || !tokenizer) throw new Error("Failed to load model");
    return {
      model: model as unknown as CausalModel,
      tokenizer: tokenizer as unknown as CausalTokenizer,
    };
  })();
  pipelines.set(modelId, promise);
  promise.catch(() => pipelines.delete(modelId));
  return promise;
}

export async function warmUpWebGpuModel(
  modelId: string,
  onStatus?: (status: string) => void
): Promise<void> {
  await loadPipeline(modelId, onStatus);
}

function planMaxNewTokens(srcTokens: number): number {
  return Math.min(MAX_NEW_TOKENS_CAP, Math.ceil(srcTokens * 1.5) + 32);
}

function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      }
    );
  });
}

async function run(
  modelId: string,
  request: TranslationRequest,
  config: ProviderConfig
): Promise<TranslationResponse> {
  const started = Date.now();
  const pipeline = await loadPipeline(modelId, config.onStatus);
  const profile = resolveProfile(modelId, config.modelPreset);
  const messages = buildMessages(profile, request, config.systemPrompt);
  const chatPrompt = pipeline.tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    tokenize: false,
  });
  if (typeof chatPrompt !== "string" || chatPrompt.length === 0) {
    throw new Error("Chat template rendered an empty prompt");
  }
  config.onStatus?.("tokenizing");
  const inputs = await pipeline.tokenizer([chatPrompt]);
  const dims = inputs.input_ids.dims;
  const inputLength = dims[dims.length - 1] ?? 0;
  config.onStatus?.("generating");
  const outputs = await pipeline.model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: planMaxNewTokens(inputLength),
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (p.status === "generate" && typeof p.progress === "number") {
        config.onStatus?.(`generating · token ${Math.round(p.progress)}`);
      }
    },
  });
  const outDims = outputs.dims;
  const total = outDims[outDims.length - 1] ?? 0;
  const generated = outputs.slice(null, [inputLength, total]);
  const decoded = pipeline.tokenizer.decode(generated, { skip_special_tokens: true });
  if (typeof decoded !== "string" || decoded.trim().length === 0) {
    throw new Error("Model produced no output");
  }
  return {
    text: toTraditionalChinese(decoded.trim(), request.targetLang),
    latencyMs: Date.now() - started,
  };
}

export const webgpuProvider: AIProvider = {
  id: "webgpu",
  name: "WebGPU (in-browser)",
  enabled: true,
  configSchema: [],

  async translate(
    request: TranslationRequest,
    config: ProviderConfig,
    signal?: AbortSignal
  ): Promise<TranslationResponse> {
    const modelId = config.model ?? DEFAULT_WEBGPU_MODEL;
    return abortable(run(modelId, request, config), signal);
  },

  async testConnection(_config: ProviderConfig): Promise<boolean> {
    if (typeof window !== "undefined" && !window.isSecureContext) return false;
    return isWebGpuSupported();
  },
};
