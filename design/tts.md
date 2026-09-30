# TTS — on-demand read-aloud (TODO #23, P0)

Status: **blueprint, not implemented.** Decision **revised 2026-09-29** (owner): dual-track with **Kokoro-82M v1.0 as primary** and **Web Speech API as test-bench + fallback**; **test on the local dev environment only (no cloud deployment)**; **all work on the DEV branch**.

## Goal

Let the user hear the input and/or output text, **only when asked** (speaker icons), never automatically. Local-first.

## Decision (revised 2026-09-29)

Two engines, user-initiated, never automatic:

| Engine | Role | Notes |
|---|---|---|
| **Kokoro-82M v1.0** | **PRIMARY** | Single ONNX model, 8-language weights, non-autoregressive. Run via **Path A** (the app's existing `transformers.js` 4.2.0 + `onnxruntime-web`, self-written flow-matching pipeline) — **NOT** `kokoro-js`. |
| **Web Speech API** | **Test-bench + FALLBACK** | OS voices, zero download. Built **first** to validate the read-aloud UX; then the runtime fallback for languages Kokoro can't phonemize / before the user has downloaded Kokoro. |

**Testing scope: local dev environment only** — dev server (`npm run dev -- -H 0.0.0.0 -p 3001`) + HTTPS proxy 3443 for the secure context, **and** the production static export (`build:export` → serve `/out` locally) for UI-flow verification (per `design/browser-testing.md`). **No CF / GH / HF / Docker deployment for this work.** All changes committed to the **DEV** branch.

## Why Kokoro is primary (and why it's no longer "English-only at the weights level")

`onnx-community/Kokoro-82M-v1.0-ONNX` (Apache-2.0, AGPL-compatible) is a **single `model.onnx`** whose weights cover **8 languages: en ja zh es fr hi it pt** — not per-language models, not a multi-stage pipeline. It is **non-autoregressive** (flow matching) → **one forward pass per utterance**, far cheaper on CPU than an autoregressive codec LM. That is what makes it the right primary engine for an in-browser TTS.

**The honest catch — the phonemizer, not the weights, is the gate.** Kokoro consumes **phoneme tokens**, not raw text. Mainline ships a **JS English phonemizer only** (the `phonemizer` npm package — an eSpeak NG **worker** pair, `espeakng.worker.js` 1.42 MB + `espeakng.worker.data` 870 KB, **no standalone `.wasm`**; `SUPPORTED_LANGUAGES` in its source is hardcoded to `["en"]`, so non-English `phonemize()` calls **throw at the packaging layer**, not the eSpeak NG layer). The weights for the other 7 scripts exist, but there is **no mainline JS phonemizer** for them → feeding raw zh/ja text produces garbage. So in v1:

- **English output: works out of the box** (phonemizer available).
- **Non-English output: gated on a phonemizer.** Options: (a) the `uzen-zone/kokoro-js` fork ships a JS Mandarin phonemizer (self-reported golden corpus 143/164, 21 known polyphone gaps) — third-party, maintained outside this repo; (b) an espeak-ng-wasm build covering more scripts (research needed). **Resolving this is the #1 spike before committing Kokoro as the primary for non-English.**
- **Web Speech covers every language** regardless — the safety net that keeps the feature fully functional even where Kokoro's phonemizer doesn't reach.

## Why NOT `kokoro-js` (the version-conflict reason → Path A)

`kokoro-js@1.2.1` depends on `@huggingface/transformers@^3.5.1` → `onnxruntime-web@1.22.0-dev.20250409`. The app pins `@huggingface/transformers` to **exactly 4.2.0** (rule 1) → `onnxruntime-web@1.26.0-dev.20260416` (the **17.82 MiB** wasm that ships in `out/`). Importing `kokoro-js` would pull a **second, older transformers.js + a second onnxruntime-web** → two wasm files in `out/` (bundle bloat; both must stay < 25 MiB), dual-runtime init risk, and it violates the exact-pin rule.

**Path A sidesteps all of it:** run Kokoro's `model.onnx` directly on the app's **existing** ort (single runtime, single 17.82 MiB wasm, `out/` **unchanged**), with a small self-written loader for the flow-matching forward pass. **TTS adds zero new static assets to the deployment.**

**Verified 2026-09-30 (#0.1):** the `phonemizer` npm package (v1.2.1, `xenova/phonemizer.js`) has **zero dependencies** (`dependencies` / `peerDependencies` / `optionalDependencies` all `undefined` in the npm registry) — a self-contained eSpeak NG worker wrapper, completely independent of `transformers.js`. Importing `phonemizer` directly pulls in **no second transformers.js, no second onnxruntime-web, no second wasm**. The only new static assets in `out/` are the worker pair (~2.3 MB total, well under the 25 MiB cap). API: `phonemize(text, language = "en-us") → string[]` (IPA), `list_voices(language?) → voice list`. **Build-integration risk (to verify in #0.3 spike):** Next.js static export must correctly bundle and serve the worker + its `.data` companion file at a same-origin path — a build-layer concern distinct from the language-layer concern above.

## Engines

### Primary — Kokoro-82M v1.0 (Path A)

- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX` (Apache-2.0).
- **Files (verify via HF tree API per rule 4 before hardcoding):**
  - `onnx/model.onnx` — **fp32 310.5 MiB** (the file that ships to the client; the `onnx/` dir carries fp32/fp16/q8/q8f16/q4f16 variants summing to ~1.35 GiB — we only ever download **one** dtype). **Pick the dtype after the owner A/B's it in a real browser** (quality vs 4× size). **Size is a client-download / UX concern, NOT a CF 25 MiB concern** — the model is fetched to the Cache API at runtime, exactly like the 1.29 GiB Hy-MT2 translation model; it never enters `out/`.
  - `voices/` — one `.bin` per voice, ~522 KB each. Ship a **subset** (e.g. 2 voices per needed language ≈ a few MB), never all ~58.
- **Loader:** new `loadTtsPipeline()` in a `src/lib/tts/` module — `InferenceSession` on `model.onnx`, sharing the app's single ort WebGPU device (the existing `preferHighPerformanceGpu()` in `src/lib/providers/webgpu.ts` applies). **Not** `AutoModelForCausalLM` (that's for the causal translation LMs; Kokoro is flow-matching).
- **Pipeline:** text → phonemize (per-language; English out of the box) → map IPA to token IDs → single flow-matching forward on `model.onnx` → Float32 PCM @ 24 kHz → `AudioContext` playback. No WAV written to disk.

  **ONNX Signature (verified #0.2, 2026-09-30):**

  | Tensor | Shape | Type | Notes |
  |--------|-------|------|-------|
  | `input_ids` | `(1, ≤512)` | int64/int32 | Phoneme token IDs from the 115-entry vocab (`tokenizer.json`). Padded with `0` (`$` = pad/unk) on both ends; actual phonemes ≤ 510. |
  | `style` | `(1, 256)` | float32 | Voice style vector. Each voice `.bin` is a `float32` array reshaped to `(N, 1, 256)` where N = number of length-bucketed vectors; index by `len(phoneme_tokens)` → pick the row matching the utterance length. |
  | `speed` | `(1,)` | float32 | Speed multiplier. `1.0` = normal. Expose as a user setting later. |
  | **output** | `(1, N)` | float32 | Raw PCM waveform @ **24 kHz**. N = sample count (proportional to utterance length × speed). Feed directly to `AudioContext`. |

  **Key constants** (from `config.json` + `tokenizer_config.json`):
  - `model_type`: `"style_text_to_speech_2"`
  - `model_max_length`: 512
  - `pad_token`: `"$"` (ID 0)
  - Phoneme vocab: **115 entries** (IPA phones + punctuation + prosody symbols `ˈ ˌ ː ʰ ʲ` + tone arrows `↓ → ↗ ↘`), full mapping in `tokenizer.json`.

  **Voice `.bin` structure:** each file is a flat `float32` array of size `N × 256` (N varies per voice, typically ~512 length buckets × 256-dim). In JS: `new Float32Array(buffer).reshape([N, 1, 256])` (or manual slice), then `style = rows[len(phonemeTokens)]`.

  **Forward pass is a single `InferenceSession.run()`** — no autoregressive loop, no KV-cache, no multi-stage pipeline. Significantly simpler than the `CausalLM` pipeline used by the translation models.

  **Local feasibility spike (verified #0.3, 2026-09-30, CPU/wasm):** the full pipeline was run end-to-end in an isolated `/tmp` dir (NOT the app's `node_modules` — `onnxruntime-web@1.26.0-dev.20260416-b7804b056c`, the app's exact version, **wasm/CPU EP**). Results:
  - `phonemize("Life is like a box of chocolates...")` → **71 tokens, 0 unknown** (344 ms in Node; the eSpeak NG worker runs fine headless).
  - Model load (fp32 310.5 MiB) → session in **~1.4 s**; `inputNames = ['input_ids','style','speed']`, `outputNames = ['waveform']` — **matches the #0.2 signature exactly**.
  - Single forward → **216 000 samples = 9.000 s @ 24 kHz**, amplitude min -0.73 / max 1.01, **84.1% non-zero**, RMS shows a clear speech rhythm (peaks 50 / dips 2.9 / tail 0.0) → **real speech, not noise or zeros**.
  - CPU/wasm latency: **~11.1 s** for the 9 s utterance (≈1.2× slower than realtime on this dev CPU).

  **WebGPU browser spike (verified #0.3, 2026-09-30, owner's real browser):** the same 71-token sequence was run on **WebGPU EP** (Apple Metal 3 adapter) via a standalone spike page (`/tmp/tts-spike-browser/`, served over HTTPS on port 3443). `onnxruntime-web` bundle `ort.all.bundle.min.mjs` (839 KB) + `ort-wasm-simd-threaded.jsep.mjs` (46 KB) + `ort-wasm-simd-threaded.jsep.wasm` (26.1 MiB) — the WebGPU EP dynamically imports the **JSEP** loader+wasm pair (not the plain `ort-wasm-simd-threaded.wasm`). Results:
  - Session creation on WebGPU: **success** (no op-coverage fallback needed for this model's op set).
  - Forward pass: **success**, produced a real-speech waveform.
  - Audio playback: **correct** — af_bella voice, recognizable English speech, not noise.
  - WebGPU latency: owner confirmed faster than the CPU 1.2× baseline (exact realtime factor not captured in the log; the spike page displays it in the stats card).

  **WebGPU serving pitfall:** the WebGPU EP in `ort.all.bundle.min.mjs` does a **dynamic `import()` of `ort-wasm-simd-threaded.jsep.mjs`** at session-creation time. If that file (or the companion `.jsep.wasm`) is not served at `wasmPaths`, the EP throws `no available backend found` even though the adapter is present. Both files must be co-located and served with correct MIME types (`text/javascript` / `application/wasm`).

  **Integration pitfalls found in the spike (do NOT re-derive):**
  1. **`input_ids` must be int64** — the model rejects int32 (`expected: tensor(int64)`), and onnxruntime does **not** auto-cast int32→int64. In the wasm sandbox the `Int64Array` global is shadowed (`Int64Array is not defined`), so construct the tensor from a plain **`number[]`** and let `ort.Tensor('int64', arr, shape)` do the cast: `new ort.Tensor('int64', [0, ...ids, 0], [1, len])`.
  2. **Read the voice `.bin` out of Node's shared Buffer pool** with `new Float32Array(new Uint8Array(buf).buffer)` — `new Float32Array(buf.buffer, buf.byteOffset, …)` gives `Invalid typed array length` because Node Buffers share a 5 MB pool. (Browser `fetch` → `ArrayBuffer` has no pool, so this is Node-only; the browser path can use `new Float32Array(arrayBuffer)` directly.)
  3. **Voice `.bin` = 510 rows × 256** for `af_bella` (130 560 floats). Pick `style = rows[len(phonemeTokens)]` (clamped to the last row). Style shape `(1, 256)`, speed shape `(1,)` = `[1.0]`.
  4. **The `phonemizer` web worker keeps a Node process alive / can throw an uncaught error** after `phonemize()` resolves — in a headless spike, run the model test in a **separate script** (or `process.exit(0)` at the end). In the browser this is a non-issue.

  **Boundary:** the spike proves the **full pipeline** (phonemize → tokenize → int64/style/speed → single forward → PCM → `AudioContext` playback) is correct on the app's exact runtime, on **both** the CPU/wasm EP (dev box) and the **WebGPU EP** (owner's real browser, Apple Metal 3). What remains for **Path A integration**: VRAM co-residency with the translation model (Hy-MT2 1.29 GiB + Kokoro ≈0.3 GiB ≈ 1.6 GiB), the phonemizer worker bundling under Next.js static export, and the Settings download flow.
- **Coexistence with the translation model (no one-model-at-a-time limit):** `src/lib/providers/webgpu.ts` already keeps loaded models in a `Map<string, Promise<Pipeline>>` keyed by model id — **multiple models co-resident by design**. Kokoro is a separate entry; both share the single wasm. **The real constraint is VRAM:** Hy-MT2 (1.29 GiB) + Kokoro (≈0.3 GiB) ≈ **1.6 GiB** resident — fine on 4 GiB+ discrete GPUs, watch low-end / iGPU. Kokoro's footprint is just its weights (no growing KV-cache; it's non-autoregressive).
- **Download:** reuse the Settings "Manage models" flow (rules 2/3): the TTS block lists model + voice subset with `filePatterns` for exactly the chosen files; streamed + cancellable; verified-complete cache gate before inference.

### Fallback / test-bench — Web Speech API

- `speechSynthesis` + `SpeechSynthesisUtterance`; voice from `getVoices()` filtered by target language (zh-TW > zh-Hant > zh-Hans).
- **Privacy gate (rule 10):** list **only local voices** — filter `SpeechSynthesisVoice.localService === true`. Online neural voices (notably Chrome's Google voices) send text to a cloud → would violate rule 10. Label the mode "system voices (platform-dependent)"; never present as local-guaranteed.
- Opt-in toggle + voice picker in Settings. No model download, no cache entries.
- Role: (1) the **first thing built** (zero download → validate the read-aloud UX: icon placement, audio playback, language switch, progress states) before the Kokoro pipeline is ready; (2) the **runtime fallback** for languages Kokoro can't phonemize, or before the user has downloaded Kokoro.

## Excluded (with reason)

- **Qwen3-TTS-12Hz-0.6B** (every ONNX port: `onnx-community` + `elbruno` / `romara-labs` / `tonythethompson`): the "0.6B" is **only** the `talker` LLM (~550 MiB at int4). The full pipeline is **~1.5 GiB at int4 minimum** (int4 is the floor — no int8; codec encoder+decoder ~652 MiB + talker ~550 MiB + text_embed ~194 MiB + code_predictor ~87 MiB + vocoder ~437 MiB + ...). It is a **13-stage autoregressive** pipeline (needs a custom multi-ONNX JS pipeline, not `transformers.js`'s `from_pretrained`), CPU-slow (autoregressive → ~5–20 s per sentence), and **5× the size of Kokoro** for no browser benefit. **Rejected.** (The GGUF-only port `dsh0416/...-QTS` would force a llama.cpp backend — out of scope for in-browser TTS.)
- **MeloTTS** (VITS): per-language ~162 MiB models, no mature in-browser pipeline, dominated by Kokoro on quality + integration cost. **Rejected.**
- **ZeroGPU** (both the HF Spaces GPU feature and the `zerogpu.com` hosted API): wrong layer / sends text to a third-party cloud → violates rule 10. (Unchanged from the prior blueprint.)

## Architecture / integration points (for the later implementation)

- New module(s) under `src/lib/tts/` (pure logic, no React — per the file-org rules): an `engine` interface + a `kokoro` impl (Path A pipeline) + a `web-speech` impl.
- Engine selection: **Kokoro primary** when (a) the user has downloaded the Kokoro model AND (b) a phonemizer is available for the target language; else **Web Speech** (when enabled). Never auto-play.
- Speaker icons: one in the input box (reads the input), one in the output box (reads the output). Play → stop; one utterance at a time (starting a new one cancels the current).
- Settings → Manage models: a new "Read-aloud (TTS)" block (Kokoro model row + voice-subset picker) + a "System voices" toggle + picker.
- i18n: all labels as keys from day one (the future i18n layer, #7).

## Privacy

- Kokoro: fully local (HF download only on user-initiated; inference in-browser). Rule 10 clean.
- Web Speech: **local voices only** (`localService === true` filter); disclosed as platform-dependent. Opt-in.
- Never auto-read; no audio ever leaves the browser.

## Testing plan (local only — no cloud)

- **Platform:** local dev server (`npm run dev -- -H 0.0.0.0 -p 3001`) + HTTPS proxy 3443 for the secure context, **and** the production static export (`build:export` → serve `/out` locally) for UI-flow verification — per `design/browser-testing.md`. **No CF / GH / HF / Docker deploy.**
- **Order:** (1) Web Speech first (zero download) → validate the read-aloud UX end-to-end; (2) Kokoro Path A spike → **CPU/wasm + WebGPU browser spikes both DONE (#0.3, 2026-09-30: full pipeline on CPU/wasm EP AND WebGPU EP (Apple Metal 3), 9.0 s real-speech PCM, correct audio playback)** — remaining: VRAM co-residency with the translation model + Next.js worker bundling + Settings download flow (Path A integration); (3) resolve the non-English phonemizer question (the gate for Kokoro as primary for zh/ja/...).
- **Acceptance (owner, real browser via the local HTTPS path):** EN read-aloud quality at the chosen dtype, acceptable speed (non-autoregressive → near-realtime expected), zh-TW system voice acceptable, translation model + Kokoro co-resident without VRAM OOM, zero console errors, no external requests in devtools except the user-initiated download.

## Definition of done

1. Path A loader runs Kokoro `model.onnx` on the app's existing ort; `find out -name "*.wasm*" -exec du -h {} +` **unchanged** (single 17.82 MiB wasm, < 25 MiB) — rule 1.
2. Kokoro model + voice subset downloadable/cancellable from Settings; download bytes == HF tree API bytes — rule 4.
3. Speaker icons: EN → Kokoro local audio; non-EN (no phonemizer yet) → Web Speech; stop works; no auto-play.
4. Web Speech lists **local voices only** (`localService === true`); opt-in.
5. Owner A/B in a real browser via the local HTTPS path: quality + speed + co-resident VRAM + zero external requests.
6. **No cloud deployment** of any TTS change; all work committed to the **DEV** branch.

## Rough effort

Design + HF size verification: **done (this doc).** Web Speech impl (UX + local-voice filter): ~0.5–1 d. Kokoro Path A spike + loader + pipeline (EN first): 1–1.5 d. Non-English phonemizer resolution (the gate): 0.5–2 d (depends on espeak-ng-wasm coverage vs the fork). Owner A/B: 0.5 d. **Total ≈ 3–5 d, P0, local-dev testing.**
