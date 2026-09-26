"use client";

import { useCallback } from "react";
import {
  getMessages,
  interpolate,
  normalizeLanguage,
  type Language,
  type Messages,
} from "../lib/i18n/translations";
import { useAppSettings } from "./use-app-settings";

export function useI18n() {
  const { settings, update } = useAppSettings();
  const lang = normalizeLanguage(settings.language);
  const t = useCallback(
    (key: keyof Messages, vars?: Record<string, string | number>): string =>
      interpolate(getMessages(lang)[key], vars),
    [lang]
  );
  const setLanguage = useCallback(
    (language: Language) => {
      update({ language });
    },
    [update]
  );
  return { t, lang, setLanguage };
}
