export interface TtsAudio {
  pcm: Float32Array;
  sampleRate: number;
}

export interface AudioPlayback {
  stop: () => void;
  ended: Promise<void>;
}

export function playPcm(pcm: Float32Array, sampleRate: number): AudioPlayback {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const buffer = ctx.createBuffer(1, Math.max(1, pcm.length), sampleRate);
  buffer.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  let resolveEnded: () => void;
  const ended = new Promise<void>((resolve) => {
    resolveEnded = resolve;
  });

  source.onended = () => {
    resolveEnded();
    void ctx.close().catch(() => {});
  };

  source.start();
  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        source.stop();
      } catch {
        // already stopped
      }
    },
    ended,
  };
}
