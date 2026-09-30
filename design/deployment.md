# Deployment

Cloudflare Pages (one of the static hosts — GitHub Pages / HF Space / Docker / local Linux in design/local-deployment.md), static export only. No server-side routes in **any** build (D8).

## The 25 MiB per-file limit (non-negotiable)

Cloudflare Pages rejects any single uploaded file ≥ 25 MiB (413, upload fails per-file). transformers.js bundles onnxruntime wasm chunks — the known-good baseline is **transformers.js 4.2.0 → two wasm files in `out/_next/static/media/`: `ort-wasm-simd-threaded.asyncify.*.wasm` 22.48 MiB (23,567,050 B) + `ort-wasm-simd-threaded.jsep.*.wasm` 24.89 MiB** (both < 25 MiB; the jsep pair is pulled in by the WebGPU EP at session-creation time — see design/tts.md); the 4.3.0 bump ships a 25.6 MiB wasm and breaks the upload.

**Platform hard limit, not a bug (verified 2026-09):** the cap comes from Pages' underlying KV limits; paid plans do NOT raise it (CF community + docs). All other hosts are unaffected — HF Space serves the wasm through the xet CDN (22.48 MiB verified), GH Pages / Docker / local have no such cap.

Mandatory pre-deploy check (scripted into the deploy):

```bash
npm run build:export
du -sh out/_next/static/chunks/*.wasm*   # every file must be < 25 MiB
```

And `package.json` pins `@huggingface/transformers` to an exact version (no `^`) — see AGENTS.md rule 1.

### If a future transformers.js bump exceeds the cap (options, simple → complex)

1. **Stay on 4.2.0** (current policy) — zero cost; only revisit if 4.3+ ships a critical fix we need.
2. **R2 + Pages Functions** (CF-native): put the > 25 MiB file in an R2 bucket (no per-object cap), serve it through a Pages Function proxy; the app's wasm fetch base URL points at the function. Official tutorial: developers.cloudflare.com/pages/tutorials/use-r2-as-static-asset-storage-for-pages/.
3. **Dedicated Worker** (512 MB cap): serve the big file from a Worker, app fetches from the Worker URL.
4. **Accept CF Pages lags**: keep CF Pages on the last working transformers.js while the other four hosts move forward. Ugly; last resort.

Decision 2026-09 (owner): stay on 4.2.0 for now; if the upgrade ever becomes necessary, option 2 is the preferred path.

## Build modes

- `npm run build:export` — static export (fixed in `next.config.ts`, D8), output in `/out` — **the only production build**. The full-build mode (`build`/`start` scripts, `NEXT_STATIC_EXPORT` toggle) was removed in TODO #26 (2026-09-26)

## Deploy script pattern (from what-do-you-see `scripts/deploy-pages.mjs`)

- **No credentials in the repo.** wrangler reads `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from the environment; the script refuses to run if either is missing and never prints their values. No `wrangler login`.
- One command: build static export → verify `/out` (incl. wasm size check) → create project if missing → `wrangler pages deploy out --project-name <name> --branch main` → ensure custom domain.
- **`--branch main` is required**: without it, deploying from a non-`main` local branch (e.g. `DEV`) creates a PREVIEW deployment that the custom domain never serves.
- **Wrangler 4.x `--force` flag**: `wrangler pages project create` in 4.x delegates to Cloudflare Workers (OpenNext) by default, which breaks static-export apps. Pass `--force` to use the legacy static Pages directly. Only needed on first create; subsequent `deploy` commands work without it. The flag must NOT be passed to `pages deploy`.
- **Capturing wrangler stderr for idempotency checks (bug found 2026-09-30):** `spawnSync(…, { stdio: "inherit" })` makes `createResult.stderr` **`null`**, so an `stderr.includes("already exists")` guard always fails and the script exits before deploying when the project already exists. Use `stdio: ["inherit", "inherit", "pipe"]` (stdin/stdout passthrough, stderr captured) for any spawnSync result you inspect. `scripts/deploy-pages.mjs` was fixed this way (commit `a4da154`).
- Custom-domain step (only if the domain sits in a zone proxied through Cloudflare): `POST /accounts/{acct}/pages/projects/{project}/domains` with body `{"name": "<domain>"}` (field is `name`, NOT `domain`); delete with `DELETE …/domains/{domain-name}` (the NAME, not the UUID). CNAME points at the owning project's `*.pages.dev` alias; TLS auto-issued (Google CA, 5–30 min); all steps idempotent.
- **CNAME is a separate one-time step**: after adding the domain to the Pages project, a CNAME DNS record must exist in the zone pointing `<subdomain>` → `<project>.<suffix>.pages.dev`. Create via `POST /zones/{zone_id}/dns_records` with `{"type":"CNAME","name":"<subdomain>","content":"<pages-alias>","ttl":1}`. The Pages domain status stays `pending` until the CNAME is detected + TLS cert is issued.
- If a local `next start` is running, restart it after the deploy (the script prints a warning).

## Two-project policy (owner decision, carried over)

- TEST project and PRODUCTION project are SEPARATE (a Pages deployment updates every domain on its project, so routine deploys can never touch production).
- **Default runs deploy to TEST only. Production only on explicit owner request (`--prod`).**
- Production custom domain: `translate.avpclub.eu.org` (zone `avpclub.eu.org`, CNAME → `translate-4j9.pages.dev`).

## GitHub Pages (implemented 2026-09-29)

- Repo must be **public** (private repos need a paid plan for Pages).
- Enable via API: `POST /repos/{owner}/{repo}/pages` with `{"build_type":"workflow"}` — one-time; subsequent deploys go through the Actions workflow.
- Workflow (`.github/workflows/pages.yml`): `NEXT_BASE_PATH=/translate` → `npm run build:export` → wasm check → `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`.
- `basePath` is env-driven in `next.config.ts` (`process.env.NEXT_BASE_PATH || ""`) — empty for Docker/CF/local, `/translate` for GH Pages only.
- URL: `https://lawlietr.github.io/translate/`.

