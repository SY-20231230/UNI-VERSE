# UNI:VERSE

학교 인증 기반 익명 커뮤니티와 교내 중고거래를 결합한 캠퍼스 플랫폼입니다.

커뮤니티에서는 익명성을 보장하고,
중고거래에서는 신뢰와 책임을 강화하는 것을 목표로 합니다.

---

## 주요 기능

- 학교 이메일 기반 사용자 인증
- 학교별 커뮤니티 분리
- 익명 게시글 및 댓글
- 중고거래 상품 등록 및 조회
- 중고거래 상품 찜
- TF-IDF 기반 중고거래 위험 문구 탐지
- 1:1 대화 요청 및 채팅
- 판매자·구매자 쌍방 거래 완료 확인
- 사용자 신고 및 관리자 제재
- 신뢰점수 관리

---

## AI 위험 문구 탐지

초기 버전에서는 TF-IDF 기반으로 중고거래 등록글의 위험 문구를 탐지합니다.

주요 탐지 대상은 다음과 같습니다.

- 카카오톡, 카톡, 오픈채팅 등 외부 메신저 유도
- 선입금 요구
- 계좌이체 유도
- 택배 거래 강요
- 입금 후 발송 등 위험 거래 표현

중고거래 글 등록 시 위험 문구를 분석하고,
위험 가능성이 높은 경우 등록을 제한하거나 수정하도록 안내합니다.

초기에는 TF-IDF 기반 방식으로 구현하고,
추후 실제 거래 데이터가 충분히 축적되면 KoELECTRA, KoBERT 등 문맥 기반 모델로 확장할 예정입니다.

---

## 기술 스택

### Backend

- Java 21
- Spring Boot
- Spring Data JPA
- QueryDSL
- Spring Security
- JWT
- WebSocket
- WebClient

### Frontend

- React
- JavaScript (JSX)
- Vite

### Database

- MySQL
- AWS RDS

### AI

- TF-IDF
- FastAPI

### Infra

- AWS S3
- AWS RDS

---

## 프로젝트 구조

```text
com.universe
├── global
├── auth
├── user
├── school
├── community
├── market
├── chat
├── trade
├── report
├── trust
├── admin
└── ai
