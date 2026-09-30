"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isSpeechSynthesisAvailable,
  listLocalVoices,
  pickVoice,
} from "../lib/tts/web-speech";
import type { TtsEngine, TtsPlayback } from "../lib/tts/engine";
import { useAppSettings } from "./use-app-settings";

export type TtsTarget = "input" | "output";

export function useLocalVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!isSpeechSynthesisAvailable()) return;
    let active = true;
    void listLocalVoices().then((v) => {
      if (active) setVoices(v);
    });
    return () => {
      active = false;
    };
  }, []);
  return voices;
}

interface KokoroEngineCache {
  engine: TtsEngine;
  voice: string;
  dtype: string;
}

export function useTts() {
  const { settings } = useAppSettings();
  const [speaking, setSpeaking] = useState<TtsTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useKokoro = settings.ttsEngine === "kokoro";

  const kokoroCacheRef = useRef<KokoroEngineCache | null>(null);
  const kokoroLoadingRef = useRef<Promise<TtsEngine> | null>(null);
  const playbackRef = useRef<TtsPlayback | null>(null);

  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearStartTimer();
    clearResumeTimer();
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    if (isSpeechSynthesisAvailable()) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, [clearStartTimer, clearResumeTimer]);

  const loadKokoroEngine = useCallback(async (): Promise<TtsEngine> => {
    const cached = kokoroCacheRef.current;
    if (
      cached &&
      cached.voice === settings.ttsKokoroVoice &&
      cached.dtype === settings.ttsKokoroDtype
    ) {
      return cached.engine;
    }
    if (kokoroLoadingRef.current) return kokoroLoadingRef.current;

    kokoroLoadingRef.current = (async () => {
      const [
        { phonemize },
        { loadKokoroFromCache },
        { createKokoroEngine },
      ] = await Promise.all([
        import("phonemizer"),
        import("../lib/tts/kokoro"),
        import("../lib/tts/engine"),
      ]);

      const { session, voiceFloats } = await loadKokoroFromCache({
        dtype: settings.ttsKokoroDtype,
        voice: settings.ttsKokoroVoice,
        useWebGpu: true,
      });

      return createKokoroEngine({ session, voiceFloats, phonemize });
    })().finally(() => {
      kokoroLoadingRef.current = null;
    });

    const engine = await kokoroLoadingRef.current;
    kokoroCacheRef.current = {
      engine,
      voice: settings.ttsKokoroVoice,
      dtype: settings.ttsKokoroDtype,
    };
    return engine;
  }, [settings.ttsKokoroVoice, settings.ttsKokoroDtype]);

  const speakWebSpeech = useCallback(
    (target: TtsTarget, text: string, lang: string, preferredVoice?: string) => {
      if (!isSpeechSynthesisAvailable()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      clearStartTimer();
      clearResumeTimer();
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null;
        const voice = pickVoice(synth.getVoices(), lang, preferredVoice ?? "");
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = lang;
        }
        utterance.onend = () => {
          clearResumeTimer();
          setSpeaking(null);
        };
        utterance.onerror = () => {
          clearResumeTimer();
          setSpeaking(null);
        };
        setSpeaking(target);
        synth.speak(utterance);
        resumeTimerRef.current = setInterval(() => {
          if (synth.speaking && !synth.paused) synth.resume();
        }, 12000);
      }, 60);
    },
    [clearResumeTimer, clearStartTimer]
  );

  const speak = useCallback(
    async (
      target: TtsTarget,
      text: string,
      lang: string,
      preferredVoice?: string,
    ) => {
      if (!text.trim()) return;
      stop();
      setError(null);

      if (useKokoro) {
        setLoading(true);
        setSpeaking(target);
        try {
          const engine = await loadKokoroEngine();
          const playback = await engine.speak(text);
          playbackRef.current = playback;
          void playback.ended.then(() => {
            if (playbackRef.current === playback) {
              playbackRef.current = null;
              setSpeaking(null);
            }
          });
        } catch (e) {
          playbackRef.current = null;
          setSpeaking(null);
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          if (isSpeechSynthesisAvailable()) {
            speakWebSpeech(target, text, lang, preferredVoice);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      speakWebSpeech(target, text, lang, preferredVoice);
    },
    [stop, useKokoro, loadKokoroEngine, speakWebSpeech]
  );

  useEffect(
    () => () => {
      clearStartTimer();
      clearResumeTimer();
      if (playbackRef.current) playbackRef.current.stop();
      if (isSpeechSynthesisAvailable()) window.speechSynthesis.cancel();
    },
    [clearResumeTimer, clearStartTimer]
  );

  const available =
    settings.ttsEnabled && (useKokoro || isSpeechSynthesisAvailable());

  return { speaking, loading, error, speak, stop, available };
}
