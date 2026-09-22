# WebGPU Knowledge Transfer

Distilled from the what-do-you-see project (same host), where every one of these was hit, fixed, and owner-verified in a production Cloudflare Pages deployment. Read this before writing any model-loading, download, or inference code.

## 1. Dependencies & Cloudflare Pages limits

- **Pin `@huggingface/transformers` to an EXACT version, no `^`.** The `^4.2.0 → 4.3.0` bump pulled `onnxruntime-web` 1.24.1, whose `ort-wasm-simd-threaded.async-*.wasm` is **25.6 MiB**. Cloudflare Pages rejects any single uploaded file ≥ 25 MiB (413 per file, upload silently skips it, and the site dies on first `ort.env.wasm.wasmPaths` fetch). Baseline known-good: **transformers.js 4.2.0** → wasm 17.82 MiB.
- Before any dependency upgrade or first deploy: `npm run build:export` then `du -sh out/_next/static/chunks/*.wasm*` — ALL files must be < 25 MiB. This check is also scripted into the deploy.
- The wasm files are referenced at runtime by `ort.env.wasm.wasmPaths` pointing at the bundled chunk names — a dependency bump renames them; the static export picks them up automatically, but the SIZE limit applies to each renamed file too.

## 2. Model downloads (Cache API) — the only supported path

- Models are **NEVER downloaded implicitly.** The only entry point is a user-initiated "Manage models" dialog (Settings). Show exact verified sizes + a cancel button.
- Pipeline (proven implementation shape):
  1. `GET https://huggingface.co/api/models/{modelId}/tree/main?recursive=true` → list files
  2. Filter by per-model `filePatterns` (regex) that match EXACTLY the files `from_pretrained` will resolve (submodel `.onnx` / `.onnx_data(_N)?` external-data shards + `*.json` / tokenizer files)
  3. Per file: `fetch` with `AbortController` + streamed `reader.read()` loop → progress (bytes / total) + speed (clamp display to 10 GB/s) → write to Cache API
  4. Cache name = `transformers-cache` (transformers.js default `env.cacheKey`), cache key = `https://huggingface.co/{modelId}/resolve/main/{path}` — **`path` includes any subdirectory** (critical: `translategemma-text-4b-it-ONNX` keeps its ONNX files under `onnx/`, so keys look like `…/resolve/main/onnx/model.onnx`)
  5. A `loading` phase follows: `from_pretrained` loads weights into WebGPU. **First run compiles shaders — can take minutes.** UI must show a spinner/phase label, not a stuck progress bar.
- `from_pretrained` (which would silently fetch missing files from HF) runs ONLY after `cachedModelState` verifies ALL required files are present. Incomplete cache ⇒ inference throws "download it from Settings first".
- `cachedModelState` = per-model list of required cache keys, all present (size check optional). Partial cache reported as "not downloaded"; re-download skips already-cached files (Cache API `match` first).
- transformers.js `from_pretrained` has **no AbortSignal** — that's why the download is done manually via fetch instead of letting `from_pretrained` prefetch.

### #3 port plan (decided 2026-09-21: PORT, do not rewrite — implemented as planned; final diff vs sister file = exactly the trims below)

`src/lib/model-cache.ts` = port of what-do-you-see's `src/lib/model-cache.ts` (262 lines → ~200). The catalog (#1) supplies the data-driven inputs with byte-verified `filePatterns`, so the proven implementation shapes above transfer 1:1:

