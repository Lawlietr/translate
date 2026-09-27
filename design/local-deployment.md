# Local Deployment Targets

Three local deployment targets beyond Cloudflare Pages (see deployment.md). Shared premise: **zero backend inference** — inference always runs on the user's device (browser WebGPU or the user's own llama-server); the app never runs a model, whatever the packaging.

**Runtime split (D6 2026-09-21, revised D7 2026-09-26):** the **node targets** (Docker, local non-Docker Linux) run the **full Next.js build** (node server) and serve the **WebUI** *and* the **OpenAI-compatible API shim** (§API shim). The **Windows .exe** (D7) leaves the node set: it serves the **static export** (`build:export`) via a built-in C# `HttpListener` — no node, no shim for now. Cloudflare Pages is also static (shim impossible there — see §API shim). What differs per target is *who serves*, *how TLS terminates*, and *where the server config comes from*.

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
- API shim: **not in the .exe for now** (D7 — static builds have no server routes). Docker + local Linux keep the §API shim via #19. If the .exe later needs it, implement **in C# on the same `HttpListener`** (new sub-task) — node stays out of the payload.
- Implementation: **C# .NET 8 WinForms + `Microsoft.Web.WebView2` NuGet**, single-file publish (D1 decided 2026-09-21). Build host: **GitHub Actions `windows-latest`** (D5 decided 2026-09-22 — native Windows build, gated on the GitHub repo landing; the Linux cross-compile path `EnableWindowsTargeting` was evaluated and rejected in favor of native build + runtime smoke test) — design/ci-build.md.
- Caveats to document in the UI/README: first bind to `0.0.0.0` triggers the Windows Firewall prompt (expected); LAN clients without TLS get a "WebGPU unavailable" notice, not a crash.
### Sub-tasks (split 2026-09-26 — each independently testable)

| Sub-task | Scope | Deliverable / exit criterion |
|----------|-------|------------------------------|
| **10a** — C# launcher skeleton | WinForms + `Microsoft.Web.WebView2` NuGet; `config.json` read/write (first-run defaults: `bind_ip`, `port`, `open_view`, shim keys); node child-process launch (path configurable for dev) + port-ready HTTP poll; WebView2 window → `http://127.0.0.1:<port>`; clean shutdown (kill child on window close) | `dotnet run` on the dev box opens a WebView pointing at the local dev server (3001) — no CI, no Windows needed |
| **10b** — static payload + built-in HTTP server (D7) | `npm run build:export` → `web/` folder next to the exe; C# `HttpListener` static file server (MIME + SPA fallback); launcher `serve` mode replaces 10a's node `managed` mode (`external` stays for dev); packaging script zips exe + `web/` | Double-click exe with `web/` alongside → WebView shows the app — no node, no extraction, no `%LOCALAPPDATA%` writes |
| **10c** — GitHub Actions workflow | `.github/workflows/exe.yml` on `windows-latest`: `dotnet publish -r win-x64 --self-contained -c Release` + `npm run build:export` → package **zip folder** (exe + `web/`) → **smoke test job** (launch exe, wait port-ready, `curl /` = 200 — static build has no API routes) → upload to Codeberg generic package | Green CI run produces a downloadable zip folder; smoke test passes |
| **10d** — Real Win11 integration test | Double-click on a clean Win11 machine → `config.json` created with defaults → WebView opens → WebGPU translation works (loopback) → edit `bind_ip`/`port` + restart → LAN device can reach the server, WebGPU status correct per TLS rule | Owner confirms all acceptance criteria on a real machine |

**Dependency chain:** 10a → 10b → 10c → 10d. Each step builds on the previous; 10a is testable with zero Windows infrastructure (dev box `dotnet run`), 10b is a small C# static server + packaging (testable with `dotnet run` on any Windows box — nothing to extract, nothing to verify in a cache dir), 10c needs the GitHub repo (landed), 10d needs the owner's Win11 machine.

**Note on #19 (API shim):** 10a–10d do NOT include the shim — the .exe serves a static export (D7) and has no server routes. Docker + local Linux get the shim via #19. If the .exe later needs the shim, it is a **new sub-task in C# on the same `HttpListener`** (keeps node out of the payload).

- Acceptance criteria (10d):
  - Double-click exe on a clean Win11 machine → app window opens, `config.json` created with defaults
  - Edit `bind_ip`/`port`, restart → server binds the new address
  - WebGPU translation works inside the WebView (loopback URL)
  - A second device on the LAN can load the page; WebGPU status shown correctly per the TLS rule

## Target 2 — Docker / docker compose (linux/amd64 + linux/arm64)

- Multi-stage `Dockerfile` (D6 — full build, not export):
  - Stage 1 `node:22-alpine`: `npm ci` → full build (standalone output) → mandatory wasm < 25 MiB check (fails the build otherwise — keep the invariant)
  - Stage 2 `node:22-alpine`: run the standalone server (WebUI + §API shim) on :3000; **nginx sidecar (optional) as TLS terminator**, proxying `/` → node
  - All base images are multi-arch → `docker buildx build --platform linux/amd64,linux/arm64 -t <registry>/translate:latest .`
