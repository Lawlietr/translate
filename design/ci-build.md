# CI / Remote Build Policy

## Hard rule (owner, 2026-09-21)

**Never install toolchains, never compile, never package on this dev machine.** All binary and image artifacts are built remotely:

- **ALL compilation/packaging happens in GitHub Actions ONLY** (owner, 2026-09-29). The Forgejo runner `root@192.168.1.12` **cannot build arm64** — it runs inside a nested user namespace (`uid_map: 0 100000 65536`), which blocks host-level binfmt registration → QEMU cross-arch emulation is unavailable (discovered 2026-09-29, TODO #11). Its Docker-build role is retired; **follow-up: clean the 12 runner up** (owner will confirm scope). Local builds on the dev machine remain forbidden (rule 11).
- **Artifact hosting (owner, 2026-09-29 — supersedes the 2026-09-21/26 "Codeberg only" rule): images and binaries go to BOTH Codeberg AND GitHub.** Local Forgejo hosts source ONLY — it NEVER stores images or binaries. Targets: container image → **both** `codeberg.org/lawlietr/translate` **and** `ghcr.io/lawlietr/translate` (same multi-arch manifest); exe → GitHub Release attachment **and** Codeberg generic package (when #10 resumes).
- **Branch model (owner, 2026-09-29):** `DEV` = routine development (same across all three remotes); `main` = **release branch** (created 2026-09-29 from DEV). GitHub repo `git@github.com:Lawlietr/translate.git` is **private** for now (owner will make it public when ready, alongside README). `main` push triggers the full publish (build + push to both registries + GitHub Release); `DEV` push is a build-only CI check (no publish, no release). Workflow definitions live in the repo (`.github/workflows/` is authoritative; `.forgejo/workflows/` lockstep is now moot for Docker since the runner no longer builds).

## Artifact → build location

| Artifact | Builder | Notes |
|----------|---------|-------|
| Docker image (amd64+arm64) | **GitHub Actions `ubuntu-latest`** (QEMU for arm64) | `.github/workflows/docker.yml` — `docker buildx build --platform linux/amd64,linux/arm64 --push` to **both** `codeberg.org/lawlietr/translate` + `ghcr.io/lawlietr/translate`; **static image** (D8: `build:export` + wasm check → `nginx:alpine`); compose per design/local-deployment.md Target 2. `main` push = publish + GitHub Release; `DEV` push = build-only CI check. Forgejo runner retired for builds (user-namespace binfmt limitation, 2026-09-29) |
| Windows 11 WebView2 .exe (C# .NET 8) — **PAUSED 2026-09-26** | **GitHub Actions `windows-latest`** (D5 decided 2026-09-22; GitHub repo landed 2026-09-26, gate cleared) | Native Windows build (`dotnet publish -r win-x64 --self-contained`) + `npm run build:export` → package as a **zip folder** (exe + `web/` static payload — D7, no embedded resources, no node) + runtime smoke test (launch exe, wait for port-ready, `curl /` = 200 — the static build has no API routes). Linux cross-compilation via `EnableWindowsTargeting` (available since .NET 6.0.4xx) was **evaluated and rejected**: the dotnet team recommends native builds for shipping binaries, and windows-latest gives the smoke test for free. Self-hosted Windows runner and the Go/go-webview2 fallback are no longer needed. The `192.168.1.12` runner builds **Docker images only** |

The C# choice (D1) and the build host (D5) are both settled. **D5 (owner, 2026-09-22): the exe is NOT built on the Forgejo runner — it builds on GitHub Actions `windows-latest`**; the GitHub repo landed 2026-09-26, so **TODO #10 is unblocked but PAUSED by the owner (2026-09-26)**. The exe work is split into sub-tasks 10a–10d (design/local-deployment.md §Target 1 sub-tasks); this CI policy governs **10c** (the GitHub Actions workflow) when it resumes. (Historical note: the 2026-09-21 table said "WinForms can't cross-compile from Linux" — that was true pre-.NET 6.0.4xx; `EnableWindowsTargeting` changed it. Native GHA still wins here because it can actually RUN the exe.)

## Secrets

Runner tokens, registry credentials: environment only (runner's `~/.zshrc` / Forgejo secrets / GitHub Actions secrets). Nothing secret in the repo — same policy as Cloudflare (design/deployment.md). GitHub Actions secrets: `CODEBERG_TOKEN` (Codeberg PAT with registry push scope) + `GITHUB_TOKEN` (automatic, for GHCR push + Release).

## Artifacts distribution

**Changed 2026-09-29 (owner):** image published to **BOTH** `codeberg.org/lawlietr/translate` **and** `ghcr.io/lawlietr/translate` (same multi-arch manifest, `latest` + commit-sha tags). exe (when #10 resumes) → GitHub Release attachment **and** Codeberg generic package. **Explicitly NOT** stored on: local Forgejo (source only, never artifacts — owner: "很重要"). GitHub Release (on `main`) carries the pull instructions; the image bodies live in the two registries.

**README note (pending — create when the repo goes public):** the docker/compose deployment section must state that the image is available on **both** GH (`ghcr.io/lawlietr/translate`) and Codeberg (`codeberg.org/lawlietr/translate`), with a `docker pull` example for each.
