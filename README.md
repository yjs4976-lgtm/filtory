# 🛡️ Filtory

> **Filtory**는 피부과, 안과, 치과처럼 리뷰 의존도가 높은 생활 의료 분야를 대상으로
> 리뷰 신뢰도, 광고성 문구, 온라인 정보 완성도, 외국인 친화도를 분석하는 **AI 기반 리뷰·정보 분석 서비스**입니다.

---

## 📌 Project Overview

온라인 리뷰는 병원 선택에 큰 영향을 주지만, 광고성 후기나 반복적으로 작성된 리뷰로 인해 사용자가 정보를 객관적으로 판단하기 어려운 경우가 많습니다.

**Filtory**는 리뷰를 단순히 “진짜/가짜”로 단정하지 않고,
리뷰의 구체성, 광고성 문구, 반복 패턴, 과장 표현 등을 종합적으로 분석하여 사용자가 병원을 선택할 때 참고할 수 있는 정보를 제공합니다.

또한 네이버 플레이스 정보 완성도와 구글맵 기반 외국인 친화도까지 함께 분석하여
국내 사용자와 외국인 사용자 모두가 병원 정보를 더 쉽게 이해할 수 있도록 돕는 것을 목표로 합니다.

---

## 🧭 Service Direction

초기 기획은 단순한 가짜 리뷰 탐지 서비스였지만, 최종 방향은 아래와 같이 확장되었습니다.

* 리뷰 신뢰도 분석
* 광고성 리뷰 가능성 분석
* 네이버 플레이스 정보 완성도 분석
* 구글맵 기반 외국인 친화도 분석
* 한국어/영어 자동 번역 지원

Filtory는 리뷰의 진위 여부를 확정하는 서비스가 아니라,
**리뷰와 온라인 정보의 신뢰도를 분석하고 사용자의 판단을 돕는 보조 서비스**입니다.

---

## 🏥 Target Categories

초기 MVP에서는 모든 업종을 대상으로 하지 않고, 리뷰 의존도가 높은 생활 의료 분야 3가지를 우선 지원합니다.

| 분야  | 선택 이유                                |
| --- | ------------------------------------ |
| 피부과 | 미용시술, 피부질환, 이벤트성 리뷰, 광고성 후기 비중이 높음   |
| 안과  | 라식, 라섹, 스마일라식 등 병원 선택 전 리뷰와 신뢰도가 중요함 |
| 치과  | 임플란트, 교정, 사랑니, 충치치료 등 비용과 선택 부담이 큼   |

---

## ✨ Main Features

* 피부과 / 안과 / 치과 분야 선택
* 병원명 및 네이버 플레이스 링크 입력
* 리뷰 텍스트 입력 및 AI 분석
* 리뷰 신뢰도 점수 제공
* 광고성 문구 의심 탐지
* 반복 리뷰 패턴 분석
* 네이버 플레이스 정보 완성도 체크
* 구글맵 기반 외국인 친화도 분석
* 한국어 / 영어 모드 전환
* 영어 리뷰 자동 한국어 번역
* 분석 결과 저장 및 최근 분석 기록 확인

---

## 🧠 AI Analysis Strategy

Filtory는 리뷰를 단순히 “진짜 리뷰” 또는 “가짜 리뷰”로 판정하지 않습니다.
대신 여러 분석 기준을 바탕으로 리뷰의 신뢰도와 의심 요소를 점수화합니다.

### Review Analysis Criteria

```text
1. 광고성 문구 여부
2. 과장 표현 여부
3. 구체적인 방문 경험 포함 여부
4. 반복 문장 및 유사 패턴 여부
5. 문장 자연스러움 여부
6. 분야별 키워드와 리뷰 내용의 적합성
```

### Place Information Criteria

```text
1. 병원명 등록 여부
2. 주소 및 전화번호 등록 여부
3. 진료 항목 설명 여부
4. 병원 소개글 완성도
5. 사진 및 영상 등록 여부
6. 홈페이지 또는 예약 링크 연결 여부
```

### Foreigner-Friendly Criteria

```text
1. 구글맵 등록 여부
2. 영문 병원명 제공 여부
3. 네이버 플레이스 주소와 구글맵 주소 일치 여부
4. 영어 리뷰 존재 여부
5. 영어 안내 또는 홈페이지 제공 여부
6. 외국인 사용자가 병원을 찾기 쉬운 정도
```

---

## 📊 Analysis Score

Filtory는 여러 분석 결과를 종합하여 점수를 제공합니다.

