# Local Deployment Targets

Three local deployment targets beyond Cloudflare Pages (see deployment.md). Shared premise: the app is a **pure static site with zero backend inference** — every target serves the SAME `/out` static export. The only differences are *who serves* and *whether TLS is present*.

## Governing constraint: secure context (AGENTS.md rule 5)

WebGPU requires a secure context. Trusted origins: `localhost`, `127.0.0.1`, any `https://...`. Plain `http://<LAN-IP>` is **NOT** a secure context.

- Loopback usage (same machine): plain HTTP is fine — WebGPU works.
- LAN usage (other devices): TLS is mandatory, otherwise WebGPU is unavailable (the page must still degrade gracefully).

Every target below must respect this split.

## Target 1 — Windows 11 WebView2 wrapper (.exe)

- **WebView2 Evergreen Runtime is preinstalled on Windows 11** and tracks current Chromium, where WebGPU is enabled by default (≥113) → WebGPU inference works out of the box, no extra install.
- Architecture (single .exe):
  1. On first run: `config.json` missing → write it **next to the exe** with defaults, e.g. `{"bind_ip":"0.0.0.0","port":8321,"open_view":true}`. On startup: read it (change requires restart; keep it simple).
  2. Serve the static files on `bind_ip:port` (in-process static server).
  3. Open the WebView2 window pointed at `http://127.0.0.1:<port>` — **loopback, never the LAN IP** (secure context is what unlocks WebGPU in the WebView).
- `bind_ip` exists so *other* LAN devices can also reach the same server (their WebGPU status follows the TLS rule above).
- Static file placement: **embedded in the exe** (single distributable artifact, D2 decided 2026-09-21).
- Implementation: **C# .NET 8 WinForms + `Microsoft.Web.WebView2` NuGet**, single-file publish (D1 decided 2026-09-21). Build-host constraint: WindowsDesktop does not cross-compile from Linux → exe builds need a Windows build host, see design/ci-build.md.
- Caveats to document in the UI/README: first bind to `0.0.0.0` triggers the Windows Firewall prompt (expected); LAN clients without TLS get a "WebGPU unavailable" notice, not a crash.
- Acceptance criteria:
  - Double-click exe on a clean Win11 machine → app window opens, `config.json` created with defaults
  - Edit `bind_ip`/`port`, restart → server binds the new address
  - WebGPU translation works inside the WebView (loopback URL)
  - A second device on the LAN can load the page; WebGPU status shown correctly per the TLS rule

## Target 2 — Docker / docker compose (linux/amd64 + linux/arm64)

- Multi-stage `Dockerfile`:
  - Stage 1 `node:22-alpine`: `npm ci` → `npm run build:export` → mandatory wasm < 25 MiB check (fails the build otherwise, even though CF isn't involved — keep the invariant)
  - Stage 2 `nginx:alpine`: copy `/out` → `/usr/share/nginx/html`, health endpoint `/`
  - Both base images are multi-arch → `docker buildx build --platform linux/amd64,linux/arm64 -t <registry>/translate:latest .`
- `docker-compose.yml`: port mapping (host 8080 → 80), healthcheck, `restart: unless-stopped`, optional TLS cert volume mounted to nginx.
- TLS modes — **D3 decided 2026-09-21: default plain HTTP + optional modes**:
  1. Plain HTTP (loopback users fine; LAN users get the "WebGPU unavailable" notice)
  2. **Self-signed certs — REQUIRED mode** (owner: WebGPU effectively forces TLS for LAN use, so self-signed is not just nice-to-have): a `docker-entrypoint.d` hook generates a self-signed cert on first boot when no certs are mounted (CN=hostname), overridable by mounting real certs at `/etc/nginx/certs`
  3. Caddy variant with automatic Let's Encrypt (only for a real domain)
- **D4 decided 2026-09-21:** no internal registry for now — images are **built on the Forgejo runner `root@192.168.1.12`** (never on the dev machine) via Forgejo workflows; GitHub Actions when the GitHub repo lands. See design/ci-build.md.
- Acceptance criteria: `docker compose up` on an amd64 host and an arm64 host both serve the app; WebGPU works via localhost; LAN WebGPU works in TLS mode 2.

## Target 3 — Local non-Docker Linux

- `npm run build:export` → serve `/out` with any static server. Recommended: **Caddy** (one-line HTTPS when a domain exists); also nginx; `python3 -m http.server` for quick loopback tests.
- `http://localhost:<port>` is a secure context → WebGPU works with zero TLS for same-machine use.
- Optional convenience: `scripts/serve-local.sh` (pick server/port, open browser) — keep minimal, part of this task.
- Acceptance criteria: documented command sequence works on a clean Debian/Ubuntu machine; WebGPU translation works at `http://localhost:<port>`.

## Decisions (owner, 2026-09-21)

| # | Question | Decision |
|---|----------|----------|
| D1 | WebView2 wrapper language | C# .NET 8 WinForms |
| D2 | Static files in wrapper | embedded in exe |
| D3 | Docker default TLS | plain HTTP + optional TLS modes; **self-signed mode required** (first-boot auto-generation), own-cert mount override |
| D4 | Build location | Forgejo runner `root@192.168.1.12` now; GitHub Actions later; **never on the dev machine** (design/ci-build.md) |
| D5 (new) | Windows exe build host | TBD — Windows host required (WinForms can't cross-compile); self-hosted Windows runner preferred, Go re-eval as fallback (design/ci-build.md) |
