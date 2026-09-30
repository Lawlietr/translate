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

**The honest catch — the phonemizer, not the weights, is the gate.** Kokoro consumes **phoneme tokens**, not raw text. Mainline ships a **JS English phonemizer only** (espeak-ng wasm, as bundled by `kokoro-js`). The weights for the other 7 scripts exist, but there is **no mainline JS phonemizer** for them → feeding raw zh/ja text produces garbage. So in v1:

- **English output: works out of the box** (phonemizer available).
- **Non-English output: gated on a phonemizer.** Options: (a) the `uzen-zone/kokoro-js` fork ships a JS Mandarin phonemizer (self-reported golden corpus 143/164, 21 known polyphone gaps) — third-party, maintained outside this repo; (b) an espeak-ng-wasm build covering more scripts (research needed). **Resolving this is the #1 spike before committing Kokoro as the primary for non-English.**
- **Web Speech covers every language** regardless — the safety net that keeps the feature fully functional even where Kokoro's phonemizer doesn't reach.

## Why NOT `kokoro-js` (the version-conflict reason → Path A)

`kokoro-js@1.2.1` depends on `@huggingface/transformers@^3.5.1` → `onnxruntime-web@1.22.0-dev.20250409`. The app pins `@huggingface/transformers` to **exactly 4.2.0** (rule 1) → `onnxruntime-web@1.26.0-dev.20260416` (the **17.82 MiB** wasm that ships in `out/`). Importing `kokoro-js` would pull a **second, older transformers.js + a second onnxruntime-web** → two wasm files in `out/` (bundle bloat; both must stay < 25 MiB), dual-runtime init risk, and it violates the exact-pin rule.

**Path A sidesteps all of it:** run Kokoro's `model.onnx` directly on the app's **existing** ort (single runtime, single 17.82 MiB wasm, `out/` **unchanged**), with a small self-written loader for the flow-matching forward pass. **TTS adds zero new static assets to the deployment.**

## Engines

### Primary — Kokoro-82M v1.0 (Path A)

- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX` (Apache-2.0).
- **Files (verify via HF tree API per rule 4 before hardcoding):**
  - `onnx/model.onnx` — **fp32 310.5 MiB** (the file that ships to the client; the `onnx/` dir carries fp32/fp16/q8/q8f16/q4f16 variants summing to ~1.35 GiB — we only ever download **one** dtype). **Pick the dtype after the owner A/B's it in a real browser** (quality vs 4× size). **Size is a client-download / UX concern, NOT a CF 25 MiB concern** — the model is fetched to the Cache API at runtime, exactly like the 1.29 GiB Hy-MT2 translation model; it never enters `out/`.
  - `voices/` — one `.bin` per voice, ~522 KB each. Ship a **subset** (e.g. 2 voices per needed language ≈ a few MB), never all ~58.
- **Loader:** new `loadTtsPipeline()` in a `src/lib/tts/` module — `InferenceSession` on `model.onnx`, sharing the app's single ort WebGPU device (the existing `preferHighPerformanceGpu()` in `src/lib/providers/webgpu.ts` applies). **Not** `AutoModelForCausalLM` (that's for the causal translation LMs; Kokoro is flow-matching).
- **Pipeline:** text → phonemize (per-language; English out of the box) → embedding lookup → single flow-matching forward on `model.onnx` → Float32 PCM @ 24 kHz → `AudioContext` playback. No WAV written to disk.
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
- **Order:** (1) Web Speech first (zero download) → validate the read-aloud UX end-to-end; (2) Kokoro Path A spike → EN quality at the chosen dtype + speed, and confirm VRAM headroom with the translation model co-resident; (3) resolve the non-English phonemizer question (the gate for Kokoro as primary for zh/ja/...).
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