| 점수 항목       | 설명                             |
| ----------- | ------------------------------ |
| 리뷰 신뢰도 점수   | 리뷰가 실제 경험에 기반한 것처럼 보이는지 분석     |
| 광고성 가능성 점수  | 홍보성 문구와 과장 표현이 얼마나 많은지 분석      |
| 플레이스 완성도 점수 | 네이버 플레이스 정보가 얼마나 잘 등록되어 있는지 분석 |
| 외국인 친화도 점수  | 구글맵과 영어 정보가 얼마나 잘 준비되어 있는지 분석  |
| 종합 점수       | 전체 분석 결과를 합산한 최종 점수            |

---

## 🧾 Analysis Result Example

```json
{
  "hospital_name": "예시피부과",
  "category": "피부과",
  "total_score": 78,
  "trust_score": 82,
  "ad_score": 35,
  "place_score": 76,
  "foreigner_score": 60,
  "trust_level": "신뢰 가능",
  "summary": "리뷰에 상담 과정과 방문 경험이 일부 포함되어 있어 신뢰도가 보통 이상으로 분석되었습니다.",
  "evidence": {
    "ad_phrases": ["이벤트", "강력 추천"],
    "specific_phrases": ["상담 시간이 길었고", "대기 시간이 20분 정도였습니다"],
    "warning": "일부 홍보성 표현이 포함되어 추가 확인이 필요합니다."
  }
}
```

---

## 🏗️ Project Architecture

```text
/filtory
│
├── /frontend                 # [Next.js] 사용자 화면
│   ├── /src
│   │   ├── /app              # 페이지 라우팅
│   │   ├── /components       # 재사용 UI 컴포넌트
│   │   ├── /services         # API 통신 로직
│   │   └── /styles           # 전역 스타일 및 테마
│   ├── .env.local            # 프론트엔드 환경변수
│   └── package.json
│
├── /backend-main             # [Flask] 메인 백엔드 서버
│   ├── /app
│   │   ├── /api              # Controller / API 라우트
│   │   ├── /services         # 비즈니스 로직
│   │   ├── /repositories     # 데이터 접근 로직
│   │   ├── /models           # 데이터 모델
│   │   ├── /schemas          # 요청/응답 데이터 검증
│   │   └── /utils            # 공통 유틸 함수
│   ├── .env                  # 백엔드 환경변수
│   ├── requirements.txt
│   └── run.py
│
├── /backend-ai               # [FastAPI] AI 분석 서버
│   ├── /app
│   │   ├── main.py           # FastAPI 실행 파일
│   │   ├── /services         # LLM 분석 및 점수 계산 로직
│   │   ├── /schemas          # Pydantic 데이터 검증
│   │   └── /utils            # AI 분석 보조 함수
│   ├── .env                  # AI 서버 환경변수
│   └── requirements.txt
│
├── /docs                     # 기획 자료, ERD, 화면 설계 등
├── .gitignore
└── README.md
```

---

## 🛠 Tech Stack

### Frontend

* Next.js
* React
* CSS / Module CSS

### Backend

* Flask
* SQLAlchemy

### AI Server

* FastAPI
* LLM 기반 리뷰 분석
* 규칙 기반 점수 계산
* 유사도 기반 반복 패턴 분석
* 한국어/영어 번역 처리

### Collaboration

* GitHub
* Notion
* Supabase
* Figma

---

## 🛠 Project Setup

> 프로젝트를 처음 clone 받은 후 각 폴더에서 필요한 설정을 진행합니다.

### 0. Clone

```bash
git clone https://github.com/yjs4976-lgtm/filtory.git
cd filtory
```

---

### 1. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

---

### 2. Backend-main Setup

```bash
cd backend-main

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

---

### 3. Backend-ai Setup

```bash
cd backend-ai

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🔐 Environment Variables

`.env` 파일은 보안상 GitHub에 업로드하지 않습니다.

필요한 환경변수 이름과 용도는 Notion에 정리하고, 실제 값은 각자 로컬 환경에서 관리합니다.

```text
# frontend
NEXT_PUBLIC_API_BASE_URL=

# backend-main
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROFILE_IMAGE_BUCKET=profile-images
JWT_SECRET_KEY=
ENABLE_REMOTE_CHATBOT=false
AI_CHATBOT_API_URL=http://127.0.0.1:8000/api/chatbot/message
AI_CHATBOT_TIMEOUT_SECONDS=12
AI_INTERNAL_TOKEN=
CHATBOT_REMOTE_AI_RATE_LIMIT_WINDOW_SECONDS=60
CHATBOT_REMOTE_AI_RATE_LIMIT_MAX_REQUESTS=10
KAKAO_REST_API_KEY=
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
HOSPITAL_SEARCH_TIMEOUT_SECONDS=4
HOSPITAL_SEARCH_CACHE_TTL_SECONDS=300

# backend-ai
LLM_API_KEY=
LLM_MODEL=
TRANSLATION_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ENABLE_GEMINI_CHATBOT=false
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GEMINI_TIMEOUT_SECONDS=10
GEMINI_MAX_RETRIES=0
AI_INTERNAL_TOKEN=
```

