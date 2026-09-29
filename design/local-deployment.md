# Local Deployment Targets

Three local deployment targets beyond Cloudflare Pages (see deployment.md). Shared premise: **zero backend inference** — inference always runs on the user's device (browser WebGPU or the user's own llama-server); the app never runs a model, whatever the packaging.

**Runtime (D8, 2026-09-26 — owner decision: all targets static, API provider dropped):** every target serves the **same static export** (`build:export` → `/out`). There are no node targets and no API provider (§API provider, dropped) — the full Next.js build mode is legacy (cleanup TODO). What differs per target is *who serves the static files* and *how TLS terminates*.

## Governing constraint: secure context (AGENTS.md rule 5)

WebGPU requires a secure context. Trusted origins: `localhost`, `127.0.0.1`, any `https://...`. Plain `http://<LAN-IP>` is **NOT** a secure context.

- Loopback usage (same machine): plain HTTP is fine — WebGPU works.
- LAN usage (other devices): TLS is mandatory, otherwise WebGPU is unavailable (the page must still degrade gracefully).

Every target below must respect this split.

## Target 1 — Windows 11 WebView2 wrapper (.exe)

- **WebView2 Evergreen Runtime is preinstalled on Windows 11** and tracks current Chromium, where WebGPU is enabled by default (≥113) → WebGPU inference works out of the box, no extra install.
- Architecture (**D2 revised 2026-09-26 — zip folder distribution; D7 2026-09-26 — static export + built-in C# HTTP server, node deferred**):
  1. On first run: `config.json` missing → write it **next to the exe** with defaults, e.g. `{"bind_ip":"0.0.0.0","port":8321,"open_view":true}`. On startup: read it (change requires restart; keep it simple).
  2. Start the **built-in C# `HttpListener` static server** serving the static export folder (`web/`, next to the exe; correct MIME types + SPA fallback to `index.html`) bound to `bind_ip:port`; wait for port-ready. C# is launcher + static server + window manager — **no node, no embedded payload, no extraction** (D7).
  3. Open the WebView2 window pointed at `http://127.0.0.1:<port>` — **loopback, never the LAN IP** (secure context is what unlocks WebGPU in the WebView).
- `bind_ip` exists so *other* LAN devices can also reach the same server (their WebGPU status follows the TLS rule above).
- Distribution: **zip folder** (D2 revised 2026-09-26): `translate.exe` (self-contained .NET, ~70–90 MB) + `web/` (static export, ~25–40 MB incl. the 17.8 MiB ort wasm) in one **pre-extracted zip** (~100–130 MB). No embedded resources (200 MB single-file download + AV false-positive surface), no first-run extraction, no version stamps; update = replace the folder. Portable — works from a USB stick.
- API provider: **dropped entirely (D8)** — no target exposes a translation API (§API provider). The .exe is just a static file server + window.
- Implementation: **C# .NET 8 WinForms + `Microsoft.Web.WebView2` NuGet**, single-file publish (D1 decided 2026-09-21). Build host: **GitHub Actions `windows-latest`** (D5 decided 2026-09-22 — native Windows build, gated on the GitHub repo landing; the Linux cross-compile path `EnableWindowsTargeting` was evaluated and rejected in favor of native build + runtime smoke test) — design/ci-build.md.
- Caveats to document in the UI/README: first bind to `0.0.0.0` triggers the Windows Firewall prompt (expected); LAN clients without TLS get a "WebGPU unavailable" notice, not a crash.
### Sub-tasks (split 2026-09-26 — **PAUSED by owner 2026-09-26**; blueprint stands, resume in order 10a → 10d)

| Sub-task | Scope | Deliverable / exit criterion |
|----------|-------|------------------------------|
| **10a** — C# launcher skeleton | WinForms + `Microsoft.Web.WebView2` NuGet; `config.json` read/write (first-run defaults: `bind_ip`, `port`, `open_view`, shim keys); node child-process launch (path configurable for dev) + port-ready HTTP poll; WebView2 window → `http://127.0.0.1:<port>`; clean shutdown (kill child on window close) | `dotnet run` on the dev box opens a WebView pointing at the local dev server (3001) — no CI, no Windows needed |
| **10b** — static payload + built-in HTTP server (D7) | `npm run build:export` → `web/` folder next to the exe; C# `HttpListener` static file server (MIME + SPA fallback); launcher `serve` mode replaces 10a's node `managed` mode (`external` stays for dev); packaging script zips exe + `web/` | Double-click exe with `web/` alongside → WebView shows the app — no node, no extraction, no `%LOCALAPPDATA%` writes |
| **10c** — GitHub Actions workflow | `.github/workflows/exe.yml` on `windows-latest`: `dotnet publish -r win-x64 --self-contained -c Release` + `npm run build:export` → package **zip folder** (exe + `web/`) → **smoke test job** (launch exe, wait port-ready, `curl /` = 200 — static build has no API routes) → upload to Codeberg generic package | Green CI run produces a downloadable zip folder; smoke test passes |
| **10d** — Real Win11 integration test | Double-click on a clean Win11 machine → `config.json` created with defaults → WebView opens → WebGPU translation works (loopback) → edit `bind_ip`/`port` + restart → LAN device can reach the server, WebGPU status correct per TLS rule | Owner confirms all acceptance criteria on a real machine |

**Dependency chain:** 10a → 10b → 10c → 10d. Each step builds on the previous; 10a is testable with zero Windows infrastructure (dev box `dotnet run`), 10b is a small C# static server + packaging (testable with `dotnet run` on any Windows box — nothing to extract, nothing to verify in a cache dir), 10c needs the GitHub repo (landed), 10d needs the owner's Win11 machine.

**Note (D8):** #19 (API shim) is **dropped** — no target needs it. 10a–10d stay static-only; the 10a code's shim env wiring (`LLAMA_BASE_URL`/`MODEL_PRESET`/`SYSTEM_PROMPT`/`API_TOKEN` in `wrapper/`) is legacy and gets removed when 10b lands.

- Acceptance criteria (10d):
  - Double-click exe on a clean Win11 machine → app window opens, `config.json` created with defaults
  - Edit `bind_ip`/`port`, restart → server binds the new address
  - WebGPU translation works inside the WebView (loopback URL)
  - A second device on the LAN can load the page; WebGPU status shown correctly per the TLS rule

## Target 2 — Docker / docker compose (linux/amd64 + linux/arm64)

- Multi-stage `Dockerfile` (D8 — **static export**, not full build):
  - Stage 1 `node:22-alpine`: `npm ci` → `npm run build:export` → mandatory wasm < 25 MiB check (fails the build otherwise — keep the invariant)
  - Stage 2 `nginx:alpine`: serve `/out` on :80 with self-signed TLS (D3) — one container, no sidecar
  - All base images are multi-arch → built by **GitHub Actions** (`.github/workflows/docker.yml`) and pushed to **BOTH** `codeberg.org/lawlietr/translate` **and** `ghcr.io/lawlietr/translate` (same manifest, `latest` + commit-sha tags). `main` push = publish + GitHub Release; `DEV` push = build-only CI check. Not on local Forgejo (source only). Registry policy: ci-build.md (2026-09-29: both GH + Codeberg, supersedes the earlier "Codeberg only")
- `docker-compose.yml`: port mapping (host 8080 → nginx 80), healthcheck, `restart: unless-stopped`, TLS cert volume per D3. **No env config, no llama-server service** — inference is the user's browser's job (WebGPU, or the user's own llama-server reached directly from the browser).
- TLS modes — **D3 decided 2026-09-21: default plain HTTP + optional modes**:
  1. Plain HTTP (loopback users fine; LAN users get the "WebGPU unavailable" notice)
  2. **Self-signed certs — REQUIRED mode** (owner: WebGPU effectively forces TLS for LAN use, so self-signed is not just nice-to-have): a `docker-entrypoint.d` hook generates a self-signed cert on first boot when no certs are mounted (CN=hostname), overridable by mounting real certs at `/etc/nginx/certs`
  3. Caddy variant with automatic Let's Encrypt (only for a real domain)
- **D4 (superseded 2026-09-29):** originally "built on the Forgejo runner, Codeberg registry only." The runner **cannot build arm64** (nested user namespace blocks binfmt, 2026-09-29), so **all Docker builds moved to GitHub Actions**, and the image is now published to **BOTH** `ghcr.io/lawlietr/translate` **and** `codeberg.org/lawlietr/translate` (owner 2026-09-29: both GH + Codeberg carry artifacts; local Forgejo stays source-only). `main` = release branch → GitHub Release. See design/ci-build.md.
- Acceptance criteria: `docker compose up` on an amd64 host and an arm64 host both serve the app; WebGPU works via localhost; LAN WebGPU works in TLS mode 2.

### Implementation status (2026-09-29)

Implemented in commit `e558ec9` (+ `apk add openssl` Dockerfile fix): `Dockerfile` (multi-stage, wasm < 25 MiB gate in stage 1), `docker/nginx.conf` (dual 80/443 servers, SPA fallback `try_files → /index.html`), `docker/entrypoint-selfsigned.sh` (first-boot cert generation, CN=hostname, SAN = hostname + localhost + 127.0.0.1 + 192.168.1.15, 825 days), `docker-compose.yml` (8080→80, 8443→443, `./certs` volume writable so the hook can generate into it, healthcheck via busybox `wget --spider`), `.dockerignore`.

**Build/verify on the runner (manual — registry automation is #13):** repo synced via rsync (the runner has no forgejo SSH key), `docker buildx build --platform linux/amd64 -t translate:latest --load .` (NOTE: `--load` cannot export multi-arch manifest lists — build per-arch locally; `--push` is what #13's workflow will use for the dual-arch registry image).

**Pitfalls hit:** (1) `nginx:alpine` has NO `openssl` binary — the entrypoint hook dies with `openssl: not found` → container restart loop (exit 127); fixed with `apk add --no-cache openssl` in stage 2. (2) **The runner cannot build arm64 images at all** — it runs inside a nested user namespace (`/proc/self/uid_map` = `0 100000 65536`, so our "root" is host UID 100000), which blocks host-level binfmt registration (`/proc/sys/fs/binfmt_misc/register` is EACCES even for root; the dir is owned by `nobody` because host root isn't mapped in) → QEMU cross-arch emulation is unavailable, arm64 builds die with `exec format error`. No workaround from inside the namespace. arm64 options: build natively on an arm64 host (owner's Mac), or rely on #13's Codeberg CI (Codeberg provides arm64 runners).

**Verified on the runner (amd64, 2026-09-29):** compose up healthy; HTTP 8080 → 200 (index.html, zh-TW + dark); SPA fallback `/settings` → 200; HTTPS 8443 → 200 with the generated self-signed cert (SAN: hostname + localhost + 127.0.0.1 + 192.168.1.15); wasm in image 9.3 MiB < 25 MiB; static JS asset → 200. **Owner's real-browser acceptance PASSED (2026-09-29):** LAN WebGPU via `https://192.168.1.12:8443` (self-signed warning, proceed) — "功能正常如預期". Multi-arch publish verified: GHA run pushed `latest` + sha tag to BOTH `codeberg.org/lawlietr/translate` (OCI index: amd64 + arm64 confirmed via API) and GHCR; GitHub Release `v2026.09.29-0df78d9` created. **Runner leftovers cleaned 2026-09-29** (container/images/build-cache/files; forgejo-runner + playwright MCP untouched). arm64 native-serve not tested on an arm64 host (runner can't build it; the GHA-pushed arm64 manifest is the artifact).

## Target 3 — Local non-Docker Linux

- (D8 — static export) `npm run build:export` → serve `/out` with any static server (`npx serve out`, nginx, Caddy); **Caddy/nginx optional** in front, only for TLS when LAN devices need WebGPU.
- `http://localhost:<port>` is a secure context → WebGPU works with zero TLS for same-machine use.
- Optional convenience: `scripts/serve-local.sh` (build if needed, serve `/out`, open browser) — keep minimal, part of this task.
- Acceptance criteria: documented command sequence works on a clean Debian/Ubuntu machine; WebGPU translation works at `http://localhost:<port>`.

## Target 4 — GitHub Pages + HF Space (static public hosts, added 2026-09-26)

Both serve the static export over HTTPS — WebGPU works out of the box, no config:

- **GitHub Pages:** the GitHub repo (`git@github.com:Lawlietr/translate.git`, private until publish) serves project pages; an Actions workflow publishes `/out` (build → deploy). Caveat: subpath serving (`<user>.github.io/<repo>/`) needs `basePath` in `next.config.ts` — decide repo-root vs subpath at implementation time.
- **HF Space:** Static Space — a workflow builds `/out` and pushes its contents to the Space repo. Models stay user-downloaded (the Space cannot pre-seed the browser Cache API anyway).
- Neither host can run server code — static only, same architecture as CF Pages.

## API provider (DROPPED 2026-09-26, D8 — was the OpenAI-compatible shim, TODO #19)

**Never built, dropped before implementation.** The idea was a server-side `POST /api/v1/chat/completions` + `GET /api/v1/models` for external clients (e.g. Immersive Translate's OpenAI-compatible provider setting). Dropped because:

1. **WebGPU is browser-only** — a Node.js server cannot use it (onnxruntime-node has no WebGPU EP); server-side ONNX inference would be CPU-only (~5–30 tok/s), a non-starter for a translation service.
2. **Extensions already have the direct path** — point their OpenAI-compatible setting at the *user's own* llama-server (`--cors-origins '*'`); that is exactly what llama-server is for.
3. Keeping it would force every local target (Docker, .exe, local Linux) to carry a node server + inference config surface for a door the product doesn't need.

Consequence (D8): **all targets are static**; no API routes exist in `src/app/api`; the full Next.js build mode is legacy (cleanup TODO).

## Decisions (owner, 2026-09-21)

| # | Question | Decision |
|---|----------|----------|
| D1 | WebView2 wrapper language | C# .NET 8 WinForms |
| D2 | Distribution format of the wrapper | **zip folder** (revised 2026-09-26): exe + static export folder as one pre-extracted zip — NOT embedded in the exe (no AV false-positive surface, no first-run extraction, cheap updates) |
| D3 | Docker default TLS | plain HTTP + optional TLS modes; **self-signed mode required** (first-boot auto-generation), own-cert mount override |
| D4 | Build location | Forgejo runner `root@192.168.1.12` now; GitHub Actions later; **never on the dev machine** (design/ci-build.md) |
| D5 | Windows exe build host | GitHub Actions `windows-latest`, after the GitHub repo lands (decided 2026-09-22) — native build + runtime smoke test; NOT the Linux runner (cross-compile evaluated, rejected — design/ci-build.md) |
| D6 (new) | API shim scope + .exe runtime | **Every node-based target** (Docker, local Linux, .exe) runs the full Next.js build and exposes the OpenAI-compatible API shim; CF stays static-only. .exe = node-embedded launcher (C# retires its in-process static server). Static export becomes CF-only *(superseded by D7, then D8 — the API shim was dropped entirely; no node targets exist)* |
| D7 (new) | .exe runtime + distribution | **zip folder** (exe + static export `web/`, pre-extracted — supersedes D2's "embedded in exe") + **static export served by a built-in C# `HttpListener`** (node deferred). Blueprint stands; exe work **PAUSED** by owner 2026-09-26 |
| D8 (new) | API provider + runtime unification | **API provider dropped** (WebGPU is browser-only → server ONNX is CPU-only, too slow; extensions point at the user's own llama-server directly — §API provider). **All targets serve the static export**: Docker (nginx), local Linux (serve `/out`), .exe (C# `HttpListener`, paused), Cloudflare Pages / GitHub Pages / HF Space (static hosts). Full build mode = legacy, cleanup pending |
