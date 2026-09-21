# CI / Remote Build Policy

## Hard rule (owner, 2026-09-21)

**Never install toolchains, never compile, never package on this dev machine.** All binary and image artifacts are built remotely:

- **Now — Forgejo self-hosted runner:** `root@192.168.1.12` (runner token lives in `~/.zshrc` there; never copy it into this repo). Docker images (linux/amd64 + arm64 via buildx) are built here via Forgejo workflows on push.
- **Later — GitHub Actions:** a GitHub repo will be added; the same artifacts get GitHub Actions workflows (windows-latest runner for the exe, buildx for multi-arch images). The workflow definitions live in the repo (`.forgejo/workflows/` and `.github/workflows/` kept in lockstep).

## Artifact → build location

| Artifact | Builder | Notes |
|----------|---------|-------|
| Docker image (amd64+arm64) | Forgejo runner `192.168.1.12` (Linux) | `docker buildx build --platform linux/amd64,linux/arm64`; compose per design/local-deployment.md Target 2 |
| Windows 11 WebView2 .exe (C# .NET 8) | **Windows build host required — TBD** | WindowsDesktop SDK (WinForms) does **not** cross-compile from Linux; the Linux runner cannot build this exe. Options: (a) self-hosted Windows runner (a Win11 machine registered to Forgejo) — preferred, keeps "no local builds" intact; (b) revisit Go + go-webview2 (cross-compiles from Linux, would let the current runner build it) |

The C# choice (D1) is final *for the wrapper implementation*; only its **build host** remains open. If option (a) never materializes, option (b) is the fallback and D1 flips.

## Secrets

Runner tokens, registry credentials: environment only (runner's `~/.zshrc` / Forgejo secrets). Nothing secret in the repo — same policy as Cloudflare (design/deployment.md).

## Artifacts distribution

TBD once the first workflow lands (Forgejo package registry vs. release assets vs. manual pull from the runner). Decision deferred — not needed until the workflows exist.
