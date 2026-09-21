import { languageName } from "./languages";

export type PromptProfileId = "hy-mt2" | "translategemma" | "generic";

export type ModelPreset = "auto" | PromptProfileId;

export interface ChatTextPart {
  type: "text";
  source_lang_code: string;
  target_lang_code: string;
  text: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatTextPart[];
}

export interface TranslationPromptInput {
  text: string;
  sourceLang: string;
  targetLang: string;
}

const HY_MT2_PATTERN = /hy-mt2/i;
const TRANSLATEGEMMA_PATTERN = /translat(e)?gemma/i;

export function getPromptProfile(modelId: string): PromptProfileId {
  if (HY_MT2_PATTERN.test(modelId)) return "hy-mt2";
  if (TRANSLATEGEMMA_PATTERN.test(modelId)) return "translategemma";
  return "generic";
}

const GEMMA_LANG_CODE_MAP: Record<string, string> = {
  "zh-TW": "zh-Hant",
  "zh-CN": "zh-Hans",
};

function toGemmaLangCode(appCode: string): string {
  return GEMMA_LANG_CODE_MAP[appCode] ?? appCode;
}

export function buildMessages(
  profile: PromptProfileId,
  request: TranslationPromptInput
): ChatMessage[] {
  switch (profile) {
    case "hy-mt2":
      return [
        {
          role: "user",
          content:
            `Translate the following text into ${languageName(request.targetLang)}. ` +
            "Note that you should only output the translated result without any additional explanation:\n\n" +
            request.text,
        },
      ];
    case "translategemma":
      return [
        {
          role: "user",
          content: [
            {
              type: "text",
              source_lang_code: toGemmaLangCode(request.sourceLang),
              target_lang_code: toGemmaLangCode(request.targetLang),
              text: request.text,
            },
          ],
        },
      ];
    case "generic":
      return [
        {
          role: "user",
          content:
            `Translate the following text into ${languageName(request.targetLang)}. ` +
            "Reply with the translation only — no preamble, no commentary.\n\n" +
            request.text,
        },
      ];
  }
}

export function normalizeModelPreset(value: unknown): ModelPreset {
  return value === "hy-mt2" ||
    value === "translategemma" ||
    value === "generic" ||
    value === "auto"
    ? value
    : "auto";
}

export function resolveProfile(
  modelId: string,
  preset: ModelPreset | undefined
): PromptProfileId {
  return preset && preset !== "auto" ? preset : getPromptProfile(modelId);
}