## HF Space (implemented 2026-09-29)

- **Live:** `https://huggingface.co/spaces/lawlietr/translate` (host `lawlietr-translate.static.hf.space`) — public Static Space, free, no hardware.
- Deploy: `hf` CLI (v2.0.0, official install script; `hf update` to upgrade) → `hf repos create lawlietr/translate --type space --space-sdk static --public --exist-ok` → `npm run build:export` → drop a `README.md` with frontmatter into `out/` → `hf upload lawlietr/translate out/. --repo-type space`.
- **README frontmatter rules:** `sdk: static` + `app_file: index.html`; do NOT set `app_build_command` (files are pre-built; a build command would fail on the Space). The root 302 → `/index.html` is the static SDK's normal `app_file` redirect. Big files (wasm) serve through the HF xet CDN (302 → signed CDN URL) — expected.
- **CLI notes (2.0.0):** commands differ from older docs — `hf spaces info` (not `status`), `hf spaces list <id>` (files; `-R` recursive), `hf spaces wait` (block until running), `hf repos create` (not `hf spaces create`). `hf upload` defaults to *model* repos — `--repo-type space` is mandatory.
- **HF Space deploy pitfalls (verified 2026-09-30):**
  - **`hf upload` can misleadingly report “0 uploaded / 0 committed”** when the content already matches — that is a *success*, not a no-op failure. Verify with an independent hash check (clone the repo and `md5sum` a file against local `out/`), never by trusting the summary line alone.
  - **The `resolve` endpoint is CDN-cached** — right after a deploy, `https://huggingface.co/spaces/…/resolve/main/index.html` can serve the previous version for a while. A stale fetch does NOT mean the deploy failed.
  - **Raw `git push` to a Space repo fails in two ways** (use the `hf` CLI, which handles both): (a) the Space requires a `README.md` (pre-receive hook rejects a commit that deletes it); (b) files > 10 MiB (our two wasm) must go through **git-lfs** — the repo's `.gitattributes` already tracks `*.wasm` via LFS, and the `hf` CLI uploads LFS objects natively, but a manual clone+push needs `git lfs install --local` first (and the dev box needed `apt-get install git-lfs`).
  - Deploy order that works: `npm run build:export` → `hf upload lawlietr/translate out/ --repo-type space` (README.md stays in the repo root, untouched) → verify by clone+hash.
- Models download from `huggingface.co` — **same-origin** on the Space, no CORS issues.
- CI/CD (optional, not built yet): a workflow with `HF_TOKEN` secret running the same build+upload on `main` push. **`HF_TOKEN` is already in the GitHub repo secrets** (2026-09-29; fine-grained **CI/CD preset** — HF's 2026-07 token UI replaced manual per-permission checkboxes with presets: Read-Only / Inference / Write / CI/CD / Full Access; the CI/CD preset covers repo read+write+create, which is exactly what `hf upload` needs; can be narrowed to the single Space repo via the token's Edit permissions).

## Git

- Remotes: `origin` = `ssh://fg/lawliet/translate.git` (Forgejo 192.168.1.124:222, SSH alias `fg`); `codeberg` = `ssh://git@codeberg.org/Lawlietr/translate.git`; `github` = `git@github.com:Lawlietr/translate.git` (**public** as of 2026-09-29). Carried-over policy: every commit pushed to ALL configured remotes, whichever branch (routine work on `DEV`).
- Builds: Forgejo runner `root@192.168.1.12` (token in that machine's `~/.zshrc`, never in this repo) — docker images now; Windows exe needs a Windows build host (D5, design/ci-build.md). Never build/package on the dev machine (AGENTS rule 11).
