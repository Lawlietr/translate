export interface TranslationLanguage {
  id: string;
  enName: string;
}

export const SUPPORTED_TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { id: "en", enName: "English" },
  { id: "zh-TW", enName: "Traditional Chinese" },
  { id: "zh-CN", enName: "Simplified Chinese" },
  { id: "ja", enName: "Japanese" },
  { id: "ko", enName: "Korean" },
  { id: "fr", enName: "French" },
  { id: "de", enName: "German" },
  { id: "es", enName: "Spanish" },
];

export function languageName(id: string): string {
  return SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.id === id)?.enName ?? id;
}
