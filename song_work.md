# 송도진 담당 업무

## 담당 범위

UNI:VERSE에서 담당하는 기능 영역은 회원·인증, 학교 인증, 커뮤니티입니다. 아래 내용은 현재 저장소의 구현 기준으로 정리했습니다.

## 회원 및 인증

- 학교 이메일 도메인을 확인해 회원가입을 처리합니다.
- 이메일 인증번호 발송과 인증 확인 후 가입할 수 있습니다.
- 로그인, 토큰 재발급, 로그아웃을 제공합니다.
- 내 정보 조회·수정·탈퇴와 공개 회원 프로필 조회를 제공합니다.
- 회원 가입 시 기본 신뢰점수와 이력 생성이 연결되어 있습니다.
- 프론트에서는 로그인/회원가입과 토큰이 필요한 API 요청을 연결합니다.

주요 API:

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/auth/email-verifications` | 학교 이메일 인증번호 발송 |
| `POST` | `/api/v1/auth/email-verifications/confirm` | 인증번호 확인 |
| `POST` | `/api/v1/auth/signup` | 회원가입 |
| `POST` | `/api/v1/auth/login` | 로그인 |
| `POST` | `/api/v1/auth/refresh` | 토큰 재발급 |
| `POST` | `/api/v1/auth/logout` | 로그아웃 |
| `GET` | `/api/v1/users/me` | 내 정보 조회 |
| `PATCH` | `/api/v1/users/me` | 내 정보 수정 |
| `DELETE` | `/api/v1/users/me` | 회원 탈퇴 |
| `GET` | `/api/v1/users/{userId}/profile` | 공개 프로필 조회 |

## 학교 인증

- 학교 목록을 조회하고 학교명 검색을 지원합니다.
- 학교 이메일의 인증번호 확인과 회원 계정의 학교 인증 상태 조회를 제공합니다.
- 알려진 이메일 도메인은 학교명으로 연결하고, 알 수 없는 도메인은 현재 도메인 문자열을 학교명으로 사용합니다.

주요 API:

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/schools?keyword={keyword}` | 학교 목록 및 검색 |
| `POST` | `/api/v1/schools/verifications` | 학교 인증 요청 |
| `POST` | `/api/v1/schools/verifications/{verificationId}/confirm` | 인증번호 확인 |
| `GET` | `/api/v1/schools/verifications/me` | 내 학교 인증 상태 조회 |

## 커뮤니티

- 게시글 목록을 카테고리·키워드·해시태그로 조회하고 정렬 및 페이지네이션할 수 있습니다.
- 익명 또는 닉네임으로 게시글과 댓글을 작성하며, 작성자 권한으로 수정·삭제할 수 있습니다.
- 게시글 좋아요 등록·취소와 댓글 조회·작성을 제공합니다.
- 게시글의 익명 설정을 바꿀 때 작성자의 기존 활성 댓글 익명 상태도 함께 반영합니다.
- 프론트의 커뮤니티 API 모듈은 게시글·댓글·좋아요 요청을 백엔드와 연결합니다.

주요 API:

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/community/posts` | 게시글 목록 및 검색 |
| `POST` | `/api/v1/community/posts` | 게시글 작성 |
| `GET` | `/api/v1/community/posts/{postId}` | 게시글 상세 조회 |
| `PATCH` | `/api/v1/community/posts/{postId}` | 게시글 수정 |
| `DELETE` | `/api/v1/community/posts/{postId}` | 게시글 삭제 |
| `GET` / `POST` | `/api/v1/community/posts/{postId}/comments` | 댓글 조회 및 작성 |
| `PATCH` / `DELETE` | `/api/v1/community/comments/{commentId}` | 댓글 수정 및 삭제 |
| `POST` / `DELETE` | `/api/v1/community/posts/{postId}/likes` | 좋아요 등록 및 취소 |

## 주요 코드 위치

- 인증 API 및 처리: `backend/src/main/java/com/universe/auth/`
- 회원 정보 및 마이페이지: `backend/src/main/java/com/universe/user/`
- 학교 및 학교 인증: `backend/src/main/java/com/universe/school/`
- 커뮤니티 도메인: `backend/src/main/java/com/universe/community/`
- 로그인/회원가입 화면: `frontend/src/pages/Login.jsx`
- 커뮤니티 API 연결: `frontend/src/lib/communityApi.js`

## 검증

관련 백엔드 테스트:

- `backend/src/test/java/com/universe/auth/service/EmailVerificationServiceTest.java`
- `backend/src/test/java/com/universe/auth/service/AuthSignupTrustTest.java`
- `backend/src/test/java/com/universe/community/CommunityPostAnonymityTest.java`
- `backend/src/test/java/com/universe/community/CommunityInteractionTest.java`
- `backend/src/test/java/com/universe/community/controller/CommunityPostControllerTest.java`

백엔드 테스트 실행:

```bash
cd backend
./gradlew test
```

프론트엔드는 현재 `npm run build`와 `npm run lint` 스크립트를 제공합니다.

## 공유 시 참고

- 학교명은 회원가입 폼에서 직접 입력받지 않습니다. 학교 이메일 도메인을 기준으로 서버가 학교명을 결정하므로, 목록에 없는 도메인은 이메일 도메인 문자열로 표시될 수 있습니다.
- 인증 메일 발송 등 외부 메일 환경에 의존하는 기능은 실행 환경의 메일 설정에 따라 동작이 달라질 수 있습니다.
