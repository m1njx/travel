# ✈️ TripSync (유럽 여행 일정 관리 및 실시간 비용 정산 앱)

TripSync는 팀원들과 실시간으로 유럽 여행 일정을 계획하고, 지출 내역을 기록하여 간편하게 정산할 수 있도록 돕는 스마트한 웹 애플리케이션입니다. Google Gemini AI 비서 기능과 Firebase 실시간 동기화를 지원합니다.

---

## ✨ 주요 기능

1. **📍 실시간 일정 관리 & AI 동선 최적화**
   * 팀원들과 실시간으로 공유되는 여행 일정표 작성.
   * Google Gemini AI를 활용하여 지리적 근접성을 고려한 최적의 이동 동선(시간표) 추천 및 현지 여행 팁 자동 생성.

2. **💶 실시간 지출 기록 & 다국어 정산 (가계부)**
   * EUR, GBP, CHF, USD 등 다양한 유럽 통화 기록 지원.
   * **Gemini API 실시간 검색** 또는 백업 공시 API를 활용해 실시간 환율 정보 자동 수집.
   * **영수증 스캔 기능 (AI Receipt Scanner)**: 영수증 사진을 업로드하면 AI가 금액, 통화, 가계부 카테고리를 자동으로 파악하여 입력.
   * 정밀한 정산 알고리즘을 통한 N분의 1 자동 정산 및 송금 내역 계산.

3. **📋 체크리스트 & AI 준비물 추천**
   * 개인 및 공동 준비물 관리.
   * 여행지와 날씨/시기 정보를 기반으로 Gemini AI가 꼭 필요한 맞춤형 준비물을 추천 및 일괄 등록.

4. **⚡ Firebase 실시간 데이터 동기화**
   * 방 코드(Room Code)를 통해 팀원들을 초대하고, 가계부, 일정, 체크리스트를 실시간(onSnapshot)으로 동기화.

---

## 🛠️ 기술 스택

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Framer Motion
- **State Management**: Zustand
- **Backend & Database**: Firebase Firestore (실시간 양방향 데이터 동기화)
- **AI Integration**: Google Gemini API (`@google/generative-ai`)
- **Package Manager**: npm

---

## 🔒 보안 및 성능 최적화 조치

1. **API 호출 제한 초과(429) 및 비용 절감 최적화**
   * Gemini API Free Tier의 제한된 분당 호출수(RPM)에 대응하기 위해 **10분 주기의 로컬 캐싱(LocalStorage) 알고리즘** 적용.
   * 가계부 탭 마운트 시 불필요한 중복 API 호출 방지 및 React Strict Mode의 이중 마운트 영향 최소화.
2. **보안 관리**
   * Firebase API Key 등 핵심 자격 증명은 환경 변수(`.env`)를 통해 관리하고 있으며, `.gitignore`를 통해 Git 추적에서 원천 제외.
   * 외부 링크 이동 시 리버스 탭내빙(Tabnabbing) 취약점을 예방하기 위해 모든 새 창 열기(`target="_blank"`)에 `rel="noopener noreferrer"` 속성 적용.
   * 패키지 종속성 검사(`npm audit`)를 통해 보안 취약점을 발견하고 패치 완료 (취약성 0개 상태 유지).

---

## 🚀 시작하기

### 1. 필수 요구사항
- Node.js >= 20.0.0

### 2. 환경 변수 설정
프로젝트 루트 폴더에 `.env` 파일을 생성하고 아래 형식을 작성하세요.

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. 설치 및 로컬 서버 실행
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```