| function | treatment |
|---|---|
| `remoteFileUrl` | 1:1 — key format IS the transformers.js `env.cacheKey` convention; `path` naturally carries subdirectories (translategemma's `onnx/…` works unchanged) |
| `listModelFiles` (tree API + regex filter) | 1:1 |
| `downloadModelFiles` (streamed reader, skip-if-cached, `put` with content-length, 10 GB/s speed clamp, per-file abort check) | 1:1 — this function IS the rule above in code |
| `cachedModelState` | 1:1 **minus the fallback branch** (cache-name heuristics) — dead code, both of our models have `filePatterns` |
| `clearWebGpuModelCache` / `formatBytes` / `formatDuration` | 1:1 (drop the IDB `clearModelCache()` call — trim 2) |

Trims vs the sister project:

1. **Drop `loadPrefetchedModel` / the `prefetchModel` loading phase** — the sister loads with `AutoModelForImageTextToText` + `AutoProcessor` (vision loader); translate needs `AutoModelForCausalLM` + `AutoTokenizer`, no processor. The download→`from_pretrained` loading phase belongs to #4 anyway (rule: `from_pretrained` only on a verified-complete cache).
2. **Do NOT port the sister's `download-manager.ts` (IndexedDB path) at all** — it serves their non-transformers.js storage route; translate is Cache-API-only (no `idb` dependency).
3. Define `DownloadProgress` in translate's own types (sister keeps it in `types.ts`).

Result: one file `src/lib/model-cache.ts`, ~200 lines, zero new dependencies.

## 3. Inference pitfalls

- **Secure context:** WebGPU needs `https://` or `localhost`. Local/LAN testing: serve Next on plain http + self-signed HTTPS reverse proxy on the LAN IP (see scripts/https-test-server.mjs pattern in what-do-you-see). `fuser -k <port>/tcp` to stop ports — `pkill -f <pattern>` matches its own command line and kills the caller.
- **Dev box ≠ user machine:** browser testing always happens over the LAN, so any local server must bind `0.0.0.0` (`npm run dev -H 0.0.0.0`, proxy on the LAN IP), never localhost-only.
- **Disk space:** the dev box filesystem has run >90% full (20 G total, ~1.8 G free as of 2026-09-21). `node_modules` ~1 GiB + `.next` per build are the big consumers; model bytes land in the browser's Cache API (user's machine), never the dev box. Check `df -h .` before builds; `rm -rf .next out` after verification.
- **`powerPreference`:** transformers.js 4.x calls `navigator.gpu.requestAdapter()` with NO options. On dual-GPU machines (Intel iGPU + NVIDIA dGPU) this silently selected the iGPU (observed 25 tok/s vs ~80 tok/s on the dGPU). Patch: monkey-patch `requestAdapter` to pass `{ powerPreference: 'high-performance' }` BEFORE the first model load.
- **Max tokens:** translation LLMs in-browser grind the full `max_new_tokens` budget when EOS comes late. Cap it (2048–3072). A 4B model at 3072 tokens ≈ several minutes on modest GPUs — show the user what they're waiting for.
- **Decoding:** greedy (`do_sample: false`). Deterministic output also makes A/B testing meaningful.
- **No cancellation in `generate` (transformers.js 4.2.0):** `model.generate` has no AbortSignal. Cancellation is cooperative — race the generate promise against an `AbortSignal` and reject early with `AbortError`; the background generation keeps running to completion but its result is discarded (webgpu.ts `abortable()`). Re-check this when transformers.js is ever upgraded.
- **Token budget sizing:** target-language text is usually 1.0–1.4× source token count for these models; size the budget from the source text length (e.g. `min(cap, ceil(srcTokens * 1.5) + 32)`), don't always burn the cap.
- **Chat template:** drive translation through `tokenizer.apply_chat_template` with each model's own template + a short system/user instruction. Do NOT hand-format prompts — template differences (BOS token, role markers) are where "works locally, loops in browser" bugs live.
- **`num_beams`:** transformers.js WebGPU support for beam search is limited; use greedy. If quality demands beams, that's a per-model catalog flag to test in a real browser first.

## 4. Minification-safe code

- **Never branch on `constructor.name`.** Production bundles minify class names (`Qwen2VLTextProcessor` → `ut`); detection branches silently never fire (a real production bug). Branch on the model-id string / repo prefix instead.
- Same principle for any `instanceof` across the React/worker boundary.

## 5. Language & prompt behavior of small LLMs

- Small models (≤2B) **lock into output-language loops** when instruction language and expected output language collide. Verified failure: a zh system-instruction line on LFM2.5-450M → endless `好的。` repetition. Verified fix: **English instructions + a short trailing line** like "Important: reply in Traditional Chinese… keep all JSON structure".
- Rule: keep ALL model-facing text in English; express the desired output language in one appended sentence. UI (human-facing) language is a separate concern and must never be injected into the instruction.
- **WebGPU fp16 failure modes are NOT reproducible on CPU.** A/B-test any prompt/template change in the real browser (secure context, real GPU). The what-do-you-see team burned two full attempts on CPU-only reasoning that failed in the browser.

## 6. UX for long operations

- Three distinct phases, each with its own UI state: (1) download (per-file progress, speed, cancel), (2) load/first-run (shaders + weight upload — spinner, "first run can take minutes"), (3) inference (token progress if cheap, otherwise an indeterminate spinner with elapsed time).
- Model selection in Settings must persist to localStorage and survive reload (a real bug: stale `defaultModel` fallback in a settings hook made a re-selected model "jump" to the default on reopen).
- Show the CURRENTLY active model name prominently on the translate page (users switch GPUs/machines; "why is this slow" is the #1 complaint without it).

## 7. Verification workflow (per change)

1. `npx tsc --noEmit` + production build (tsc only, LSP may be unavailable)
2. Self-hosted start on a local port + HTTPS proxy
3. Real browser: download (if new model), load, translate 2–3 sentences in ≥2 language pairs
4. Static export build + wasm size check + TEST deployment before owner acceptance
5. Owner verifies on the TEST site; production deploy only on explicit request
