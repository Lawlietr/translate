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
  <a href="README.md">🇹🇼 繁體中文</a> · <a href="README_EN.md">🇺🇸 English</a> · <a href="README_KO.md"><strong>🇰🇷 한국어</strong></a> · <a href="README_JA.md">🇯🇵 日本語</a>
</div>

**내 브라우저에서 완전히 실행되는** 번역 앱 — "Google Translate"를 WebGPU로: 텍스트를 입력하면 작은 다국어 LLM(ONNX 형식, `@huggingface/transformers` 경유)이 **당신의 GPU**에서 번역하고, 결과가 출력 박스에 표시됩니다. **텍스트는 절대 브라우저를 떠나지 않습니다** — 서버 측 처리, 추적, 외부 요청이 없습니다(모델 다운로드와 사용자 선택 llama-server 연결 제외).

## 라이브 데모

- **Cloudflare Pages**: [translate.avpclub.eu.org](https://translate.avpclub.eu.org)
- **Hugging Face Space**: [huggingface.co/spaces/lawlietr/translate](https://huggingface.co/spaces/lawlietr/translate)
- **GitHub Pages**: [lawlietr.github.io/translate](https://lawlietr.github.io/translate/)

처음 사용 시 **설정 → 모델 탭**에서 모델 다운로드(~1.38 GB 또는 3.11 GB); 이후 완전히 오프라인으로 작동합니다.

## 기능

- **로컬 WebGPU 추론** — 두 가지 선택 가능한 모델, 다운로드 후 완전 오프라인 작동
- **이미지 번역** — 이미지 업로드(JPG/PNG/WebP); 비전 모델(VLM)이 한 번의 추론으로 텍스트를 읽고 번역; 인식 결과와 번역이 입력/출력 박스에 채워짐(기록, 읽기 기능 사용 가능); 비전 모델은 선택 사항(설정에서 다운로드), 카메라/영상 없음
- **음성 합성(TTS)** — 스피커 아이콘으로 필요시 읽기(자동 없음), 로컬 Kokoro-82M(ONNX, WebGPU) 또는 장치 기본 음성; 영어는 Kokoro 우선, 다른 언어는 장치 음성; 오디오는 장치에서 떠나지 않음
- **다국어** — UI: 한국어 / 영어 / 일본어 / 중국어(번체); 번역: EN, ko, ja, zh-TW, zh-CN, FR, DE, ES
- **번역 기록** — 로컬 localStorage만 사용, 왼쪽 서랍 100개 항목, 단일/다중/전체 삭제, 클릭으로 복원, 설정에서 기록 비활성화 가능
- **사용자 정의 llama-server** — 설정에서 OpenAI 호환 엔드포인트를 지정하여 자신의 서버로 번역(선택 사항)
- **다크/라이트 테마** — 다크 기본, 우측 상단 헤더에서 전환
- **활동 로그** — 설정 → 진단, 모든 로드/다운로드/추론 이벤트 표시

## 모델

| 모델 | 크기 | 설명 |
|------|------|------|
| Hy-MT2 1.8B (Q4F16) | ~1.38 GB | 기본 번역 모델, 저사양 GPU에서도 부드럽게 작동 |
| TranslateGemma 4B (Q4) | ~3.11 GB | 더 강력한 번역 모델, 최신 GPU 권장 |
| LFM2.5-VL-450M | ~0.77 GB | 선택 사항: 이미지 번역용 비전 모델(기본) |
| LFM2.5-VL-3B | ~3.72 GB | 선택 사항: 고급 이미지 번역용 비전 모델 |
| Kokoro-82M (fp32) | ~0.33 GB | 선택 사항: TTS 읽기 모델 |

번역 모델은 **홈 화면 상단의 모델 블록**(처음 사용 시) 또는 **설정 → 모델 탭**(Hugging Face, 항상 사용자 시작)에서 다운로드할 수 있습니다; 비전 모델과 TTS 모델은 선택 사항이며 설정에서만 관리됩니다. 다운로드 진행 상황을 확인할 수 있고 언제든지 취소할 수 있습니다. 파일은 브라우저의 Cache API에 저장됨 — 탭을 다시 열어도 다시 다운로드할 필요 없음.

## Docker 배포

이미지는 **멀티 아키텍처**(`linux/amd64` + `linux/arm64`) 정적 이미지(nginx + 첫 부팅 시 자체 서명 TLS 생성)이며, **GitHub**와 **Codeberg** 두 레지스트리에 동일한 내용으로 게시됩니다:

```bash
# 둘 중 하나 선택
docker pull ghcr.io/lawlietr/translate:latest
docker pull codeberg.org/lawlietr/translate:latest

# 고정 버전 (커밋 sha로 태그)
docker pull ghcr.io/lawlietr/translate:0df78d9
```

> `codeberg.org/lawlietr/translate`에서 풀하려면 해당 사이트에 계정이 필요하며 `lawlietr:<PAT>`로 로그인해야 합니다(`docker login codeberg.org`); `ghcr.io` 공개 이미지는 인증 없이 풀 수 있습니다.

### Docker Compose

저장소에는 `docker-compose.yml`이 포함되어 있습니다(단일 컨테이너, 사이드카 없음, 환경 변수 없음).

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
# 이미지 풀 후(위 참조), compose 파일이 있는 디렉토리에서:
docker compose up -d          # 시작

# 일상적인 작업
docker compose ps             # 상태 (healthy 표시해야 함)
docker compose logs -f        # 로그 follow
docker compose pull && docker compose up -d   # 이미지 업데이트
docker compose down           # 중지 (./certs 유지)
docker compose down -v        # 중지 및 볼륨 제거
```

> `image: translate:latest`는 당신이 풀한 이미지를 참조합니다; 레지스트리 이름을 직접 사용하려면 `ghcr.io/lawlietr/translate:latest`로 변경하고(소스가 없으면 `build: .` 제거 가능) `build: .`을 제거할 수 있습니다.

| 포트 | 용도 |
|------|------|
| `8080` | 일반 HTTP(루프백용; LAN 접근은 보안 컨텍스트가 아니어서 WebGPU 비활성화) |
| `8443` | **자체 서명 TLS — LAN 접근용으로 사용** (WebGPU는 보안 컨텍스트 필요) |

- **인증서**: `./certs/`는 첫 부팅 시 자체 서명 인증서로 자동 채워짐(SAN에 `localhost` / `127.0.0.1` / `192.168.1.15` 포함); 실제 인증서를 사용하려면 `fullchain.pem` + `privkey.pem`을 `./certs/`에 넣으세요 — 훅이 기존 파일을 감지하면 덮어쓰지 않음
- LAN 사용: 브라우저에서 `https://<호스트 IP>:8443`을 열고, 자체 서명 인증서를 수락하면 WebGPU 작동
- 환경 변수 없음, llama-server 컨테이너 없음 — 모든 추론은 사용자 브라우저에서 실행됨

## 로컬 빌드

### 개발 모드

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 3001
```

> `npm run dev` 뒤의 `--`는 필수입니다; 없으면 npm이 `-H`를 자신의 플래그로 해석하여 실패합니다.
> 개발机의 포트 3000은 다른 서비스에 할당되어 있습니다; 3001이 관례적으로 사용됩니다.

WebGPU는 **보안 컨텍스트**(`https://` 또는 `localhost`)가 필요합니다:

```bash
# 다른 기기(LAN IP)에서 테스트 시 — 자체 서명 HTTPS 프록시 사용
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs
# → https://<개발기 LAN IP>:3443
```

### 프로덕션 정적 내보내기 (모든 배포 대상)

```bash
npm run build:export
# /out에 출력 — 정적 서버로 serve(nginx, Caddy, python3 -m http.server 등)
```

**반드시 내보내기 후 확인**: 모든 wasm 파일은 25 MiB 미만이어야 합니다(Cloudflare Pages의 파일당 업로드 제한):

```bash
find out -name "*.wasm*" -exec du -h {} +
```

> `@huggingface/transformers`를 업그레이드하지 마세요 — **정확히 4.2.0에 고정**되어 있습니다; 4.3.0은 25 MiB 초과 wasm을 가져오며 빌드는 성공하지만 Cloudflare 업로드에서 413 에러 발생.

## 개발

- 브랜치 모델: `DEV` = 일상 개발; `main` = 릴리스 브랜치(푸시 시 GitHub Actions 트리거: 멀티 아키텍처 빌드 → 두 레지스트리 푸시 → Release 생성)
- `design/` — 각 작업 단위의 구현 세부 사항; `TODO.md` — 보류 중 작업 및 우선순위
- 브라우저 자동화 테스트: Playwright(프로덕션 정적 내보내기로 실행 — dev 서버에는 DOM 고스트가 있어 잘못된 실패 발생)

## 💗 지원

이 프로젝트가 유용하다면 개발을 지원하는 것을 고려해 주세요:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mulderlee/tip)

## 라이선스

**AGPL-3.0**(`LICENSE` 참조). 서드파티 구성 요소는 자체 라이선스를 유지합니다(Next.js / MUI / transformers.js 등은 MIT/Apache — 호환). 모델은 사용자가 Hugging Face에서 직접 다운로드하며 모델 자체의 약관을 따르고 이 프로젝트와 함께 배포되지 않습니다.
