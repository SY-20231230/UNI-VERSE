# UNI:VERSE
팀 포트폴리오 = uni-verse-team.vercel.app

학교 인증 기반 익명 커뮤니티와 교내 중고거래를 결합한 캠퍼스 플랫폼입니다.

커뮤니티에서는 익명성을 보장하고,  
중고거래에서는 신뢰와 책임을 강화하는 것을 목표로 합니다.

학생 인증, 익명 커뮤니티, 중고거래, 채팅, 신고·제재, 신뢰점수,  
AI 기반 위험 거래 문구 탐지까지 하나의 서비스에서 제공합니다.

---

## 📌 프로젝트 개요

UNI:VERSE는 같은 학교 학생들을 대상으로 하는  
대학 인증 기반 커뮤니티 및 중고거래 플랫폼입니다.

기존 대학 커뮤니티의 익명성과 일반 중고거래 플랫폼의 거래 기능을 결합하고,  
학교 인증과 거래 신뢰 기능을 추가하여 보다 안전한 캠퍼스 내 소통과 거래 환경을 만드는 것을 목표로 했습니다.

### 핵심 방향

- 학교 인증을 통한 사용자 신뢰 확보
- 커뮤니티 익명성 보장
- 중고거래 사용자 식별 및 책임 강화
- 거래 과정의 위험 표현 자동 탐지
- 신고·제재·신뢰점수를 통한 안전한 거래 환경 구축
- 실시간 채팅 및 거래 상태 관리
- Docker / AWS 기반 실제 배포 환경 구성
- GitHub Actions 기반 CI/CD 자동화

---

## ✨ 주요 기능

### 🎓 회원 및 학교 인증

- 학교 이메일 기반 인증 구조 구현
- 현재 **Demo 버전에서는 실제 이메일 발송 대신 임시 인증번호 방식 사용**
- 학교별 사용자 및 커뮤니티 분리
- 회원가입 / 로그인 / 로그아웃
- JWT 기반 인증
- 사용자 프로필 및 마이페이지

> 현재 Demo 환경에서는 SMTP 메일 발송을 사용하지 않으며,  
> Backend가 생성한 인증번호를 Frontend에 전달하는 개발용 인증 방식을 사용합니다.  
> Production 환경에서는 실제 학교 이메일 발송 방식으로 확장할 수 있도록 메일 인증 구조를 분리해 두었습니다.

### 💬 익명 커뮤니티

- 익명 게시글 작성
- 게시글 조회 / 수정 / 삭제
- 댓글 및 대댓글
- 좋아요
- 카테고리별 게시글 조회
- 검색 / 정렬 / 페이징
- 학교 관리자 공지 작성 및 관리

### 🛒 교내 중고거래

- 상품 등록 / 수정 / 삭제
- 상품 상세 및 목록 조회
- 카테고리 / 가격 / 상태 기반 필터링
- 상품 정렬
- 상품 조회수 관리
- 상품 이미지 업로드
- 찜 등록 / 취소 / 목록 조회
- 판매 상태 관리
- 판매자·구매자 쌍방 거래 완료 처리

### 💬 채팅

- 1:1 대화 요청
- 대화 요청 승인 / 거절 / 취소
- 채팅방 생성
- WebSocket / STOMP 기반 실시간 메시지
- 메시지 내역 조회
- 읽음 처리
- 중고거래 상품과 채팅방 연동

### 🚨 신고 및 관리자

- 사용자 신고
- 신고 증거 관리
- 신고 상태 관리
- 관리자 신고 처리
- 사용자 경고 및 정지
- 정지 만료 처리
- 관리자 회원 관리

### ⭐ 신뢰점수

- 거래 완료 기반 신뢰점수 반영
- 신뢰점수 변경 이력 관리
- 동일 거래 중복 적립 방지

---

## 🤖 AI 위험 거래 문구 탐지

중고거래 게시글 등록 및 수정 시  
판매글의 제목과 내용을 AI Server로 전달하여 위험 거래 표현을 분석합니다.

### 탐지 대상

- 카카오톡 / 카톡 / 오픈채팅 등 외부 메신저 유도
- 선입금 요구
- 계좌이체 유도
- 택배 거래 강요
- 입금 후 발송
- 외부 링크 유도
- 기타 비정상 거래 표현

### 모델 구조

```text
중고거래 판매글
        ↓
Spring Boot Backend
        ↓
AiRiskService
        ↓
WebClient
        ↓
FastAPI AI Server
        ↓
TF-IDF Vectorization
        ↓
Logistic Regression
        ↓
위험 / 정상 분류 결과 반환
```

초기 모델은 `TF-IDF + Logistic Regression` 기반의 텍스트 분류 모델로 구성했습니다.

