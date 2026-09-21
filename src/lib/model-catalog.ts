import type { DataType } from "@huggingface/transformers";

export interface ModelInfo {
  id: string;
  name: string;
  format: "ONNX";
  sizeBytes: number;
  source: string;
}

export interface WebGpuModelInfo extends ModelInfo {
  dtype: Record<string, DataType>;
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

export const WEBGPU_MODELS: WebGpuModelInfo[] = [
  {
    id: "LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror",
    name: "Hy-MT2-1.8B (Q4F16)",
    format: "ONNX",
    sizeBytes: 1_383_140_565,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: { text: "q4f16" },
    filePatterns: HY_MT2_FILE_PATTERNS,
  },
  {
    id: "onnx-community/translategemma-text-4b-it-ONNX",
    name: "TranslateGemma 4B (Q4)",
    format: "ONNX",
    sizeBytes: 3_111_911_523,
    source: "huggingface.co (Hugging Face CDN)",
    dtype: { text: "q4" },
    filePatterns: TRANSLATEGEMMA_FILE_PATTERNS,
  },
];

export const VISIBLE_WEBGPU_MODELS = WEBGPU_MODELS.filter((m) => !m.hidden);

export const DEFAULT_WEBGPU_MODEL = "LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror";

export function getModelInfo(modelId: string): WebGpuModelInfo | undefined {
  return WEBGPU_MODELS.find((m) => m.id === modelId);
}
