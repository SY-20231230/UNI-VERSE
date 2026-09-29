# 프론트-백 연동 구조

프론트 화면이 백엔드 API를 호출하는 방식과, 새 기능을 연결할 때 따라야 할 패턴을 정리한다.

## 현재 연결 범위

| 기능 | 상태 |
|---|---|
| 로그인 · 회원가입 · 로그아웃 · 내 정보(`/users/me`) | 연결됨 |
| 알림 (`/notifications`) | 연결됨 |
| 마이페이지 (`/mypage`, `/mypage/posts`, `/mypage/market-items`) | 연결됨 (찜 목록은 백엔드 API 없음) |
| 신고 · 관리자 신고 처리 | API 클라이언트 연결됨 (화면에서 실제 서버 ID가 필요) |
| 커뮤니티 · 중고거래 · 거래 · 채팅 | 아직 목업 데이터 (`AppContext` + `seed.js`) |

## 실행 방법

백엔드와 프론트를 둘 다 켜야 한다. 화면은 항상 `http://localhost:5173` 으로 연다.

```powershell
# 터미널 1 — 백엔드 (MySQL 실행 중이어야 함, backend/.env 사용)
cd backend
.\gradlew.bat bootRun

# 터미널 2 — 프론트
cd frontend
npm run dev
```

- 개발 서버는 `/api` 요청을 `http://localhost:8080` 으로 넘긴다 (`vite.config.js` proxy). CORS 설정이 필요 없다.
- 다른 백엔드 주소를 쓰려면 `frontend/.env.local` 에 `VITE_PROXY_TARGET=http://주소:포트` 를 넣는다.
- 관리자 계정이 필요하면 DB에서 `UPDATE users SET role = 'ADMIN' WHERE email = '...';` 후 다시 로그인한다.

## 구조

화면은 API를 직접 호출하지 않는다. 아래 층을 차례로 거친다.

```
[화면]        pages/*.jsx, components/*.jsx
   ↓ login(), logout(), state.me, state.accessToken
[상태]        context/AppContext.jsx      로그인 상태 · 내 정보
   ↓
[도메인 API]  lib/authApi.js, lib/notificationApi.js, lib/reportApi.js ...
   ↓ request('/auth/login', { method, body, auth })
[공통 통신]   lib/api.js + lib/session.js  토큰 첨부 · 응답 해석 · 토큰 재발급
   ↓ fetch('/api/v1/...')
[Vite proxy]  localhost:5173/api → localhost:8080/api
   ↓
[Spring 백엔드]
```

### lib/api.js — 공통 통신

`createTransport(options)` 가 만드는 `request(path, { method, body, query, signal, auth })` 를 모든 API가 사용한다.

- `Authorization: Bearer <accessToken>` 헤더를 자동으로 붙인다. 로그인·회원가입처럼 토큰이 필요 없는 요청은 `auth: false` 로 보낸다.
  (만료된 토큰이 실리면 JWT 필터가 로그인 요청까지 401로 막기 때문이다.)
- 백엔드 공통 응답 `{ success, data, error: { code, message } }` 을 해석한다. 성공이면 `data` 만 반환하고,
  실패면 `ApiError(message, code, status)` 를 던진다. 화면은 `err.message` 를 그대로 보여주면 된다.
- 401 응답을 받으면 토큰을 한 번 재발급받고 같은 요청을 다시 보낸다.
- 공통 헬퍼: `requireId`(서버 ID 형식 검사), `normalizePage`(PageResponse 검사).

### lib/session.js — 토큰 보관

- access/refresh 토큰을 `localStorage` 의 `universe_session` 에 저장한다. 새로고침해도 로그인이 유지된다.
- 여러 요청이 동시에 401을 받아도 `/auth/refresh` 는 한 번만 호출한다.
- 서버가 재발급을 거절하면 세션을 비우고 구독자(AppContext)에 알려 자동 로그아웃된다. 네트워크 오류일 때는 세션을 유지한다.
- `sessionApiOptions` 를 도메인 API에 넘기면 위 동작이 모두 적용된다.

### 도메인 API — 기능별 요청 모음

`lib/authApi.js` 처럼 기능 단위로 파일을 나눈다. 어떤 주소로 무엇을 보낼지와 요청 전 입력 검사만 담당한다.