Sprint 2에서는 학습 데이터를 추가하고  
기존 모델을 재학습(Retraining)하여 위험 문구 분류 성능을 개선했습니다.

향후 충분한 실제 거래 데이터가 축적되면  
KoELECTRA, KoBERT 등 문맥 기반 모델로 확장하는 것을 목표로 합니다.

---

## 🛠 기술 스택

### Frontend

- React
- JavaScript
- JSX
- Vite
- Context API
- Custom Hooks
- WebSocket Client

### Backend

- Java 21
- Spring Boot
- Spring Data JPA
- QueryDSL
- Spring Security
- JWT
- WebSocket / STOMP
- WebClient

### AI

- Python
- FastAPI
- TF-IDF
- Logistic Regression
- scikit-learn

### Database

- MySQL
- AWS RDS MySQL

### Infra / DevOps

- Docker
- Docker Compose
- GitHub Actions
- AWS ECR
- AWS ECS Fargate
- AWS RDS
- AWS S3
- Application Load Balancer
- AWS CloudMap
- AWS Systems Manager Parameter Store
- AWS CloudWatch Logs
- AWS CloudFormation

---

## 🏗 시스템 아키텍처

```text
User
  ↓
Application Load Balancer
  ├── /, /*           → Frontend
  ├── /api/*          → Backend
  └── /ws-stomp*      → Backend WebSocket

Frontend
  ↓
Backend
  ├── RDS MySQL
  ├── S3
  └── CloudMap
         ↓
      AI Server
```

### AWS 구성

```text
GitHub
  ↓
GitHub Actions
  ↓
Docker Build
  ↓
Amazon ECR
  ↓
Amazon ECS Fargate

Frontend Service
Backend Service
AI Service

Backend
  ├── Amazon RDS MySQL
  ├── Amazon S3
  └── AI Server

CloudFormation
  └── AWS 인프라 코드 기반 생성
```

---

## 📂 프로젝트 구조

### 🖥️ Frontend

```text
frontend/
├── public/                # 정적 리소스
│
└── src/
    ├── components/        # 재사용 가능한 UI 컴포넌트
    ├── context/           # 전역 상태 관리
    ├── hooks/             # Custom Hooks
    ├── lib/               # API 설정 및 Utility
    └── pages/             # 주요 페이지 컴포넌트
```

### ☕ Backend

```text
backend/
├── gradle/                # Gradle 빌드 설정
├── uploads/               # CSV 로그 및 로컬 파일
│
└── src/main/java/com/universe/
    ├── admin/             # 관리자 기능
    ├── ai/                # AI 서버 연동
    ├── auth/              # 로그인 / 인증 / JWT
    ├── chat/              # 실시간 채팅
    ├── community/         # 게시글 / 댓글 / 좋아요
    ├── file/              # 파일 업로드 / 다운로드
    ├── global/            # 공통 설정 / 예외 처리
    ├── market/            # 중고거래 상품
    ├── notification/      # 알림
    ├── report/            # 신고
    ├── school/            # 학교 인증 / 학교 관리
    ├── trade/             # 거래 상태 관리
    ├── trust/             # 신뢰점수
    └── user/              # 회원 및 프로필
```

### 🧠 AI Server

```text
ai-server/
├── data/                  # 학습용 데이터셋 및 전처리 데이터
├── models/                # 학습 완료 모델 파일
├── reports/               # 모델 성능 평가 결과
├── tests/                 # AI 로직 테스트
│
├── build_dataset.py       # 데이터셋 구축
├── train_market_risk.py   # 위험문구 분류 모델 학습
├── market_risk_guard.py   # 위험도 분석 핵심 로직
├── serve.py               # FastAPI 서버
├── requirements.txt       # Python 의존성
└── Dockerfile             # AI Docker 이미지 설정
```

---

## 🐳 로컬 실행

Docker Compose를 이용해  
Frontend, Backend, AI Server, MySQL을 한 번에 실행할 수 있습니다.

```bash
docker compose build
docker compose up -d
```

실행 후 상태 확인:

```bash
docker compose ps
```

### Local Port

| Service | Port |
|---|---:|
| Frontend | 5173 |
| Backend | 8080 |
| AI Server | 8000 |
| MySQL | 3306 |

### Health Check

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8080/actuator/health/readiness
```

AI Server:

```text
http://localhost:8000/health
```

---

## ☁️ AWS 배포

Production 환경에서는  
Frontend, Backend, AI Server를 각각 Docker Image로 생성한 뒤  
Amazon ECR에 저장하고 ECS Fargate에서 실행합니다.

```text
Dockerfile
   ↓
Docker Image
   ↓
