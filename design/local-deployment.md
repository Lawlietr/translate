# Local Deployment Targets

Three local deployment targets beyond Cloudflare Pages (see deployment.md). Shared premise: **zero backend inference** — inference always runs on the user's device (browser WebGPU or the user's own llama-server); the app never runs a model, whatever the packaging.

**Runtime split (D6, 2026-09-21):** all three local targets run the **full Next.js build** (node server), not the static export — each therefore serves the **WebUI** *and* the **OpenAI-compatible API shim** for external clients (§API shim). The static export (`build:export`) is now dedicated to Cloudflare Pages (shim impossible there — see §API shim). What differs per target is *who serves*, *how TLS terminates*, and *where the server config comes from*.

## Governing constraint: secure context (AGENTS.md rule 5)

WebGPU requires a secure context. Trusted origins: `localhost`, `127.0.0.1`, any `https://...`. Plain `http://<LAN-IP>` is **NOT** a secure context.

- Loopback usage (same machine): plain HTTP is fine — WebGPU works.
- LAN usage (other devices): TLS is mandatory, otherwise WebGPU is unavailable (the page must still degrade gracefully).

Every target below must respect this split.

## Target 1 — Windows 11 WebView2 wrapper (.exe)

- **WebView2 Evergreen Runtime is preinstalled on Windows 11** and tracks current Chromium, where WebGPU is enabled by default (≥113) → WebGPU inference works out of the box, no extra install.
- Architecture (single .exe, **D2 revised 2026-09-21 — node-embedded launcher**):
  1. On first run: `config.json` missing → write it **next to the exe** with defaults, e.g. `{"bind_ip":"0.0.0.0","port":8321,"open_view":true, ...§API-shim keys}`. On startup: read it (change requires restart; keep it simple).
  2. Launch the **embedded Node.js runtime + Next.js standalone build** (extracted on first run into a local cache dir) as a child process bound to `bind_ip:port`; wait for port-ready. C# is **launcher + window manager only** — no in-process static server (that design is retired; the node server serves both WebUI and §API shim).
  3. Open the WebView2 window pointed at `http://127.0.0.1:<port>` — **loopback, never the LAN IP** (secure context is what unlocks WebGPU in the WebView).
- `bind_ip` exists so *other* LAN devices can also reach the same server (their WebGPU status follows the TLS rule above).
- Payload placement: **Node runtime + standalone build embedded in the exe** (single distributable artifact; D2 revised 2026-09-21 — statics-only → node, so the .exe also exposes the §API shim). Size cost +~50–100 MB — negligible next to the multi-GB model downloads.
- Implementation: **C# .NET 8 WinForms + `Microsoft.Web.WebView2` NuGet**, single-file publish (D1 decided 2026-09-21). Build host: **GitHub Actions `windows-latest`** (D5 decided 2026-09-22 — native Windows build, gated on the GitHub repo landing; the Linux cross-compile path `EnableWindowsTargeting` was evaluated and rejected in favor of native build + runtime smoke test) — design/ci-build.md.
- Caveats to document in the UI/README: first bind to `0.0.0.0` triggers the Windows Firewall prompt (expected); LAN clients without TLS get a "WebGPU unavailable" notice, not a crash.
- Acceptance criteria:
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

## API shim (OpenAI-compatible — all node targets, D6)

Purpose: give **external clients** — browser translation extensions (e.g. Immersive Translate's OpenAI-compatible provider setting), scripts, other local tools — one stable local translation endpoint. The WebUI is **not** affected: the page still translates via browser WebGPU or browser→llama-server direct fetch (design/inference-providers.md); the shim is an additional door, not a replacement.

Endpoints (OpenAI-compatible shape so extensions point at it as-is):

- `POST /api/v1/chat/completions` — translate (message text in → translated text out)
- `GET /api/v1/models` — passthrough of the configured llama-server's model list (for the extension's model picker)

Behavior: parse → select the **prompt profile** (same logic as TODO #16/#17, server-side variant — incl. the translategemma structured-content constraint) → **server-side fetch** to the configured llama-server (no browser CORS at all; works even if the user's server runs `--no-cors`) → return. **The server never runs inference** (shared premise) — the shim is a proxy; the inference target is always the user's llama-server (future: vLLM, same contract).

Server config — the server has no localStorage, so one variable set, sourced per target:

| variable | meaning | Docker | local Linux | .exe |
|---|---|---|---|---|
| `LLAMA_BASE_URL` | llama-server endpoint | compose env | `.env` / env | `config.json` |
| `MODEL_PRESET` | `auto` / `hy-mt2` / `translategemma` / `generic` | same | same | same |
| `SYSTEM_PROMPT` | custom system prompt (same profile restrictions as #17) | same | same | same |
| `API_TOKEN` (optional) | bearer token enforced when the endpoint is exposed beyond loopback | same | same | same |

Loopback default: no token. LAN exposure: set `API_TOKEN` (the extension's browser may live on another machine). Privacy invariant holds (AGENTS rule 10): zero requests except to the user-configured endpoint.

**Cloudflare Pages: no shim — by architecture, not compromise.** Static export only. CF Pages technically supports serverless Functions, but they are pointless here: the shim's job is to proxy to the user's *local* llama-server, which is unreachable from the CF edge, and relaying user text through a third-party edge would violate rule 10.

Acceptance criteria (per target): with a llama-server running, the extension (or `curl`) completes a zh-TW→en translation through the shim; WebUI on the same host still works; wrong/missing `API_TOKEN` on a LAN-exposed port → 401.

## Decisions (owner, 2026-09-21)

| # | Question | Decision |
|---|----------|----------|
| D1 | WebView2 wrapper language | C# .NET 8 WinForms |
| D2 | Static files in wrapper | embedded in exe |
| D3 | Docker default TLS | plain HTTP + optional TLS modes; **self-signed mode required** (first-boot auto-generation), own-cert mount override |
| D4 | Build location | Forgejo runner `root@192.168.1.12` now; GitHub Actions later; **never on the dev machine** (design/ci-build.md) |
| D5 | Windows exe build host | GitHub Actions `windows-latest`, after the GitHub repo lands (decided 2026-09-22) — native build + runtime smoke test; NOT the Linux runner (cross-compile evaluated, rejected — design/ci-build.md) |
| D6 (new) | API shim scope + .exe runtime | **Every node-based target** (Docker, local Linux, .exe) runs the full Next.js build and exposes the OpenAI-compatible API shim; CF stays static-only. .exe = node-embedded launcher (C# retires its in-process static server). Static export becomes CF-only |
