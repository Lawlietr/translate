# TTS — on-demand read-aloud (TODO #23, P3)

Status: **blueprint, not implemented.** Decided 2026-09-26.

## Goal

Let the user hear the input and/or output text, **only when asked** (speaker icons), never automatically. Two local-first paths, one OS-dependent fallback — see Decision below.

## Decision (A + B shipped, C/D evaluation-only)

| Option | What | Status |
|---|---|---|
| **A** | Local Kokoro-82M ONNX via `kokoro-js` (transformers.js) — **English only** in mainline | ship |
| **B** | Web Speech API (`speechSynthesis`) — Chinese / zh-TW, opt-in, OS voices | ship |
| **C** | `uzen-zone/kokoro-js` fork (JS Mandarin phonemizer, v1.1-zh model) | optional evaluation |
| **D** | MeloTTS standalone ONNX pipeline (zh-mix-en, not in the transformers.js ecosystem) | optional evaluation |

Why A is English-only: Kokoro consumes **phoneme tokens**, not raw text. The mainline `kokoro-js` (Xenova) ships only an English espeak phonemizer — its npm voice list is American/British English only. The ONNX repos **do contain** zh voices (8: zf_xiaobei/xiaoni/xiaoxiao/xiaoyi, zm_yunjian/yunxi/yunxia/yunyang) and ja voices (5: jf_alpha/gongitsune/nezumi/tebukuro, jm_kumo), but without a JS phonemizer for those scripts the weights are unusable — feeding Chinese text produces garbage. (Owner verified live: the HF demo space speaks English only.) No JS Japanese phonemizer exists in either mainline or the fork.

Why B exists at all: our UI defaults to zh-TW and the most common **output** is Chinese — A cannot read it. Web Speech API gives OS-local voices (macOS zh-TW is acceptable quality) with zero download. Caveats to surface in the UI: cross-platform inconsistency; on some platforms (notably Android) `speechSynthesis` may route text over the network — label the mode "system voices (platform-dependent)" and never present it as local-guaranteed.

Why C is evaluation-only: real JS Mandarin phonemization (tone sandhi, normalization), but self-reported golden corpus 143/164 matches with 21 known gaps (JS `Intl.Segmenter` vs Python `jieba.posseg` segmentation, no POS in the browser path) — long-tail polyphones will mispronounce. Adds a third-party dependency maintained outside this repo. Re-evaluate if owner wants local Chinese read-aloud and accepts the gap.

Why D is evaluation-only: good zh-mix-en quality, but a fully separate ONNX pipeline (not transformers.js) — low reuse of the existing provider/catalog/cache architecture. Highest integration cost of the four.

## ZeroGPU — excluded (both meanings of the name)

- **HF Spaces ZeroGPU** (`huggingface.co/docs/hub/en/spaces-zerogpu`): a Spaces-host GPU allocation feature (Python + Gradio + `@spaces.GPU`). Not a callable inference API, not embeddable, daily GPU quotas (free = 5 min/day). Wrong layer.
- **github.com/zerogpu** (third-party company): hosted OpenAI-compatible **LLM** API (`api.zerogpu.ai`), SDK/CLI open-source. No TTS endpoint, and sending user text to a third-party cloud violates rule 10 (only user-initiated HF downloads + user's own llama-server endpoint are allowed) and the core "text never leaves the browser" promise. Also overlaps the llama-server/vLLM backend roles we already cover.

## Path A — Kokoro (local, English)

- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX` (Apache-2.0, compatible with AGPL). Newer than the base repo (v0.19); 19 en voices vs 11.
- **dtype/size (verify via HF tree API per rule 4 before hardcoding):** model.onnx fp32 326 MB · fp16 163 MB · **q8 92.4 MB** · q8f16 86 MB · q4f16 154 MB. Mainline npm example: `device: "webgpu"` recommends `fp32`; `kokoro-js` docs for the zh fork recommend fp32/fp16/q4f16 and discourage q8. **Pick after A/B in the owner's browser** (quality vs 4× size). Voice assets: one `.bin` per voice, 522 KB each — ship a **subset** (e.g. 2 en voices ≈ 1 MB), never all ~58.
- **Integration risks to verify first (before any code):**
  1. **transformers.js version conflict:** we pin `@huggingface/transformers` to **exactly 4.2.0** (rule 1). `kokoro-js` depends on its own transformers.js range — if it resolves a different 4.x, npm may duplicate the package (bundle bloat) or mix versions (runtime breakage). Check `kokoro-js`'s package.json range and test the combined build; the 25 MiB wasm check (rule 1) still applies — TTS adds no new wasm, but re-verify after bundling.
  2. `KokoroTTS.from_pretrained` with a **verified-complete cache only** (rule 2): reuse the Settings "Manage models" flow; the TTS block lists model + voice subset with `filePatterns` for exactly the chosen files.
- **Audio out:** Float32 PCM @ 24 kHz → `AudioContext` playback (standard). No WAV files written to disk.

## Path B — Web Speech API (system voices)

- `speechSynthesis` + `SpeechSynthesisUtterance`, voice selected from `getVoices()` filtered by target language (zh-TW > zh-Hant > zh-Hans fallback).
- Settings: opt-in toggle + voice picker (only when the mode is on). No model download, no cache entries.
- UI must state it is platform-dependent (quality + possible network use on some platforms).

## UI shape

- **Translation page:** a speaker icon in the input box (reads the input) and one in the output box (reads the output). Play → icon becomes stop; one utterance at a time (starting a new one cancels the current). Engine auto-selected by text language when only one engine covers it; explicit per-utterance override is NOT in v1.
- **Settings → Manage models:** new "Read-aloud (TTS)" block: Kokoro model row (size, download/cancel, clear cache) + voice picker (en subset); separate "System voices" toggle + picker for path B.
- **i18n:** all labels go through the future i18n layer (#7) — write strings as keys from day one.

## Privacy

- A: fully local (model from HF only on user-initiated download; inference in-browser). Rule 10 clean.
- B: OS-handled; disclosed as platform-dependent (possible network on some platforms). Opt-in only.
- Never auto-read; no audio ever leaves the browser.

## Out of scope (v1)

- Automatic read-aloud, streaming TTS, speed/pitch controls (A supports `speed` — may surface later), voice cloning, Japanese (no JS phonemizer anywhere), recording/export of audio.

## Definition of done

1. `kokoro-js` + pinned transformers.js 4.2.0 coexist in one build; `find out -name "*.wasm*" -exec du -h {} +` all < 25 MiB (rule 1).
2. TTS model + voice subset downloadable/cancellable from Settings; download bytes == HF tree API bytes (rule 4).
3. Speaker icons: EN text → Kokoro local audio; zh text → system voice (when B enabled); stop works; no auto-play.
4. Owner A/B in a real browser (3443 LAN path): EN quality at the chosen dtype, zh-TW system voice acceptable, zero console errors, no external requests in devtools (except the user-initiated download).
5. C/D remain evaluation notes only — no code.

## Rough effort

Design + HF size verification + browser spike (risks 1–2): 0.5–1 d · Implementation (catalog extension, provider, settings block, icons, audio): 1–2 d · Owner A/B: 0.5 d. **Total ≈ 2–3 d**, P3, sequenced after P1/P2 items.
