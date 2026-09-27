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
- Custom-domain step (only if the domain sits in a zone proxied through Cloudflare): `POST /accounts/{acct}/pages/projects/{project}/domains` with body `{"name": "<domain>"}` (field is `name`, NOT `domain`); delete with `DELETE …/domains/{domain-name}` (the NAME, not the UUID). CNAME points at the owning project's `*.pages.dev` alias; TLS auto-issued; all steps idempotent.
- If a local `next start` is running, restart it after the deploy (the script prints a warning).

## Two-project policy (owner decision, carried over)

- TEST project and PRODUCTION project are SEPARATE (a Pages deployment updates every domain on its project, so routine deploys can never touch production).
- **Default runs deploy to TEST only. Production only on explicit owner request (`--prod`).**
- Custom domains TBD (owner to provide) — do not guess.

## Git

- Remotes: `origin` = `ssh://fg/lawliet/translate.git` (Forgejo 192.168.1.124:222, SSH alias `fg`); `codeberg` = `ssh://git@codeberg.org/Lawlietr/translate.git`; `github` = `git@github.com:Lawlietr/translate.git` (**private** for now — owner will make it public when the project is ready, alongside creating the `main` branch + README; routine work on `DEV`). GitHub also gets Actions workflows (design/ci-build.md). Carried-over policy: every commit pushed to ALL configured remotes, whichever branch (routine work on `DEV`).
- Builds: Forgejo runner `root@192.168.1.12` (token in that machine's `~/.zshrc`, never in this repo) — docker images now; Windows exe needs a Windows build host (D5, design/ci-build.md). Never build/package on the dev machine (AGENTS rule 11).
