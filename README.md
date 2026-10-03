<div align="center">

# Translate

</div>

<p align="center">
  <a href="https://github.com/lawlietr/translate/stargazers"><img src="https://img.shields.io/github/stars/lawlietr/translate?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/lawlietr/translate/releases"><img src="https://img.shields.io/github/v/release/lawlietr/translate?label=version&style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL_v3-blue?style=flat-square" alt="License"></a>
  <a href="https://github.com/lawlietr/translate/commits/DEV"><img src="https://img.shields.io/github/commit-activity/m/lawlietr/translate?style=flat-square" alt="Commits"></a>
  <a href="https://github.com/lawlietr/translate"><img src="https://img.shields.io/github/followers/lawlietr?style=flat-square&logo=GitHub" alt="Follow"></a>
  <a href="https://x.com/Lawlietr"><img src="https://img.shields.io/badge/follow-%40Lawlietr-1DA1F2?style=flat-square&logo=X" alt="Follow on X"></a>
</p>

<div align="center">
  <a href="README.md"><strong>🇹🇼 繁體中文</strong></a> · <a href="docs/README_EN.md">🇺🇸 English</a> · <a href="docs/README_KO.md">🇰🇷 한국어</a> · <a href="docs/README_JA.md">🇯🇵 日本語</a>
</div>

完全在本機瀏覽器運作的翻譯應用程式——把「Google 翻譯」搬到你的 WebGPU 上:輸入文字,小型多語系 LLM(ONNX 格式,經 `@huggingface/transformers`)在**你的 GPU** 上直接翻譯,結果顯示在輸出框。**文字永不離開瀏覽器**——沒有伺服器端處理、沒有追蹤、沒有外部請求(模型下載與自訂 llama-server 連線除外,皆為使用者主動啟用)。

## 線上演示