### Gemini Chatbot Safety Notes

Gemini 챗봇은 `backend-main`의 `ENABLE_REMOTE_CHATBOT=true`와 `backend-ai`의 `ENABLE_GEMINI_CHATBOT=true`가 모두 활성화된 경우에만 사용합니다.

운영 배포 시 `backend-ai`의 챗봇 API는 외부 직접 노출을 피하고, `backend-main` 같은 내부 서버에서만 접근하도록 구성해야 합니다. `AI_INTERNAL_TOKEN`을 양쪽 서버에 같은 값으로 설정하면 `backend-main`이 `X-Internal-Token` 헤더를 보내고 `backend-ai`가 이를 검증합니다.

스크린샷 OCR API는 Gemini 호출 비용이 발생할 수 있으므로 `backend-main`과 `backend-ai`에 같은 `AI_INTERNAL_TOKEN` 값을 반드시 설정해야 합니다.

Gemini 호출 비용이 발생할 수 있으므로 `backend-main`은 로그인된 사용자에게만 Gemini fallback을 허용하고, `CHATBOT_REMOTE_AI_RATE_LIMIT_WINDOW_SECONDS`와 `CHATBOT_REMOTE_AI_RATE_LIMIT_MAX_REQUESTS`로 사용자별 원격 AI 호출 수를 제한합니다. 비로그인 사용자는 기존 규칙 기반 챗봇 답변만 사용합니다.

사용자가 전달한 분석 컨텍스트는 Gemini 호출 전에 서버에서 허용 필드만 남기도록 필터링합니다. 리뷰 원문, 전화번호, 이메일, 상세 주소 같은 개인정보성 값은 AI 서버로 전달하지 않는 방향을 유지합니다.

---

## 🔄 Branch Strategy

```text
main    : 최종 발표 및 배포용 브랜치
dev     : 개발 통합 브랜치
yjs : 유진설 작업 브랜치
jjh : 조정화 작업 브랜치
```

---

## 🤝 Collaboration Rule

### 작업 시작 전

```bash
git switch dev
git pull origin dev

git switch 본인브랜치명
git merge dev
```

### 작업 완료 후

```bash
git add .
git commit -m "Feat: 작업 내용 작성"
git push origin 본인브랜치명
```

작업 완료 후 GitHub에서 Pull Request를 생성합니다.

```text
base: dev
compare: 본인 작업 브랜치
```

PR 검토 후 `dev` 브랜치에 병합합니다.

---

## 📜 Commit Convention

```text
Feat     : 새로운 기능 추가
Fix      : 버그 수정
Docs     : 문서 수정
Style    : 코드 포맷팅, 세미콜론 누락 등 코드 변경이 없는 경우
Refactor : 코드 리팩토링
Test     : 테스트 코드 추가 및 수정
Chore    : 기타 설정, 패키지, 빌드 관련 작업
Design   : UI/CSS 디자인 변경
Comment  : 주석 추가 및 수정
Init     : 프로젝트 초기 생성
Rename   : 파일 또는 폴더명 수정
Remove   : 파일 삭제
```

### Commit Message Example

```bash
git commit -m "Feat: 리뷰 분석 API 구현"
git commit -m "Design: 분석 결과 페이지 UI 수정"
git commit -m "Docs: README 프로젝트 구조 수정"
```

---

## ⚠️ Pull Request Rule

1. PR은 반드시 `dev` 브랜치로 보냅니다.
2. `main` 브랜치에 직접 push하지 않습니다.
3. 하나의 PR에는 하나의 기능 또는 작업 단위만 포함합니다.
4. PR 병합 전 로컬 실행 테스트를 진행합니다.

```text
base: dev
compare: 본인 작업 브랜치
```

---

## 📝 Notes

* `.env` 파일은 GitHub에 업로드하지 않습니다.
* API Key, DB Password, Secret Key는 로컬 `.env`에서만 관리합니다.
* 자동 크롤링 기능은 초기 MVP 범위에서 제외합니다.
* AI 분석 결과는 사용자의 판단을 돕기 위한 참고 정보이며, 리뷰의 진위 여부를 100% 단정하지 않습니다.
* 프로젝트 진행 상황과 세부 기획은 Notion에서 관리합니다.
