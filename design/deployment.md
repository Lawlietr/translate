# Deployment

Cloudflare Pages, static export only. No server-side routes in the public build.

## The 25 MiB per-file limit (non-negotiable)

Cloudflare Pages rejects any single uploaded file ≥ 25 MiB (413, upload fails per-file). transformers.js bundles onnxruntime wasm chunks — the known-good baseline is **transformers.js 4.2.0 → `ort-wasm-simd-threaded.jsep-ft.wasm` 17.82 MiB**; the 4.3.0 bump ships a 25.6 MiB wasm and breaks the upload.

Mandatory pre-deploy check (scripted into the deploy):

```bash
npm run build:export
du -sh out/_next/static/chunks/*.wasm*   # every file must be < 25 MiB
```

And `package.json` pins `@huggingface/transformers` to an exact version (no `^`) — see AGENTS.md rule 1.

## Build modes

- `npm run build` — self-hosted full build (`next start`)
- `npm run build:export` — `NEXT_STATIC_EXPORT=1`, `output: 'export'`, output in `/out`; if API routes exist, move `src/app/api` out of the tree during the build (stale `.next/dev/types/validator.ts` fails type-check otherwise — delete `.next/dev` first)

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

- Remotes: TBD (owner to provide Forgejo/GitHub URLs). Carried-over policy: every commit pushed to all configured remotes, whichever branch (routine work on `DEV`).
