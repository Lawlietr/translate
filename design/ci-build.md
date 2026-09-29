# CI / Remote Build Policy

## Hard rule (owner, 2026-09-21)

**Never install toolchains, never compile, never package on this dev machine.** All binary and image artifacts are built remotely:

- **Forgejo self-hosted runner:** `root@192.168.1.12` (runner token lives in `~/.zshrc` there; never copy it into this repo). **Cannot build arm64** — the runner runs inside a nested user namespace (`uid_map: 0 100000 65536`), which blocks host-level binfmt registration → QEMU cross-arch emulation is unavailable (discovered 2026-09-29, TODO #11). Docker image builds moved to GitHub Actions.
- **Artifact hosting (owner, important, 2026-09-21): images and binaries go to CODEBERG ONLY.** Local Forgejo hosts source + runs builds — it NEVER stores images or binaries. Targets: container image → Codeberg container registry (`codeberg.org/lawlietr/translate`, multi-arch manifest); exe → Codeberg generic package of the repo.
- **Now (repo landed 2026-09-26) — GitHub Actions:** the GitHub repo is `git@github.com:Lawlietr/translate.git` — **private** for now (owner will make it public when the project is ready, alongside creating the `main` branch + README); routine work stays on the `DEV` branch (same as Forgejo/Codeberg). The same artifacts get GitHub Actions workflows (windows-latest runner for the exe, buildx for multi-arch images), publishing to the SAME Codeberg targets. Workflow definitions live in the repo (`.forgejo/workflows/` and `.github/workflows/` kept in lockstep).

## Artifact → build location

| Artifact | Builder | Notes |
|----------|---------|-------|
| Docker image (amd64+arm64) | **GitHub Actions `ubuntu-latest`** (QEMU for arm64) | `.github/workflows/docker.yml` — `docker buildx build --platform linux/amd64,linux/arm64 --push`; **static image** (D8: `build:export` + wasm check → `nginx:alpine`); compose per design/local-deployment.md Target 2. Forgejo runner cannot build arm64 (user-namespace binfmt limitation, 2026-09-29) |
| Windows 11 WebView2 .exe (C# .NET 8) — **PAUSED 2026-09-26** | **GitHub Actions `windows-latest`** (D5 decided 2026-09-22; GitHub repo landed 2026-09-26, gate cleared) | Native Windows build (`dotnet publish -r win-x64 --self-contained`) + `npm run build:export` → package as a **zip folder** (exe + `web/` static payload — D7, no embedded resources, no node) + runtime smoke test (launch exe, wait for port-ready, `curl /` = 200 — the static build has no API routes). Linux cross-compilation via `EnableWindowsTargeting` (available since .NET 6.0.4xx) was **evaluated and rejected**: the dotnet team recommends native builds for shipping binaries, and windows-latest gives the smoke test for free. Self-hosted Windows runner and the Go/go-webview2 fallback are no longer needed. The `192.168.1.12` runner builds **Docker images only** |

The C# choice (D1) and the build host (D5) are both settled. **D5 (owner, 2026-09-22): the exe is NOT built on the Forgejo runner — it builds on GitHub Actions `windows-latest`**; the GitHub repo landed 2026-09-26, so **TODO #10 is unblocked but PAUSED by the owner (2026-09-26)**. The exe work is split into sub-tasks 10a–10d (design/local-deployment.md §Target 1 sub-tasks); this CI policy governs **10c** (the GitHub Actions workflow) when it resumes. (Historical note: the 2026-09-21 table said "WinForms can't cross-compile from Linux" — that was true pre-.NET 6.0.4xx; `EnableWindowsTargeting` changed it. Native GHA still wins here because it can actually RUN the exe.)

## Secrets

Runner tokens, registry credentials: environment only (runner's `~/.zshrc` / Forgejo secrets / GitHub Actions secrets). Nothing secret in the repo — same policy as Cloudflare (design/deployment.md). Codeberg registry: `CODEBERG_TOKEN` GitHub Actions secret (PAT with registry push scope).

## Artifacts distribution

**Reconfirmed 2026-09-26 (owner):** Codeberg only — container registry for the image (`codeberg.org/lawlietr/translate`), generic package for the exe **zip folder** (D7). **Explicitly NOT** stored on: local Forgejo (builds only, never artifacts — owner: "很重要") **or GitHub (no GHCR)** — GitHub Actions workflows are build hosts only; they push to Codeberg and keep nothing on GitHub.
