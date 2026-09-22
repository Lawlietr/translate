import { Converter } from "opencc-js/cn2t";

let converter: ((text: string) => string) | null = null;

function s2t(): (text: string) => string {
  converter ??= Converter({ from: "cn", to: "tw" });
  return converter;
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;

export function toTraditionalChinese(text: string, targetLang: string): string {
  if (targetLang !== "zh-TW") return text;
  if (!CJK_RE.test(text)) return text;
  return s2t()(text);
}
