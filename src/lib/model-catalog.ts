import type { DataType } from "@huggingface/transformers";

export interface ModelInfo {
  id: string;
  name: string;
  format: "ONNX";
  sizeBytes: number;
  source: string;
}

export interface WebGpuModelInfo extends ModelInfo {
  dtype: DataType | Record<string, DataType>;
  filePatterns: string[];
  hidden?: boolean;
}

const HY_MT2_FILE_PATTERNS = [
  "^onnx/model_q4f16\\.onnx(_data(_\\d+)?)?$",
  "^config\\.json$",
  "^tokenizer\\.json$",
  "^tokenizer_config\\.json$",
  "^special_tokens_map\\.json$",
  "^generation_config\\.json$",
  "^chat_template\\.jinja$",
];

const TRANSLATEGEMMA_FILE_PATTERNS = [
  "^onnx/model_q4\\.onnx(_data(_\\d+)?)?$",
  "^config\\.json$",
  "^tokenizer\\.json$",
  "^tokenizer_config\\.json$",
  "^chat_template\\.jinja$",
];

const LFM2_5_VL_DTYPES: Record<string, DataType> = {
  vision_encoder: "fp16",
  embed_tokens: "fp16",
  decoder_model_merged: "q4",
};

const LFM2_5_VL_FILE_PATTERNS = [
  "^onnx/embed_tokens_fp16\\.onnx(_data(_\\d+)?)?$",
  "^onnx/vision_encoder_fp16\\.onnx(_data(_\\d+)?)?$",
  "^onnx/decoder_model_merged_q4\\.onnx(_data(_\\d+)?)?$",
  "\\.json$",
  "\\.jinja$",
];

export const VISION_MODELS: WebGpuModelInfo[] = [
  {
    id: "LiquidAI/LFM2.5-VL-450M-ONNX",
    name: "LFM2.5-VL-450M (fp16 encoder + Q4 decoder)",
    format: "ONNX",
    sizeBytes: 808_759_577,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: LFM2_5_VL_DTYPES,
    filePatterns: LFM2_5_VL_FILE_PATTERNS,
  },
  {
    id: "LiquidAI/LFM2.5-VL-3B-ONNX",
    name: "LFM2.5-VL-3B (fp16 encoder + Q4 decoder)",
    format: "ONNX",
    sizeBytes: 3_999_475_483,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: LFM2_5_VL_DTYPES,
    filePatterns: LFM2_5_VL_FILE_PATTERNS,
  },
];

export const VISIBLE_VISION_MODELS = VISION_MODELS.filter((m) => !m.hidden);

export const DEFAULT_VISION_MODEL = "LiquidAI/LFM2.5-VL-450M-ONNX";

export const WEBGPU_MODELS: WebGpuModelInfo[] = [
  {
    id: "LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror",
    name: "Hy-MT2-1.8B (Q4F16)",
    format: "ONNX",
    sizeBytes: 1_383_140_565,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: "q4f16",
    filePatterns: HY_MT2_FILE_PATTERNS,
  },
  {
    id: "onnx-community/translategemma-text-4b-it-ONNX",
    name: "TranslateGemma 4B (Q4)",
    format: "ONNX",
    sizeBytes: 3_111_911_523,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: "q4",
    filePatterns: TRANSLATEGEMMA_FILE_PATTERNS,
  },
];

export const VISIBLE_WEBGPU_MODELS = WEBGPU_MODELS.filter((m) => !m.hidden);

export const DEFAULT_WEBGPU_MODEL = "LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror";

export function getModelInfo(modelId: string): WebGpuModelInfo | undefined {
  return WEBGPU_MODELS.find((m) => m.id === modelId) ?? VISION_MODELS.find((m) => m.id === modelId);
}
