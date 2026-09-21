# Model Catalog

Two tentative translation models. **Status: both verified 2026-09-21 via HF tree API (below)** — do not hardcode sizes from memory; re-verify against the HF tree API before implementation if the repo layout changes.

## Candidates

| Model ID | Notes |
|----------|-------|
| `onnx-community/translategemma-text-4b-it-ONNX` | Gemma-based 4B translation model. **ONNX files live in an `onnx/` SUBDIRECTORY of the repo** (the HF tree root shows `onnx/` as a directory). Consequences: (a) tree API query must be recursive, (b) `filePatterns` must match `onnx/...` paths, (c) Cache API keys include the subpath (`…/resolve/main/onnx/model.onnx`). |
| `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` | Hy-MT2 (1.8B) multilingual translation, q4f16, single `onnx/model_q4f16.onnx` (no external-data shards), transformers.js-native layout. ~1.29 GiB, fastest on modest GPUs. |

**Rejected: `justinchuby/Hy-MT2-1.8B-ONNX`** (Hy-MT2's apparent source repo, 22.5 GiB). Its layout is onnxruntime-genai-style — every `model*.onnx` lives under `Q4_GPTQ/cuda/`, `Q4_KQuant_tie/webgpu/`, `f16/default/`, … variant/backend subdirs with **no model files at the repo root**, which transformers.js's `from_pretrained` cannot resolve without custom file paths (would break the HF-tree-filter + cache-key + progress pipeline). The LunarOilRig mirror re-exports the model in standard transformers.js layout (`onnx/` subdir + root config/tokenizer), single-variant (no fp16-misresolution trap). Mirror provenance unverified (0 likes) — real-browser A/B required per webgpu-knowledge.md §5.

Both are text-only causal LMs: `AutoTokenizer` + `AutoModelForCausalLM`, greedy decoding, capped `max_new_tokens`, translation driven via each model's chat template.

Tentative default: **Hy-MT2-1.8B (`LunarOilRig/...-q4f16-mirror`)** (smallest, ~1.29 GiB). Owner may flip after testing — the catalog's `hidden` flag pattern (see what-do-you-see `model-catalog.ts`) makes show/hide a one-line change: keep the entry, toggle display.

## Decision: translategemma pinned to q4 (tentative, 2026-09-21)

- The onnx-community repo contains fp16, q4, q4f16, quantized variants (+ 14.8 GB of safetensors) = 48 GB total. **transformers.js with no `dtype` set resolves the highest-precision variant — that means fp16 ≈ 7.6 GiB of downloads** (`model_fp16.onnx` + 4 shards). That is why the repo "looks huge".
- **Decision (owner): tentatively use the q4 variant only.** Implementation consequences:
  - `filePatterns` must match exactly `onnx/model_q4.onnx`, `onnx/model_q4.onnx_data`, `onnx/model_q4.onnx_data_1` (plus JSON/tokenizer files) — never bare `model*.onnx*` globs that could catch fp16/q4f16.

  > Correction (2026-09-21, re-verified at #1 implementation): the per-file listing below matches
  > the live HF tree exactly, and its per-file sum is **3,111,911,523 bytes** — the 3,111,911,678
  > figure written earlier was an arithmetic error (off by 155 B). The catalog uses 3,111,911,523.
  - If using `from_pretrained` on the complete cache, pass `dtype: 'q4'` for determinism.
  - The download dialog's displayed bytes must equal the q4 set below (3,111,911,523 bytes ≈ 2.90 GiB), not the fp16 or repo total.
- **Fallback candidate: `m1cc0z/translategemma-4b-it-onnx-q4-webgpu`** (WebGPU repack, verified 2026-09-21). No fp16/fp32 in repo, so no accidental 7.6 GiB default; default resolution = q4f16 ≈ 3.3 GiB, `dtype: 'q4'` ≈ 3.5 GiB (both LARGER than onnx-community q4). Unknown provenance (no model card, low downloads) — only adopt if onnx-community q4 misbehaves on WebGPU in the real browser.

## Verification method (do this first)

For each model:

1. `GET https://huggingface.co/api/models/{id}/tree/main?recursive=true`
2. Identify the exact file set `from_pretrained` will resolve for a text causal LM: `config.json`, `tokenizer.json` (+ `tokenizer_config.json`, `special_tokens_map.json`, `chat_template.json` if present), and per submodel the `.onnx` / `.onnx_data(_N)?` shards for the dtypes the runtime actually loads (fp16/f32 encoder files if separate; for text LLMs usually a single model file set)
3. Sum `size` in bytes → that exact number goes into `sizeBytes` in `src/lib/model-catalog.ts`
4. Record the per-model `filePatterns` from the same listing (subpaths included)
5. Update the table below with verified bytes + file count, with the HF API date

## Verified sizes

| Model | Files | Total bytes | Verified (date, via HF tree API) |
|-------|-------|-------------|----------------------------------|
| `onnx-community/translategemma-text-4b-it-ONNX` (**q4 variant only**) | 7 files: `onnx/model_q4.onnx` (456,583) + `onnx/model_q4.onnx_data` (2,097,115,648) + `onnx/model_q4.onnx_data_1` (993,976,320) + `tokenizer.json` (20,323,013) + `tokenizer_config.json` (20,771) + `config.json` (2,206) + `chat_template.jinja` (16,982); no `special_tokens_map.json` in repo | **3,111,911,523 bytes ≈ 2.90 GiB** (per-file listing re-verified byte-for-byte 2026-09-21 at #1) | 2026-09-21, HF tree API |
| `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` (q4f16, only variant in repo) | 7 files: `onnx/model_q4f16.onnx` (1,373,443,906) + `tokenizer.json` (9,527,287) + `tokenizer_config.json` (166,491) + `config.json` (1,518) + `special_tokens_map.json` (488) + `generation_config.json` (221) + `chat_template.jinja` (654) | **1,383,140,565 bytes ≈ 1.29 GiB** | 2026-09-21, HF tree API |

Reference (not selected): `m1cc0z/translategemma-4b-it-onnx-q4-webgpu` — q4f16 set (default resolution) = 3,562,816,262 bytes ≈ 3.32 GiB; q4 set = 3,805,395,480 bytes ≈ 3.54 GiB. Verified 2026-09-21.

## Acceptance criteria (per model, real browser)

- Download dialog: correct size displayed, per-file progress, cancel works, partial re-download resumes/skips
- First load: completes, no silent 25 MiB file, no fp16 fallback errors
- Translation: 2–3 sentences in ≥2 language pairs each (e.g. en→zh-TW, zh-TW→en, en→ja), greedy output, sane `max_new_tokens`
- No output-language loops on the weaker model (see design/webgpu-knowledge.md §5)