- `docker-compose.yml`: port mapping (host 8080 → nginx 80), healthcheck, `restart: unless-stopped`, TLS cert volume per D3, **`LLAMA_BASE_URL` etc. as env (§API shim)**, and an **optional `llama-server` service** (`ghcr.io/ggml-org/llama.cpp:server`) the web container points at by default — `docker compose up` then = complete service (WebUI + API + inference).
- TLS modes — **D3 decided 2026-09-21: default plain HTTP + optional modes**:
  1. Plain HTTP (loopback users fine; LAN users get the "WebGPU unavailable" notice)
  2. **Self-signed certs — REQUIRED mode** (owner: WebGPU effectively forces TLS for LAN use, so self-signed is not just nice-to-have): a `docker-entrypoint.d` hook generates a self-signed cert on first boot when no certs are mounted (CN=hostname), overridable by mounting real certs at `/etc/nginx/certs`
  3. Caddy variant with automatic Let's Encrypt (only for a real domain)
- **D4 decided 2026-09-21:** no internal registry for now — images are **built on the Forgejo runner `root@192.168.1.12`** (never on the dev machine) via Forgejo workflows; GitHub Actions when the GitHub repo lands. See design/ci-build.md.
- Acceptance criteria: `docker compose up` on an amd64 host and an arm64 host both serve the app; WebGPU works via localhost; LAN WebGPU works in TLS mode 2.

## Target 3 — Local non-Docker Linux

- (D6 — full build, not export) `npm run build && npm start` → node server serves WebUI + §API shim on `localhost:<port>`; **Caddy/nginx optional** in front, only for TLS when LAN devices need WebGPU (proxy `/` → node).
- `http://localhost:<port>` is a secure context → WebGPU works with zero TLS for same-machine use.
- Optional convenience: `scripts/serve-local.sh` (build if needed, start server, open browser) — keep minimal, part of this task.
- Acceptance criteria: documented command sequence works on a clean Debian/Ubuntu machine; WebGPU translation works at `http://localhost:<port>`; the §API shim responds at `http://localhost:<port>/api/v1/models`.

## API shim (OpenAI-compatible — node targets: Docker + local Linux, D6; .exe static per D7)

Purpose: give **external clients** — browser translation extensions (e.g. Immersive Translate's OpenAI-compatible provider setting), scripts, other local tools — one stable local translation endpoint. The WebUI is **not** affected: the page still translates via browser WebGPU or browser→llama-server direct fetch (design/inference-providers.md); the shim is an additional door, not a replacement.

Endpoints (OpenAI-compatible shape so extensions point at it as-is):

- `POST /api/v1/chat/completions` — translate (message text in → translated text out)
- `GET /api/v1/models` — passthrough of the configured llama-server's model list (for the extension's model picker)

Behavior: parse → select the **prompt profile** (same logic as TODO #16/#17, server-side variant — incl. the translategemma structured-content constraint) → **server-side fetch** to the configured llama-server (no browser CORS at all; works even if the user's server runs `--no-cors`) → return. **The server never runs inference** (shared premise) — the shim is a proxy; the inference target is always the user's llama-server (future: vLLM, same contract).

Server config — the server has no localStorage, so one variable set, sourced per target:

| variable | meaning | Docker | local Linux |
|---|---|---|---|
| `LLAMA_BASE_URL` | llama-server endpoint | compose env | `.env` / env |
| `MODEL_PRESET` | `auto` / `hy-mt2` / `translategemma` / `generic` | same | same |
| `SYSTEM_PROMPT` | custom system prompt (same profile restrictions as #17) | same | same |
| `API_TOKEN` (optional) | bearer token enforced when the endpoint is exposed beyond loopback | same | same |

Loopback default: no token. LAN exposure: set `API_TOKEN` (the extension's browser may live on another machine). Privacy invariant holds (AGENTS rule 10): zero requests except to the user-configured endpoint.

**Cloudflare Pages: no shim — by architecture, not compromise.** Static export only. CF Pages technically supports serverless Functions, but they are pointless here: the shim's job is to proxy to the user's *local* llama-server, which is unreachable from the CF edge, and relaying user text through a third-party edge would violate rule 10.

Acceptance criteria (per target): with a llama-server running, the extension (or `curl`) completes a zh-TW→en translation through the shim; WebUI on the same host still works; wrong/missing `API_TOKEN` on a LAN-exposed port → 401.

## Decisions (owner, 2026-09-21)

| # | Question | Decision |
|---|----------|----------|
| D1 | WebView2 wrapper language | C# .NET 8 WinForms |
| D2 | Distribution format of the wrapper | **zip folder** (revised 2026-09-26): exe + static export folder as one pre-extracted zip — NOT embedded in the exe (no AV false-positive surface, no first-run extraction, cheap updates) |
| D3 | Docker default TLS | plain HTTP + optional TLS modes; **self-signed mode required** (first-boot auto-generation), own-cert mount override |
| D4 | Build location | Forgejo runner `root@192.168.1.12` now; GitHub Actions later; **never on the dev machine** (design/ci-build.md) |
| D5 | Windows exe build host | GitHub Actions `windows-latest`, after the GitHub repo lands (decided 2026-09-22) — native build + runtime smoke test; NOT the Linux runner (cross-compile evaluated, rejected — design/ci-build.md) |
| D6 (new) | API shim scope + .exe runtime | **Every node-based target** (Docker, local Linux, .exe) runs the full Next.js build and exposes the OpenAI-compatible API shim; CF stays static-only. .exe = node-embedded launcher (C# retires its in-process static server). Static export becomes CF-only *(the .exe part is superseded by D7)* |
| D7 (new) | .exe runtime + distribution | **zip folder** (exe + static export `web/`, pre-extracted — supersedes D2's "embedded in exe") + **static export served by a built-in C# `HttpListener`** (node deferred; the .exe leaves the D6 node-target set — Docker + local Linux keep the full build + §API shim). A future .exe shim, if wanted, is a C# `HttpListener` sub-task, not node |
