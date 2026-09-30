import { playPcm } from "./audio";
import { KOKORO_SAMPLE_RATE, synthesizeKokoro, type TtsSession } from "./kokoro";

export interface TtsSynthesizeOptions {
  voice?: string;
  speed?: number;
}

export interface TtsPlayback {
  stop: () => void;
  ended: Promise<void>;
}

export interface TtsEngine {
  readonly id: string;
  readonly kind: "kokoro" | "web-speech";
  speak(text: string, opts?: TtsSynthesizeOptions): Promise<TtsPlayback>;
}

export interface KokoroEngineConfig {
  session: TtsSession;
  voiceFloats: Float32Array;
  phonemize: (text: string, language: string) => Promise<string[]>;
  speed?: number;
}

export function createKokoroEngine(config: KokoroEngineConfig): TtsEngine {
  let current: TtsPlayback | null = null;
  return {
    id: "kokoro",
    kind: "kokoro",
    async speak(text, opts) {
      current?.stop();
      const pcm = await synthesizeKokoro({
        session: config.session,
        voiceFloats: config.voiceFloats,
        text,
        speed: opts?.speed ?? config.speed,
        phonemize: config.phonemize,
      });
      current = playPcm(pcm, KOKORO_SAMPLE_RATE);
      return current;
    },
  };
}