Amazon ECR
   ↓
Amazon ECS Fargate
```

### Production Port

| Service | Port |
|---|---:|
| Frontend | 8080 |
| Backend | 8080 |
| AI Server | 8000 |
| RDS MySQL | 3306 |

AWS 인프라는 CloudFormation을 이용하여 관리합니다.

```text
infra/
├── foundation.yaml
├── service.yaml
└── README.md
```

### foundation.yaml

다음 기본 인프라를 생성합니다.

- VPC
- Public / Private Subnet
- Security Group
- ECR
- ECS Cluster
- RDS
- S3
- CloudMap
- IAM Role

### service.yaml

다음 서비스 실행 환경을 구성합니다.

- Application Load Balancer
- Target Group
- ECS Task Definition
- ECS Service
- Frontend Service
- Backend Service
- AI Service
- CloudMap Service Discovery

---

## 🔐 보안 및 파일 관리

### SSM Parameter Store

민감정보는 소스 코드에 직접 저장하지 않고  
AWS Systems Manager Parameter Store에서 관리합니다.

```text
/universe/prod/db_password
/universe/prod/jwt_secret
```

ECS 실행 시 다음 환경변수로 주입됩니다.

```text
DB_PASSWORD
JWT_SECRET_KEY
```

### Amazon S3

S3 Bucket은 Private 상태로 운영합니다.

DB에는 실제 URL이 아닌 Object Key를 저장하고,  
이미지 조회 시 Backend에서 Presigned URL을 생성합니다.

```text
DB
└── uploads/{uuid}-{filename}

        ↓

Backend
└── Presigned URL 발급

        ↓

Frontend
└── 이미지 조회
```

---

## 🔄 CI / CD

### CI

GitHub Actions를 이용해  
코드 변경 시 자동으로 테스트 및 빌드를 수행합니다.

```text
Push / Pull Request
        ↓
GitHub Actions
        ↓
Test
        ↓
Build
```

### CD

GitHub Actions를 이용해 Docker Image를 생성하고 ECR에 Push한 뒤,  
ECS 서비스를 재배포하는 흐름으로 구성합니다.

```text
main Merge
    ↓
GitHub Actions
    ↓
Docker Build
    ↓
Amazon ECR Push
    ↓
Amazon ECS Redeploy
```

이를 통해 반복적인 수동 배포 작업을 줄이고  
배포 과정에서 발생할 수 있는 실수를 최소화합니다.

---

## 🌿 Git Branch 전략

```text
main
  ↑
develop
  ↑
feature branches
```

개발자는 개인 브랜치에서 기능을 구현한 뒤  
Pull Request를 통해 `develop`에 통합합니다.

통합 테스트 및 검증 완료 후  
`main` 브랜치에 반영합니다.

---

## 🧪 테스트

Backend는 기능별 테스트를 구성합니다.

```text
Controller
→ @WebMvcTest

Repository
→ @DataJpaTest

Integration
→ @SpringBootTest
```

주요 검증 대상:

- 회원가입 / 로그인
- 커뮤니티 작성 / 조회
- 중고거래 CRUD
- AI 위험 / 정상 판정
- 채팅
- 쌍방 거래 완료
- 신고 처리
- 신뢰점수 변경

---

## 👥 Team

| 이름 | 담당 영역 |
|---|---|
| 윤성용 | Scrum Master, 중고거래, 채팅, 거래관리, AI 연동, Backend/AI CI·DevOps |
| 송도진 | 회원, 인증, 학교, 커뮤니티, Frontend CI |
| 백인욱 | 신고, 제재, 신뢰점수, 관리자, 마이페이지 |
| 강연재 | Frontend, API 연동, UI/반응형, AI 위험문구 데이터 및 모델 학습 |

---

## 📈 Development Process

UNI:VERSE는 애자일 방법론의 Scrum Framework를 기반으로 개발했습니다.

```text
Product Backlog
      ↓
Sprint Planning
      ↓
Sprint Backlog
      ↓
Development
      ↓
Sprint Review
      ↓
Improvement
```

Sprint 단위로 기능을 구현하고,  
Review를 통해 발견된 오류와 개선사항을 다음 Sprint에 반영했습니다.

---

## 🚀 향후 개선 계획

- 실제 학교 이메일 인증 적용
- AI 위험문구 학습 데이터 확대
- KoELECTRA / KoBERT 기반 문맥 분류 모델 검토
- HTTPS 및 Custom Domain 적용
- ECS Private Subnet 구조 고도화
- CI/CD 파이프라인 고도화
- 알림 기능 개선
- 운영 로그 및 모니터링 강화

---

## 📄 License

이 프로젝트는 **Apache License 2.0**을 따릅니다.
