"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isSpeechSynthesisAvailable,
  listLocalVoices,
  pickVoice,
} from "../lib/tts/web-speech";

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

export function useTts() {
  const [speaking, setSpeaking] = useState<TtsTarget | null>(null);
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
    if (isSpeechSynthesisAvailable()) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, [clearStartTimer, clearResumeTimer]);

  const speak = useCallback(
    (target: TtsTarget, text: string, lang: string, preferredVoice: string) => {
      if (!isSpeechSynthesisAvailable() || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      clearStartTimer();
      clearResumeTimer();
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null;
        const voice = pickVoice(synth.getVoices(), lang, preferredVoice);
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

  useEffect(
    () => () => {
      clearStartTimer();
      clearResumeTimer();
      if (isSpeechSynthesisAvailable()) window.speechSynthesis.cancel();
    },
    [clearResumeTimer, clearStartTimer]
  );

  return { speaking, speak, stop };
}
