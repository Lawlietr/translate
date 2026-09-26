# Windows 11 WebView2 wrapper (TODO #10)

C# .NET 8 WinForms launcher for the translate app. See `design/local-deployment.md` §Target 1 for the full architecture and sub-tasks 10a–10d.

**Status: 10a (launcher skeleton) — code written, not yet compiled/run** (needs a Windows machine; rule 11: no toolchain installs/compiles on the dev box; 10c adds the GitHub Actions build).

## Layout

| File | Role |
|------|------|
| `translate-wrapper.csproj` | `net8.0-windows` WinExe, `Microsoft.Web.WebView2` pinned to 1.0.4191.47 |
| `program.cs` | Entry point: load config → start server (managed mode) → window or headless loop |
| `app-config.cs` | `config.json` read/create next to the exe (snake_case keys, first-run defaults) |
| `server-process.cs` | node child process for `server.js` (managed mode) + env wiring + kill-on-exit |
| `main-form.cs` | WinForms window: WebView2 → `http://127.0.0.1:<port>`, port-ready poll, status bar |

## config.json (created on first run, next to the exe)

| key | default | meaning |
|-----|---------|---------|
| `bind_ip` | `0.0.0.0` | address the node server binds (LAN devices can reach it; their WebGPU status follows the TLS rule) |
| `port` | `8321` | server port |
| `open_view` | `true` | `false` = headless (serve only, Ctrl+C to stop) |
| `server_mode` | `external` | `external` = use an already-running server (10a dev); `managed` = launcher spawns `node server.js` (10b) |
| `node_path` | `""` | (managed mode) path to the node binary — 10b points this at the extracted embedded runtime |
| `app_dir` | `""` | (managed mode) directory containing the Next.js standalone `server.js` |
| `llama_base_url` | `""` | API shim → llama-server endpoint (TODO #19) |
| `model_preset` | `auto` | `auto` / `hy-mt2` / `translategemma` / `generic` |
| `system_prompt` | `""` | custom system prompt (profile restrictions per #17) |
| `api_token` | `""` | bearer token for LAN-exposed shim (empty = loopback only) |

Changes require a restart (kept simple by design).

## 10a dev workflow (on a Windows machine, no CI)

1. Install the .NET 8 SDK.
2. `cd wrapper && dotnet run` — `config.json` is created under `bin/Debug/net8.0-windows/`.
3. Point it at the dev box: edit `config.json` → `"server_mode": "external"`, `"port": 3001` (dev server must be reachable at that host:port; for cross-machine dev, set `bind_ip`/`port` to match the reachable server).
4. Window opens → WebView shows the translate app at `http://127.0.0.1:<port>`.
5. Managed-mode smoke test (optional, pre-10b): run `npm run build` (standalone) on Windows, then `"server_mode": "managed"`, `node_path` = a local `node.exe`, `app_dir` = the `standalone/` output dir → the launcher spawns and kills the server itself.

## Notes

- Build/publish happens on GitHub Actions `windows-latest` (10c, D5) — `dotnet publish -r win-x64 --self-contained`.
- WebView2 Evergreen Runtime is preinstalled on Windows 11; no extra install.
- First bind to `0.0.0.0` triggers the Windows Firewall prompt (expected).
- WebView2 browser data lives in `%LOCALAPPDATA%\<exe-name>\WebView2` (Cache API model files included).