- **Cloudflare Pages**: [translate.avpclub.eu.org](https://translate.avpclub.eu.org)
- **Hugging Face Space**: [huggingface.co/spaces/lawlietr/translate](https://huggingface.co/spaces/lawlietr/translate)
- **GitHub Pages**: [lawlietr.github.io/translate](https://lawlietr.github.io/translate/)

首次使用請到「設定 → 推理」下載模型(約 1.38 GB 或 3.11 GB),之後完全離線運作。

## 功能

- **本機 WebGPU 推理** — 兩個可選模型,下載後完全離線運作
- **圖片翻譯** — 上傳圖片(JPG/PNG/WebP),視覺模型(VLM)一次完成「讀取圖中文字 + 翻譯」;辨識原文與翻譯分別填入輸入/輸出框(歷史、朗讀直接可用);視覺模型為選用(設定中下載),無相機/影片
- **語音朗讀(TTS)** — 喇叭圖示按需朗讀(永不自動),本地 Kokoro-82M(ONNX,WebGPU)或裝置內建語音;英文優先 Kokoro,其他語言用裝置語音;音訊不離開裝置
- **多語系** — UI:繁體中文 / 英文 / 日文 / 韓文;翻譯:英、繁中、簡中、日、韓、法、德、西
- **翻譯歷史** — 本機 localStorage,左側抽屜 100 筆、單刪/多選/全刪、點擊恢復、可於設定關閉紀錄
- **自訂 llama-server** — 設定中可填 OpenAI 相容端點,改由你自己的伺服器翻譯(選用)
- **深色/淺色主題** — 預設深色,右上角切換
- **活動日誌** — 設定 → 診斷,可看到完整的載入/下載/推理事件

## 模型

| 模型 | 大小 | 說明 |
|------|------|------|
| Hy-MT2 1.8B (Q4F16) | ~1.38 GB | 預設翻譯模型,輕量 GPU 也流暢 |
| TranslateGemma 4B (Q4) | ~3.11 GB | 較強的翻譯模型,建議較新 GPU |
| LFM2.5-VL-450M | ~0.77 GB | 選用:圖片翻譯的視覺模型(預設) |
| LFM2.5-VL-3B | ~3.72 GB | 選用:圖片翻譯的進階視覺模型 |
| Kokoro-82M (fp32) | ~0.33 GB | 選用:TTS 朗讀模型 |

翻譯模型可從**首頁頂部的模型區塊**(首次使用)或**設定 → 模型分頁**下載(Hugging Face,一律使用者主動);視覺模型與 TTS 模型為選用,只在設定中管理。下載進度可隨時中斷;檔案存在瀏覽器 Cache API,重開分頁不需重下。

## Docker 部署

映像為**多架構**(`linux/amd64` + `linux/arm64`)靜態映像(nginx + 首次啟動自動產生自簽 TLS),同時發佈在 **GitHub** 與 **Codeberg** 兩個 registry,內容完全相同:

```bash
# 二擇一
docker pull ghcr.io/lawlietr/translate:latest
docker pull codeberg.org/lawlietr/translate:latest

# 固定版本(以 commit sha 為 tag)
docker pull ghcr.io/lawlietr/translate:0df78d9
```

> 拉 `codeberg.org/lawlietr/translate` 需在該站建立帳號並以 `lawlietr:<PAT>` 登入(`docker login codeberg.org`);`ghcr.io` 的公開映像可免登入拉取。

### Docker Compose 部署

repo 附 `docker-compose.yml`(單容器、無 sidecar、無環境變數)。

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
# 拉映像(二擇一,見上)後,在 compose 檔所在目錄:
docker compose up -d          # 啟動

# 日常操作
docker compose ps             # 狀態(應顯示 healthy)
docker compose logs -f        # 跟 log
docker compose pull && docker compose up -d   # 更新映像
docker compose down           # 停止(保留 ./certs)
docker compose down -v        # 停止並移除 volume
```

> `image: translate:latest` 對應你拉下來的映像;若想直接用 registry 名稱,改成 `ghcr.io/lawlietr/translate:latest`(並可刪掉 `build: .`,本機沒有源碼時不需要 build)。

| 埠 | 用途 |
|----|------|
| `8080` | 一般 HTTP(loopback 使用;LAN 存取會因非安全內容被停用 WebGPU) |
| `8443` | **自簽 TLS — LAN 使用請走這個**(WebGPU 需要安全內容) |

- **憑證**:`./certs/` 首次啟動時由容器自動產生自簽憑證(SAN 含 `localhost` / `127.0.0.1` / `192.168.1.15`);要換正式憑證就把 `fullchain.pem` + `privkey.pem` 放進 `./certs/`,hook 偵測到已存在就不會再覆蓋
- LAN 用法:瀏覽器開 `https://<主機 IP>:8443`,對自簽憑證按「繼續」即可,WebGPU 正常可用
- 無環境變數、無 llama-server 容器——推理全部在用戶瀏覽器完成

## 本機建置

### 開發模式

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 3001
```

> 注意 `npm run dev` 後的 `--` 不可省,否則 npm 會把 `-H` 當成自己的參數而失敗。
> 開發機佔用的 3000 埠屬於其他服務,固定用 3001。

WebGPU 需要**安全內容**(`https://` 或 `localhost`):

```bash
# 從其他機器(LAN IP)測試時,用自簽 HTTPS 代理
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs
# → https://<開發機 LAN IP>:3443
```

### production 靜態導出(所有部署目標)

```bash
npm run build:export
# 產出在 /out,任何靜態伺服器都能 serve(nginx、Caddy、python3 -m http.server …)
```

導出後**必做檢查**:每個 wasm 檔必須 < 25 MiB(Cloudflare Pages 的單檔上限):

```bash
find out -name "*.wasm*" -exec du -h {} +
```

> 切勿升級 `@huggingface/transformers` 的版本——目前是**精確固定在 4.2.0**;4.3.0 會拉進超 25 MiB 的 wasm,build 過但 Cloudflare 上傳會 413。

## 開發

- 分支模型:`DEV` = 日常開發;`main` = 發布分支(push 觸發 GitHub Actions:雙架構 build → 推兩個 registry → 建 Release)
- `design/` — 每個工作單元的實作細節;`TODO.md` — 待辦與優先順序
- 瀏覽器自動化驗證:Playwright(production static export 上跑,dev server 有 DOM 殘節會造成誤判)

## 💗 支持這個專案

如果您覺得這個專案有用，可以請我喝一杯咖啡：

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mulderlee/tip)

## 授權

**AGPL-3.0**(見 `LICENSE`)。第三方元件保留各自授權(Next.js / MUI / transformers.js 等為 MIT/Apache,相容)。模型由使用者自行從 Hugging Face 下載,遵守模型自身條款,不隨本專案分發。
