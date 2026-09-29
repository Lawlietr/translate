# Deployment

Cloudflare Pages (one of the static hosts — GitHub Pages / HF Space / Docker / local Linux in design/local-deployment.md), static export only. No server-side routes in **any** build (D8).

## The 25 MiB per-file limit (non-negotiable)

Cloudflare Pages rejects any single uploaded file ≥ 25 MiB (413, upload fails per-file). transformers.js bundles onnxruntime wasm chunks — the known-good baseline is **transformers.js 4.2.0 → `ort-wasm-simd-threaded.jsep-ft.wasm` 17.82 MiB**; the 4.3.0 bump ships a 25.6 MiB wasm and breaks the upload.

Mandatory pre-deploy check (scripted into the deploy):

```bash
npm run build:export
du -sh out/_next/static/chunks/*.wasm*   # every file must be < 25 MiB
```

And `package.json` pins `@huggingface/transformers` to an exact version (no `^`) — see AGENTS.md rule 1.

## Build modes

- `npm run build:export` — static export (fixed in `next.config.ts`, D8), output in `/out` — **the only production build**. The full-build mode (`build`/`start` scripts, `NEXT_STATIC_EXPORT` toggle) was removed in TODO #26 (2026-09-26)

## Deploy script pattern (from what-do-you-see `scripts/deploy-pages.mjs`)

- **No credentials in the repo.** wrangler reads `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from the environment; the script refuses to run if either is missing and never prints their values. No `wrangler login`.
- One command: build static export → verify `/out` (incl. wasm size check) → create project if missing → `wrangler pages deploy out --project-name <name> --branch main` → ensure custom domain.
- **`--branch main` is required**: without it, deploying from a non-`main` local branch (e.g. `DEV`) creates a PREVIEW deployment that the custom domain never serves.
- **Wrangler 4.x `--force` flag**: `wrangler pages project create` in 4.x delegates to Cloudflare Workers (OpenNext) by default, which breaks static-export apps. Pass `--force` to use the legacy static Pages directly. Only needed on first create; subsequent `deploy` commands work without it. The flag must NOT be passed to `pages deploy`.
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
- Models download from `huggingface.co` — **same-origin** on the Space, no CORS issues.
- Optional CI/CD (not built): a workflow with `HF_TOKEN` secret (fine-grained, single-repo Space write) running the same build+upload on `main` push.

## Git

- Remotes: `origin` = `ssh://fg/lawliet/translate.git` (Forgejo 192.168.1.124:222, SSH alias `fg`); `codeberg` = `ssh://git@codeberg.org/Lawlietr/translate.git`; `github` = `git@github.com:Lawlietr/translate.git` (**public** as of 2026-09-29). Carried-over policy: every commit pushed to ALL configured remotes, whichever branch (routine work on `DEV`).
- Builds: Forgejo runner `root@192.168.1.12` (token in that machine's `~/.zshrc`, never in this repo) — docker images now; Windows exe needs a Windows build host (D5, design/ci-build.md). Never build/package on the dev machine (AGENTS rule 11).
