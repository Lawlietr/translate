# Browser Testing (Automated + LAN)

How to verify the UI in a browser. Two tools: **Playwright MCP** (primary, functional checks) and **Obscura** (screenshots only). Both run against the app served over the LAN, because the owner tests from a different machine than the dev box.

## Serving for browser testing (the preconditions)

Every local server must bind `0.0.0.0` (never localhost-only) — the browser is on another host. See `webgpu-knowledge.md` §3 for the secure-context / disk-space details.

**Next 16 dev + non-localhost hosts** (why the proxied LAN path needs two things):
- `next.config.ts` carries `allowedDevOrigins` for `127.0.0.1` + the dev box's LAN IPs — dev servers block cross-origin `/_next/*` requests, and when blocked the page SSRs but **never hydrates** (dead app, no errors).
- The HTTPS proxy (`scripts/https-test-server.mjs`) MUST forward the WebSocket `upgrade` with exactly **ONE** `Host:` header (rewrite, don't append) — Next 16 dev hydration depends on the HMR websocket; a duplicate `Host` makes dev reject the handshake. Without this, the proxied LAN path stays unhydrated while direct access works.

If the page looks dead (frozen "checking WebGPU…" chip, dead buttons, untypeable inputs, spurious WebGPU error): it is almost always **not hydrated**, not a GPU problem. Diagnostic order (full write-up in `webgpu-knowledge.md` §3): (1) `__reactFiber` key on the root element, (2) `curl -sk https://<host>/ | grep "not available"` (SSR-baked artifact?), (3) only then `navigator.gpu.requestAdapter()`.

## Playwright MCP (primary — use the `playwright` skill)

- Remote MCP server: Docker container `playwright` on `192.168.1.12:8931` (Microsoft official image `mcr.microsoft.com/playwright/mcp` v0.0.82, headless Chromium). Skill file: `/root/.pi/agent/skills/playwright/SKILL.md`.
- **Compose-managed** at `/root/playwright/docker-compose.yaml` on 12 — restart/recreate ONLY via `docker compose` there, **never ad-hoc `docker run`** (same discipline as obscura, AGENTS rule 12). Port **8931 is pinned** (the skill hardcodes it).
- **Test over `http://192.168.1.15:3001` (HTTP), NOT the 3443 HTTPS path** — the MCP Chromium rejects the 3443 self-signed cert (v0.0.82 has no cert-ignore flag; the image lacks `update-ca-certificates`). HTTP is not a secure context so `navigator.gpu` is undefined there — that's fine, because **WebGPU functional / A/B verification happens in the owner's real browser** (SwiftShader software emulation on 12 is too slow — owner decision 2026-09-23).
- The 12 MCP covers hydration, UI, settings, i18n, and llama-server backend checks over the real LAN client path.
- **Browser profile state (localStorage/cookies/Cache API) persists between calls** — `browser_close` to reset between test profiles. The container has **no volume** → a rebuild wipes the profile.
- **Stale-browser lock:** if a previous session's browser is left open (script died mid-run), new MCP sessions get `Browser is already in use … use --isolated`, and a `browser_close` from a NEW session CANNOT fix it (it doesn't own that browser). `docker compose restart` is NOT enough (the stale Chrome `SingletonLock` in the profile survives; the container FS persists across restarts). The fix is `docker compose up -d --force-recreate playwright` on 12 (also gives a clean profile). Always leave the container clean at the end of a test run.
- **Element refs go stale after navigation** — take a fresh `browser_snapshot` before acting.

**Fallback if the MCP server is down:** drive the already-cached Chromium (`~/.cache/ms-playwright/`) with `playwright-core` in `/tmp` (supports `ignoreHTTPSErrors`, so it CAN test the 3443 path). Never add test toolchains to the project.

## Obscura (screenshots only)

The Obscura containerized browser has a **double-React-root quirk**: a second (app-level) root sits behind the one scripts see, so synthetic click events are consumed there and never reach the app's React tree (verified 2026-09-22; the same page works flawlessly under real Chromium). Use **Playwright for functional checks**; Obscura at most for screenshots.
