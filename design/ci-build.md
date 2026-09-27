# CI / Remote Build Policy

## Hard rule (owner, 2026-09-21)

**Never install toolchains, never compile, never package on this dev machine.** All binary and image artifacts are built remotely:

- **Now — Forgejo self-hosted runner:** `root@192.168.1.12` (runner token lives in `~/.zshrc` there; never copy it into this repo). Docker images (linux/amd64 + arm64 via buildx) are built here via Forgejo workflows on push.
- **Artifact hosting (owner, important, 2026-09-21): images and binaries go to CODEBERG ONLY.** Local Forgejo hosts source + runs builds — it NEVER stores images or binaries. Targets: container image → Codeberg container registry (`registry.codeberg.org/Lawlietr/translate`, multi-arch manifest); exe → Codeberg generic package of the repo.
- **Now (repo landed 2026-09-26) — GitHub Actions:** the GitHub repo is `git@github.com:Lawlietr/translate.git` — **private** for now (owner will make it public when the project is ready, alongside creating the `main` branch + README); routine work stays on the `DEV` branch (same as Forgejo/Codeberg). The same artifacts get GitHub Actions workflows (windows-latest runner for the exe, buildx for multi-arch images), publishing to the SAME Codeberg targets. Workflow definitions live in the repo (`.forgejo/workflows/` and `.github/workflows/` kept in lockstep).

## Artifact → build location

| Artifact | Builder | Notes |
|----------|---------|-------|
| Docker image (amd64+arm64) | Forgejo runner `192.168.1.12` (Linux) | `docker buildx build --platform linux/amd64,linux/arm64`; compose per design/local-deployment.md Target 2 |
| Windows 11 WebView2 .exe (C# .NET 8) | **GitHub Actions `windows-latest`** (D5 decided 2026-09-22; GitHub repo landed 2026-09-26, gate cleared) | Native Windows build (`dotnet publish -r win-x64 --self-contained`) + `npm run build:export` → package as a **zip folder** (exe + `web/` static payload — D7, no embedded resources, no node) + runtime smoke test (launch exe, wait for port-ready, `curl /` = 200 — the static build has no API routes). Linux cross-compilation via `EnableWindowsTargeting` (available since .NET 6.0.4xx) was **evaluated and rejected**: the dotnet team recommends native builds for shipping binaries, and windows-latest gives the smoke test for free. Self-hosted Windows runner and the Go/go-webview2 fallback are no longer needed. The `192.168.1.12` runner builds **Docker images only** |

The C# choice (D1) and the build host (D5) are both settled. **D5 (owner, 2026-09-22): the exe is NOT built on the Forgejo runner — it builds on GitHub Actions `windows-latest`**; the GitHub repo landed 2026-09-26, so **TODO #10 is now unblocked**. The exe work is split into sub-tasks 10a–10d (design/local-deployment.md §Target 1 sub-tasks); this CI policy governs **10c** (the GitHub Actions workflow). (Historical note: the 2026-09-21 table said "WinForms can't cross-compile from Linux" — that was true pre-.NET 6.0.4xx; `EnableWindowsTargeting` changed it. Native GHA still wins here because it can actually RUN the exe.)

## Secrets

Runner tokens, registry credentials: environment only (runner's `~/.zshrc` / Forgejo secrets). Nothing secret in the repo — same policy as Cloudflare (design/deployment.md).

## Artifacts distribution

**Decided 2026-09-21:** Codeberg only — container registry for the image, generic package for the exe **zip folder** (D7). Local Forgejo: builds only, no artifact storage (owner: "很重要").
