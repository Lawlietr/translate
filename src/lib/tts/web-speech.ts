export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listLocalVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisAvailable()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const immediate = synth.getVoices().filter((v) => v.localService);
  if (immediate.length > 0) return Promise.resolve(immediate);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices().filter((v) => v.localService));
    };
    const onChange = () => finish();
    synth.addEventListener("voiceschanged", onChange);
    setTimeout(finish, timeoutMs);
  });
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace("_", "-");
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  preferredName: string
): SpeechSynthesisVoice | null {
  const local = voices.filter((v) => v.localService);
  if (preferredName) {
    const preferred = local.find((v) => v.name === preferredName);
    if (preferred) return preferred;
  }
  const norm = normalizeTag(lang);
  const exact = local.find((v) => normalizeTag(v.lang) === norm);
  if (exact) return exact;
  const prefix = local.find((v) => normalizeTag(v.lang).startsWith(norm));
  return prefix ?? local[0] ?? null;
}
