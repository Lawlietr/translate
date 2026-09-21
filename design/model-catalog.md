# Model Catalog

Two tentative translation models. **Status: sizes NOT yet verified** — verifying them (and the exact file lists) is the first implementation task; do not hardcode sizes from memory or from this file.

## Candidates

| Model ID | Notes |
|----------|-------|
| `onnx-community/translategemma-text-4b-it-ONNX` | Gemma-based 4B translation model. **ONNX files live in an `onnx/` SUBDIRECTORY of the repo** (the HF tree root shows `onnx/` as a directory). Consequences: (a) tree API query must be recursive, (b) `filePatterns` must match `onnx/...` paths, (c) Cache API keys include the subpath (`…/resolve/main/onnx/model.onnx`). |
| `justinchuby/Hy-MT2-1.8B-ONNX` | Hy-MT2 (Qwen3-1.7B-based) multilingual translation, ~1.8B. Expected smaller download, faster on modest GPUs. |

Both are text-only causal LMs: `AutoTokenizer` + `AutoModelForCausalLM`, greedy decoding, capped `max_new_tokens`, translation driven via each model's chat template.

Tentative default: **Hy-MT2-1.8B** (smallest). Owner may flip after testing — the catalog's `hidden` flag pattern (see what-do-you-see `model-catalog.ts`) makes show/hide a one-line change: keep the entry, toggle display.

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
| `onnx-community/translategemma-text-4b-it-ONNX` | TBD | TBD | — |
| `justinchuby/Hy-MT2-1.8B-ONNX` | TBD | TBD | — |

## Acceptance criteria (per model, real browser)

- Download dialog: correct size displayed, per-file progress, cancel works, partial re-download resumes/skips
- First load: completes, no silent 25 MiB file, no fp16 fallback errors
- Translation: 2–3 sentences in ≥2 language pairs each (e.g. en→zh-TW, zh-TW→en, en→ja), greedy output, sane `max_new_tokens`
- No output-language loops on the weaker model (see design/webgpu-knowledge.md §5)
