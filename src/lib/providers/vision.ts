import type { DataType } from "@huggingface/transformers";
import { isWebGpuSupported } from "./webgpu-support";
import { getModelInfo, VISION_MODELS } from "../model-catalog";
import { cachedModelState } from "../model-cache";
import { compressImageForVision } from "../image-compress";
import { languageName } from "../languages";
import { toTraditionalChinese } from "../zh-variant";

type TransformersModule = typeof import("@huggingface/transformers");
type RawImageType = InstanceType<TransformersModule["RawImage"]>;

interface VlInputs {
  input_ids: { dims: readonly (number | null)[] };
  [key: string]: unknown;
}

interface VlOutputs {
  dims: readonly (number | null)[];
  slice(...slices: (number | number[] | null)[]): VlOutputs;
}

interface VlMessage {
  role: "system" | "user";
  content:
    | string
    | Array<{ type: "image" } | { type: "text"; text: string }>;
}

interface VlProcessor {
  (image: RawImageType, text: string, options: Record<string, unknown>): Promise<VlInputs>;
  apply_chat_template(
    messages: VlMessage[],
    options: { add_generation_prompt: boolean }
  ): string;
  batch_decode(
    input: VlOutputs,
    options: { skip_special_tokens: boolean }
  ): string[];
}

interface VlModel {
  generate(
    inputs: Record<string, unknown> & {
      progress_callback?: (p: { status?: string; progress?: number }) => void;
    }
  ): Promise<VlOutputs>;
}

interface VlPipeline {
  model: VlModel;
  processor: VlProcessor;
}

const MAX_NEW_TOKENS = 2048;

const pipelines = new Map<string, Promise<VlPipeline>>();
let transformersPromise: Promise<TransformersModule> | null = null;

function loadTransformers(): Promise<TransformersModule> {
  transformersPromise ??= import("@huggingface/transformers");
  return transformersPromise;
}

async function loadPipeline(
  modelId: string,
  onStatus?: (status: string) => void
): Promise<VlPipeline> {
  const existing = pipelines.get(modelId);
  if (existing) return existing;
  const promise = (async () => {
    onStatus?.("checking-cache");
    const status = await cachedModelState(modelId);
    if (!status.cached) {
      throw new Error(
        `Vision model ${modelId} is not fully downloaded — download it first (Settings → Model tab → Image translation).`
      );
    }
    onStatus?.("loading-vision-model");
    const { AutoModelForImageTextToText, AutoProcessor, env } =
      await loadTransformers();
    env.allowLocalModels = false;
    const info = getModelInfo(modelId);
    const device = (await isWebGpuSupported()) ? "webgpu" : "wasm";
    const [model, processor] = await Promise.all([
      AutoModelForImageTextToText.from_pretrained(modelId, {
        device,
        dtype: (info?.dtype ?? "q4") as DataType,
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === "progress" && p.file) {
            onStatus?.(`loading-vision-model ${p.file} ${Math.round(p.progress ?? 0)}%`);
          }
        },
      }),
      AutoProcessor.from_pretrained(modelId),
    ]);
    if (!model) throw new Error("Failed to load vision model");
    if (!processor) throw new Error("Failed to load vision processor");
    return {
      model: model as unknown as VlModel,
      processor: processor as unknown as VlProcessor,
    };
  })();
  pipelines.set(modelId, promise);
  promise.catch(() => pipelines.delete(modelId));
  return promise;
}

async function toRawImage(file: Blob): Promise<RawImageType> {
  const { RawImage } = await loadTransformers();
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await RawImage.fromCanvas(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildVisionMessages(targetLang: string): VlMessage[] {
  const targetName = languageName(targetLang);
  return [
    {
      role: "system",
      content:
        "You are a translation engine that reads text from images. " +
        "Transcribe visible text accurately, then translate it. " +
        "Respond with only the JSON object the user requests — no preamble, no commentary, no markdown fences.",
    },
    {
      role: "user",
      content: [
        { type: "image" },
        {
          type: "text",
          text:
            "Transcribe all visible text in the image in its original language, " +
            "preserving the original wording and line breaks. " +
            `Then translate the complete transcription into ${targetName}.\n\n` +
            "Respond with only this JSON object:\n" +
            `{"source_text": "<all visible text, verbatim, in the original language>", "translation": "<the complete translation into ${targetName}>"}`,
        },
      ],
    },
  ];
}

export interface ImageTranslationResult {
  sourceText: string;
  translation: string;
}

function parseVisionResult(raw: string): ImageTranslationResult | null {
  const trimmed = raw.trim();
  const candidates: string[] = [];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const braced = trimmed.match(/\{[\s\S]*\}/);
  if (braced) candidates.push(braced[0]);
  candidates.push(trimmed);
  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate) as Record<string, unknown>;
      if (obj && typeof obj === "object") {
        const source =
          typeof obj.source_text === "string"
            ? obj.source_text
            : typeof obj.text === "string"
              ? obj.text
              : "";
        const translation =
          typeof obj.translation === "string"
            ? obj.translation
            : typeof obj.translated === "string"
              ? obj.translated
              : "";
        if (source.trim() || translation.trim()) {
          return { sourceText: source.trim(), translation: translation.trim() };
        }
      }
    } catch {
      // not JSON — try the next candidate
    }
  }
  return null;
}

export interface ImageTranslationOptions {
  visionModelId: string;
  targetLang: string;
  onStatus?: (status: string) => void;
}

async function run(
  file: File,
  options: ImageTranslationOptions
): Promise<ImageTranslationResult> {
  const { visionModelId, targetLang, onStatus } = options;
  const pipeline = await loadPipeline(visionModelId, onStatus);
  onStatus?.("recognizing");
  const compressed = await compressImageForVision(file);
  const image = await toRawImage(compressed);
  const messages = buildVisionMessages(targetLang);
  const chatPrompt = pipeline.processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  if (typeof chatPrompt !== "string" || chatPrompt.length === 0) {
    throw new Error("Chat template rendered an empty prompt");
  }
  const inputs = await pipeline.processor(image, chatPrompt, {
    add_special_tokens: false,
  });
  onStatus?.("recognizing");
  const outputs = await pipeline.model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: MAX_NEW_TOKENS,
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (p.status === "generate" && typeof p.progress === "number") {
        onStatus?.(`recognizing · token ${Math.round(p.progress)}`);
      }
    },
  });
  const dims = inputs.input_ids.dims;
  const inputLength = dims[dims.length - 1] ?? 0;
  const outDims = outputs.dims;
  const total = outDims[outDims.length - 1] ?? 0;
  const generated = outputs.slice(null, [inputLength, total]);
  const decodedList = pipeline.processor.batch_decode(generated, {
    skip_special_tokens: true,
  });
  const decoded = decodedList[0] ?? "";
  if (typeof decoded !== "string" || decoded.trim().length === 0) {
    throw new Error("Vision model produced no output");
  }
  const result = parseVisionResult(decoded);
  if (!result) {
    throw new Error("vision-parse-failed");
  }
  return {
    sourceText: toTraditionalChinese(result.sourceText, targetLang),
    translation: toTraditionalChinese(result.translation, targetLang),
  };
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

export function isKnownVisionModel(modelId: string): boolean {
  return VISION_MODELS.some((m) => m.id === modelId);
}

export function translateImage(
  file: File,
  options: ImageTranslationOptions,
  signal?: AbortSignal
): Promise<ImageTranslationResult> {
  if (!isKnownVisionModel(options.visionModelId)) {
    return Promise.reject(new Error(`Unknown vision model: ${options.visionModelId}`));
  }
  return abortable(run(file, options), signal);
}
