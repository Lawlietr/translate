# Translate

[繁體中文](README.md) · [English](README_EN.md)

A translation app that runs **entirely in your browser** — "Google Translate" on your own WebGPU: type text, a small multilingual LLM (ONNX format, via `@huggingface/transformers`) translates it **on your GPU**, and the result appears in the output box. **Your text never leaves the browser** — no server-side processing, no tracking, no external requests (except user-initiated model downloads and an optional custom llama-server connection).

## Live Demos

- **Cloudflare Pages**: [translate.avpclub.eu.org](https://translate.avpclub.eu.org)
- **Hugging Face Space**: [huggingface.co/spaces/lawlietr/translate](https://huggingface.co/spaces/lawlietr/translate)
- **GitHub Pages**: [lawlietr.github.io/translate](https://lawlietr.github.io/translate/)

On first use, download a model from Settings → Inference (~1.38 GB or 3.11 GB); afterwards the app works fully offline.

## Features

- **Local WebGPU inference** — two selectable models, fully offline once downloaded
- **Multilingual** — UI: Traditional Chinese / English / Japanese / Korean; translation: EN, zh-TW, zh-CN, JA, KO, FR, DE, ES
- **Translation history** — local localStorage only, left drawer with 100 entries, single/multi/clear-all deletion, click-to-restore, recording can be disabled in Settings
- **Custom llama-server** — point an OpenAI-compatible endpoint in Settings to translate via your own server (optional)
- **Dark/light theme** — dark by default, toggle in the top-right header
- **Activity log** — Settings → Diagnostics, showing all load/download/inference events

## Models

| Model | Size | Notes |
|-------|------|-------|
| Hy-MT2 1.8B (Q4F16) | ~1.38 GB | Default, smooth even on modest GPUs |
| TranslateGemma 4B (Q4) | ~3.11 GB | Stronger, better on newer GPUs |

Models are downloaded **only from Settings (Inference tab)** (Hugging Face, user-initiated); downloads show progress and can be cancelled at any time. Files are stored in the browser's Cache API — no re-download after reopening a tab.

## Docker Deployment

Images are **multi-arch** (`linux/amd64` + `linux/arm64`) static images (nginx + self-signed TLS generated on first boot), published with identical content to **both** the GitHub and Codeberg registries:

```bash
# pick one
docker pull ghcr.io/lawlietr/translate:latest
docker pull codeberg.org/lawlietr/translate:latest

# pinned version (tagged by commit sha)
docker pull ghcr.io/lawlietr/translate:0df78d9
```

> Pulling from `codeberg.org/lawlietr/translate` requires an account there and a login as `lawlietr:<PAT>` (`docker login codeberg.org`); `ghcr.io` public images can be pulled without authentication.

### Docker Compose

The repo ships a `docker-compose.yml` (single container, no sidecar, no environment variables).

```yaml
services:
  translate:
    image: translate:latest
    build: .
    ports:
      - "8080:80"
      - "8443:443"
    volumes:
      - ./certs:/etc/nginx/certs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:80/"]
      interval: 30s
      timeout: 5s
      retries: 3
```

```bash
# after pulling an image (see above), in the directory containing the compose file:
docker compose up -d          # start

# day-to-day
docker compose ps             # status (should show healthy)
docker compose logs -f        # follow logs
docker compose pull && docker compose up -d   # update image
docker compose down           # stop (keeps ./certs)
docker compose down -v        # stop and remove the volume
```

> `image: translate:latest` refers to the image you pulled; to use the registry name directly, change it to `ghcr.io/lawlietr/translate:latest` (and you may drop `build: .` — no build is needed when you don't have the source).

| Port | Purpose |
|------|---------|
| `8080` | Plain HTTP (loopback use; LAN access disables WebGPU because it isn't a secure context) |
| `8443` | **Self-signed TLS — use this for LAN access** (WebGPU requires a secure context) |

- **Certificate**: `./certs/` is auto-populated with a self-signed certificate on first boot (SANs include `localhost` / `127.0.0.1` / `192.168.1.15`); to use a real certificate, put `fullchain.pem` + `privkey.pem` in `./certs/` — the hook detects existing files and won't overwrite them
- LAN usage: open `https://<host IP>:8443` in your browser, accept the self-signed certificate, and WebGPU works
- No environment variables, no llama-server container — all inference runs in the user's browser

## Building Locally

### Development mode

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 3001
```

> The `--` after `npm run dev` is required; without it npm parses `-H` as its own flag and fails.
> Port 3000 on the dev machine belongs to another service; 3001 is used by convention.

WebGPU requires a **secure context** (`https://` or `localhost`):

```bash
# testing from another machine (LAN IP) — use the self-signed HTTPS proxy
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs
# → https://<dev-machine LAN IP>:3443
```

### Production static export (all deployment targets)

```bash
npm run build:export
# output in /out — serve it with any static server (nginx, Caddy, python3 -m http.server, …)
```

**Mandatory post-export check**: every wasm file must be < 25 MiB (Cloudflare Pages' per-file upload cap):

```bash
find out -name "*.wasm*" -exec du -h {} +
```

> Do NOT upgrade `@huggingface/transformers` — it is **pinned exactly at 4.2.0**; 4.3.0 pulls in a > 25 MiB wasm that builds fine but fails the Cloudflare upload with 413.

## Development

- Branch model: `DEV` = daily development; `main` = release branch (pushing triggers GitHub Actions: multi-arch build → push both registries → create Release)
- `design/` — implementation details per work unit; `TODO.md` — pending work and priorities
- Browser automation testing: Playwright (run against the production static export — the dev server has DOM ghosts that cause false failures)

## License

**AGPL-3.0** (see `LICENSE`). Third-party components keep their own licenses (Next.js / MUI / transformers.js etc. are MIT/Apache — compatible). Models are downloaded by users themselves from Hugging Face under the models' own terms and are not distributed with this project.
