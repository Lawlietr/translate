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
  <a href="README.md">🇹🇼 繁體中文</a> · <a href="README_EN.md">🇺🇸 English</a> · <a href="README_KO.md">🇰🇷 한국어</a> · <a href="README_JA.md"><strong>🇯🇵 日本語</strong></a>
</div>

**ブラウザ上で完全に動作する**翻訳アプリ — "Google 翻訳"を WebGPU で: テキストを入力すると、小さな多言語 LLM（ONNX 形式、`@huggingface/transformers` 経由）が**あなたの GPU** で翻訳し、結果が出力ボックスに表示されます。**テキストは絶対にブラウザから離れません** — サーバー側処理、追跡、外部リクエストはありません（モデルダウンロードとユーザー選択の llama-server 接続を除く）。

## ライブデモ

- **Cloudflare Pages**: [translate.avpclub.eu.org](https://translate.avpclub.eu.org)
- **Hugging Face Space**: [huggingface.co/spaces/lawlietr/translate](https://huggingface.co/spaces/lawlietr/translate)
- **GitHub Pages**: [lawlietr.github.io/translate](https://lawlietr.github.io/translate/)

初回使用時に**設定 → モデルタブ**からモデルをダウンロード（約 1.38 GB または 3.11 GB）; 以降は完全にオフラインで動作します。

## 機能

- **ローカル WebGPU 推論** — 2 つの選択可能モデル、ダウンロード後完全オフライン動作
- **画像翻訳** — 画像アップロード（JPG/PNG/WebP）; ビジョンモデル（VLM）が 1 回の推論でテキストを読み取り翻訳; 認識結果と翻訳が入力/出力ボックスに自動入力（履歴、読み上げ機能利用可能）; ビジョンモデルはオプション（設定でダウンロード）、カメラ/動画なし
- **音声合成（TTS）** — スピーカーアイコンで必要時読み上げ（自動なし）、ローカル Kokoro-82M（ONNX、WebGPU）またはデバイス標準音声; 英語は Kokoro 優先、他の言語はデバイス音声; オーディオはデバイスから離れない
- **多言語** — UI: 日本語 / 英語 / 韓国語 / 中国語（繁体）; 翻訳: EN, ja, ko, zh-TW, zh-CN, FR, DE, ES
- **翻訳履歴** — ローカル localStorage のみ使用、左側ドローワー 100 件、単一/複数/全削除、クリックで復元、設定で履歴無効化可能
- **カスタム llama-server** — 設定で OpenAI 互換エンドポイントを指定して自分のサーバーで翻訳（オプション）
- **ダーク/ライトテーマ** — ダーク標準、右上ヘッダーで切り替え
- **アクティビティログ** — 設定 → 診断、すべてのロード/ダウンロード/推論イベントを表示

## モデル

| モデル | サイズ | 説明 |
|------|------|------|
| Hy-MT2 1.8B (Q4F16) | ~1.38 GB | デフォルト翻訳モデル、低スペック GPU でもスムーズ動作 |
| TranslateGemma 4B (Q4) | ~3.11 GB | より強力な翻訳モデル、最新 GPU 推奨 |
| LFM2.5-VL-450M | ~0.77 GB | オプション: 画像翻訳用ビジョンモデル（標準） |
| LFM2.5-VL-3B | ~3.72 GB | オプション: 上級画像翻訳用ビジョンモデル |
| Kokoro-82M (fp32) | ~0.33 GB | オプション: TTS 読み上げモデル |

翻訳モデルは**ホーム画面トップのモデルブロック**（初回使用時）または**設定 → モデルタブ**（Hugging Face、常にユーザー開始）からダウンロードできます; ビジョンモデルと TTS モデルはオプションで設定でのみ管理されます。ダウンロード進行状況を確認でき、いつでもキャンセルできます。ファイルはブラウザの Cache API に保存 — タブを再度開いても再ダウンロード不要。

## Docker デプロイ

イメージは**マルチアーキテクチャ**（`linux/amd64` + `linux/arm64`）静的イメージ（nginx + 初回起動時に自己署名 TLS 生成）で、**GitHub** と **Codeberg** の 2 つのレジストリに同一内容で公開されています:

```bash
# どちらか選択
docker pull ghcr.io/lawlietr/translate:latest
docker pull codeberg.org/lawlietr/translate:latest

# 固定バージョン（コミット sha でタグ）
docker pull ghcr.io/lawlietr/translate:0df78d9
```

> `codeberg.org/lawlietr/translate` からプルするには、同サイトにアカウントが必要で `lawlietr:<PAT>` でログインする必要があります（`docker login codeberg.org`）; `ghcr.io` の公開イメージは認証なしでプル可能。

### Docker Compose

リポジトリには `docker-compose.yml` が同梱されています（単一コンテナ、サイドカーなし、環境変数なし）。

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
# イメージプル後（上記参照）、compose ファイルがあるディレクトリで:
docker compose up -d          # 起動

# 日常操作
docker compose ps             # 状態（healthy と表示されるはず）
docker compose logs -f        # ログフォロー
docker compose pull && docker compose up -d   # イメージ更新
docker compose down           # 停止（./certs を維持）
docker compose down -v        # 停止とボリューム削除
```

> `image: translate:latest` はあなたがプルしたイメージを参照します; レジストリ名を直接使用するには `ghcr.io/lawlietr/translate:latest` に変更し（ソースがない場合は `build: .` を削除可能）、`build: .` を削除できます。

| ポート | 用途 |
|------|------|
| `8080` | 通常 HTTP（ループバック用; LAN アクセスはセキュアコンテキストではないため WebGPU 無効化） |
| `8443` | **自己署名 TLS — LAN アクセス用**（WebGPU はセキュアコンテキストが必要） |

- **証明書**: `./certs/` は初回起動時に自己署名証明書で自動設定されます（SAN に `localhost` / `127.0.0.1` / `192.168.1.15` を含む）; 実際の証明書を使用するには `fullchain.pem` + `privkey.pem` を `./certs/` に配置してください — フックが既存ファイルを検知すると上書きしません
- LAN 使用: ブラウザで `https://<ホスト IP>:8443` を開き、自己署名証明書を受容すると WebGPU が動作
- 環境変数なし、llama-server コンテナなし — すべての推論はユーザーブラウザ上で実行

## ローカルビルド

### 開発モード

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 3001
```

> `npm run dev` 後の `--` は必須です; ないと npm が `-H` を自身のフラグとして解釈して失敗します。
> 開発機のポート 3000 は他のサービスに割り当てられています; 3001 が慣例的に使用されます。

WebGPU は**セキュアコンテキスト**（`https://` または `localhost`）が必要です:

```bash
# 他のマシン（LAN IP）からテスト時 — 自己署名 HTTPS プロキシを使用
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs
# → https://<開発機 LAN IP>:3443
```

### プロダクション静的エクスポート（すべてのデプロイ対象）

```bash
npm run build:export
# /out に出力 — 静的サーバーで serve（nginx, Caddy, python3 -m http.server など）
```

**エクスポート後の必須確認**: すべての wasm ファイルは 25 MiB 未満である必要があります（Cloudflare Pages のファイルあたりアップロード制限）:

```bash
find out -name "*.wasm*" -exec du -h {} +
```

> `@huggingface/transformers` をアップグレードしないでください — **正確に 4.2.0 に固定**されています; 4.3.0 は 25 MiB を超える wasm を読み込み、ビルドは成功しますが Cloudflare アップロードで 413 エラーが発生。

## 開発

- ブランチモデル: `DEV` = 日常開発; `main` = リリースブランチ（プッシュ時に GitHub Actions トリガー: マルチアーキテクチャビルド → 2 つのレジストリにプッシュ → Release 作成）
- `design/` — 各作業単位の詳細; `TODO.md` — 保留中の作業と優先順位
- ブラウザ自動テスト: Playwright（プロダクション静的エクスポートで実行 — dev サーバーには DOM ゴーストがあり誤った失敗が発生）

## 💗 サポート

このプロジェクトが役に立った場合、開発をサポートしてください:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mulderlee/tip)

## ライセンス

**AGPL-3.0**（`LICENSE` 参照）。サードパーティコンポーネントはそれぞれのライセンスを維持します（Next.js / MUI / transformers.js などは MIT/Apache — 互換）。モデルはユーザーが Hugging Face から直接ダウンロードし、モデル自体の規約に従い、このプロジェクトとは配布されません。