### context/AppContext.jsx — 로그인 상태

- `login({ email, password })`: 로그인 → 토큰 저장 → `/users/me` 조회 → `role === 'ADMIN'` 이면 관리자.
- `signup(input)`: 회원가입 후 같은 정보로 자동 로그인.
- `logout()`: 서버 세션 무효화(`/auth/logout`) 후 토큰 삭제.
- 서버 닉네임·신뢰도를 목업의 `users.me` 에도 반영해, 아직 목업인 화면에도 실제 닉네임이 보이게 한다.
- `state.accessToken`, `state.me` 로 현재 토큰과 서버 회원 정보를 읽을 수 있다.

## 요청 흐름

```
로그인      버튼 → login() → POST /auth/login → 토큰 저장 → GET /users/me → 원래 페이지로 이동
토큰 만료   GET /notifications → 401 → POST /auth/refresh → 새 토큰 저장 → GET /notifications 재요청
재발급 실패 POST /auth/refresh 거절 → 토큰 삭제 → 자동 로그아웃 → 로그인 화면
```

## 데모 모드

`state.authMode` 가 `'server'` 면 실제 로그인, `'demo'` 면 목업 둘러보기다.
개발 모드(`npm run dev`)에서만 로그인 화면에 "데모로 둘러보기 / 데모 관리자" 버튼이 보인다.
데모 모드에는 토큰이 없으므로 서버 API를 호출하지 않는다. 담당 기능이 연결되기 전 화면 확인용이다.

## 새 기능 연결 방법 (예: 마이페이지)

1. `lib/mypageApi.js` — 요청 정의

   ```js
   import { createTransport, normalizePage } from './api.js';

   export function createMypageApi(options = {}) {
     const request = createTransport(options);
     return {
       summary: (options = {}) => request('/mypage', options),
       posts: async (query = {}, options = {}) =>
         normalizePage(await request('/mypage/posts', { ...options, query: { page: 0, size: 20, ...query } })),
     };
   }
   ```

2. `lib/useMypageApi.js` — 세션 연결 훅

   ```js
   import { useMemo } from 'react';
   import { useApp } from '../context/AppContext';
   import { createMypageApi } from './mypageApi';
   import { sessionApiOptions } from './session';

   export default function useMypageApi() {
     const { state } = useApp();
     const token = state.accessToken; // 로그인·로그아웃 때 새로 만들기 위한 의존성
     return useMemo(() => createMypageApi(sessionApiOptions), [token]);
   }
   ```

3. 화면에서 훅을 불러 목업 데이터 대신 API 결과를 쓴다. `state.authMode === 'demo'` 일 때는 기존 목업을 유지한다.

4. `lib/mypageApi.test.js` 에 요청 경로·메서드·입력 검사 테스트를 추가한다 (`fetchImpl` 을 가짜 함수로 넘긴다).

## 백엔드에 기대하는 계약

- 모든 응답은 `ApiResponse` 형식: 성공 `{ success: true, data, error: null }`, 실패 `{ success: false, data: null, error: { code, message } }`.
- 목록은 `PageResponse`: `content`, `page`, `size`, `totalElements`, `totalPages`.
- 토큰이 없거나 잘못되면 401. 프론트는 401을 받았을 때만 토큰 재발급을 시도한다.
- 게시글 카테고리는 백엔드 `FREE/QNA/INFO/MARKET_REVIEW` 와 프론트 목업(자유, 수업/학점, 학교생활 …)이 다르다.
  마이페이지는 백엔드 값을 `mypageApi.js` 의 `POST_CATEGORY_LABELS` 로 표시하며, 커뮤니티 연동 시 한쪽으로 맞춰야 한다.

### 알려진 불일치 (백엔드 확인 필요)

- 토큰 없이 인증이 필요한 API를 호출하면 공통 형식이 아닌 Spring 기본 403 응답이 온다 (`SecurityConfig` 에 인증 실패 entry point 없음).
- JWT 필터가 토큰을 거부할 때 예전 형식(`code`/`message` 가 최상위)으로 응답한다.
- 프론트는 두 경우 모두 처리하지만, 공통 형식으로 맞추는 것이 좋다.

## 검증

```powershell
cd frontend
node --test src/lib/*.test.js
npm run build
```
