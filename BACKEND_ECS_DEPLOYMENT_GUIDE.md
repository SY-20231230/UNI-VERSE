D:\AI\UNI-VERSE\BACKEND_ECS_DEPLOYMENT_GUIDE.md# UNI-VERSE 백엔드 ECS 배포 가이드

이 문서는 Spring Boot 백엔드를 Amazon ECS Fargate(서버를 직접 관리하지 않고 컨테이너만 실행하는 AWS 서비스)에 배포하는 절차를 설명합니다. 공통 절차(ECR 로그인, 이미지 3종 빌드, ALB 생성 등)는 [ECS_DEPLOYMENT_GUIDE.md](ECS_DEPLOYMENT_GUIDE.md)에 있으므로 여기서는 반복하지 않고 **백엔드에만 해당하는 내용**을 다룹니다. 전체 구조와 결정 사항은 [ARCHITECTURE.md](ARCHITECTURE.md)를 참고하세요.

> 이 문서는 목요일 실제 배포 때 채워 넣을 뼈대입니다. `<RDS_ENDPOINT>`처럼 꺾쇠로 표시한 값은 배포 당일 실제 값으로 바꿉니다.

### 표시 규칙

| 표시 | 뜻 |
|---|---|
| `[확인됨: 파일 경로]` | 저장소 파일에서 직접 확인한 사실 |
| `[가정 - 확인 필요]` | 일반적인 동작이나 추정. 배포 전에 확인해야 함 |
| `[결정 필요]` | 팀이 정해야 하는 항목. [ARCHITECTURE.md 6장](ARCHITECTURE.md#6-결정이-필요한-항목) 참고 |

### 명령어 표기 규칙

모든 명령어 아래에 다음 네 가지를 적습니다.

- **실행 위치**: 내 컴퓨터(Git Bash) / AWS 콘솔 / 컨테이너 안 등
- **목적**
- **바꿀 값**
- **정상 결과**

명령어는 [ECS_DEPLOYMENT_GUIDE.md](ECS_DEPLOYMENT_GUIDE.md)와 같이 Bash 문법(Windows에서는 Git Bash)으로 적습니다. `[확인됨: ECS_DEPLOYMENT_GUIDE.md]`

---

## 1. 현재 백엔드 구성

확인한 사실만 적습니다. 기준 커밋은 `develop` 브랜치 `898e88d`입니다.

### 1-1. 버전과 빌드

| 항목 | 값 | 근거 |
|---|---|---|
| Java | 21 (Gradle toolchain) | `[확인됨: backend/build.gradle]` |
| Spring Boot | 4.1.1 | `[확인됨: backend/build.gradle]` |
| 빌드 도구 | Gradle Wrapper 9.7.1 | `[확인됨: backend/gradle/wrapper/gradle-wrapper.properties]` |
| DB 드라이버 | `com.mysql:mysql-connector-j` | `[확인됨: backend/build.gradle]` |
| 주요 기능 | JPA, Security, WebSocket, Mail, Actuator, WebFlux(`WebClient`), JWT(jjwt 0.12.6), QueryDSL | `[확인됨: backend/build.gradle]` |

### 1-2. Dockerfile

`[확인됨: backend/Dockerfile]`

- 2단계 빌드(multi-stage build: 빌드용 이미지와 실행용 이미지를 나눠 최종 이미지를 작게 만드는 방식)입니다.
  - 빌드 단계: `eclipse-temurin:21-jdk`에서 `./gradlew bootJar` 실행 → `app.jar` 생성
  - 실행 단계: `eclipse-temurin:21-jre`, 작업 폴더 `/app`
- `curl`을 설치합니다. → ECS 컨테이너 상태 확인 명령에 쓸 수 있습니다.
- `/app/uploads` 폴더를 만들고 root가 아닌 `app` 사용자로 실행합니다.
- `EXPOSE 8080`
- `HEALTHCHECK`: `curl --fail http://127.0.0.1:8080/actuator/health/readiness`
  - ⚠ ECS는 Dockerfile의 `HEALTHCHECK`를 사용하지 않습니다. Task Definition에 따로 적어야 합니다(6장 참고). `[가정 - 확인 필요]` → [ECS 컨테이너 상태 확인 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_healthcheck)
- 실행 명령: `java -jar /app/app.jar` (별도 JVM 옵션 없음)

`.dockerignore`에서 `.env`, `.env.*`, `build`, `uploads`를 제외합니다. → 로컬 `.env`의 비밀값은 이미지에 들어가지 않습니다. `[확인됨: backend/.dockerignore]`

### 1-3. 포트

- `application.yml`에 `server.port`가 없으므로 Spring Boot 기본값 8080을 사용합니다. `[확인됨: backend/src/main/resources/application.yml]`
- Dockerfile의 `EXPOSE 8080`, ECS 가이드의 포트와 일치합니다. `[확인됨: backend/Dockerfile, ECS_DEPLOYMENT_GUIDE.md]`

### 1-4. 설정 파일과 프로필

`[확인됨: backend/src/main/resources/application.yml]`

- 설정 파일은 `application.yml` 하나이고, 운영용 프로필(profile: 환경별로 설정을 바꾸는 Spring 기능)은 **없습니다**.
- `application-test.yml`은 테스트 실행 때만 쓰입니다(H2 메모리 DB). `[확인됨: backend/src/test/resources/application-test.yml, backend/build.gradle]`
- `spring.config.import: optional:file:.env[.properties]` → 실행 폴더에 `.env` 파일이 있으면 읽고, 없으면 무시합니다. 컨테이너에는 `.env`가 없으므로 **환경변수로만** 값을 받습니다.

### 1-5. 환경변수 전체 목록

`application.yml`에서 `${...}`로 읽는 이름 전체입니다. `[확인됨: backend/src/main/resources/application.yml]`

| 환경변수 | 설정 키 | 기본값 | 없으면 |
|---|---|---|---|
| `DB_URL` | `spring.datasource.url` | 없음 | 시작 실패 |
| `DB_USERNAME` | `spring.datasource.username` | 없음 | 시작 실패 |
| `DB_PASSWORD` | `spring.datasource.password` | 없음 | 시작 실패 |
| `JWT_SECRET_KEY` | `jwt.secret-key` | 없음 | 시작 실패 |
| `AI_SERVER_BASE_URL` | `ai.server.base-url` | `http://127.0.0.1:8000` | ECS에서는 AI 호출 실패 |
| `MAIL_HOST` | `spring.mail.host` | 빈 값 | 인증 메일 미발송 (아래 ⚠ 참고) |
| `MAIL_PORT` | `spring.mail.port` | `587` | |
| `MAIL_USERNAME` | `spring.mail.username` | 빈 값 | |
| `MAIL_PASSWORD` | `spring.mail.password` | 빈 값 | |
| `MAIL_FROM` | `app.mail.from` | `MAIL_USERNAME` 값 | |

"시작 실패"는 기본값이 없는 `${...}` 자리표시를 채우지 못하면 Spring이 뜨지 않는다는 일반 동작을 기준으로 적었습니다. `[가정 - 확인 필요]`

- ⚠ `backend/.env.example`에는 `AI_SERVER_URL`이라고 적혀 있지만, 코드가 읽는 이름은 `AI_SERVER_BASE_URL`입니다. ECS에는 **`AI_SERVER_BASE_URL`**을 넣습니다. `[확인됨: backend/.env.example, backend/src/main/java/com/universe/global/config/WebClientConfig.java]`

### 1-6. JPA `ddl-auto`

- `spring.jpa.hibernate.ddl-auto: update` `[확인됨: backend/src/main/resources/application.yml]`
  - `update`(엔티티 클래스와 DB를 비교해 없는 테이블·컬럼을 자동으로 추가하는 모드)는 테이블을 지우지 않으므로 **데이터가 삭제되지는 않습니다**. 다만 운영 DB 구조를 앱이 자동으로 바꾸므로 `schema.sql`과 실제 DB가 달라질 수 있습니다. `[가정 - 확인 필요]`
  - `create`, `create-drop`이 아니므로 재시작할 때 데이터가 지워질 위험은 없습니다. (`create-drop`은 테스트 설정에만 있습니다. `[확인됨: backend/src/test/resources/application-test.yml]`)
  - 운영에서 `validate`(구조만 검사하고 바꾸지 않는 모드)로 바꿀지는 `[결정 필요]` — 바꾸려면 `application.yml`을 수정하거나 환경변수 `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`로 덮어씁니다. `[가정 - 확인 필요]` → [Spring Boot 외부 설정 문서](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- `show-sql: true`, `format_sql: true` → 모든 SQL이 로그에 찍힙니다. CloudWatch Logs 양과 비용이 늘어납니다. `[확인됨: backend/src/main/resources/application.yml]`

### 1-7. 상태 확인 경로 `/actuator/health/readiness`

코드 설정상 **활성화되어 있습니다.**

| 조건 | 설정 | 근거 |
|---|---|---|
| Actuator(운영 상태를 확인하는 Spring 기능) 의존성 | `spring-boot-starter-actuator` | `[확인됨: backend/build.gradle]` |
| health 엔드포인트 공개 | `management.endpoints.web.exposure.include: health` | `[확인됨: backend/src/main/resources/application.yml]` |
| readiness 경로 활성화 | `management.endpoint.health.probes.enabled: true` | `[확인됨: backend/src/main/resources/application.yml]` |
| 로그인 없이 접근 허용 | `/actuator/health/**` → `permitAll()` | `[확인됨: backend/src/main/java/com/universe/global/security/SecurityConfig.java]` |

- 상세 정보는 숨깁니다(`show-details: never`). 응답은 `{"status":"UP"}` 형태입니다. `[가정 - 확인 필요]`
- readiness는 기본적으로 DB 연결 상태를 포함하지 않습니다. 대신 이 앱은 시작할 때 DB에 연결하지 못하면 아예 뜨지 않으므로, readiness가 UP이면 시작 시점의 DB 연결은 성공한 것입니다. `[가정 - 확인 필요]` → [Spring Boot 상태 확인 문서](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes)
- 실제 응답은 아직 실행해 보지 않았습니다. 3장에서 로컬로 확인합니다.

### 1-8. DB 스키마 `schema.sql`

`[확인됨: backend/src/main/resources/schema.sql]`

- 위치: `backend/src/main/resources/schema.sql` (445줄)
- 첫 부분에 **DB 생성 구문이 있습니다**: `CREATE DATABASE IF NOT EXISTS universe` (문자셋 `utf8mb4`) → `USE universe;`
- 테이블 22개를 `CREATE TABLE`로 만듭니다. `IF NOT EXISTS`가 없으므로 **이미 테이블이 있으면 오류가 납니다.**
- `DROP` 구문과 `INSERT`(초기 데이터)는 없습니다. → `schools` 테이블이 비어 있어 학교 인증을 쓰려면 학교 데이터를 따로 넣어야 합니다. `[가정 - 확인 필요]`
- `spring.sql.init` 설정이 운영 설정에 없으므로 Spring이 이 파일을 자동 실행하지 않습니다. 로컬에서는 Compose가 MySQL 컨테이너 초기화에만 사용합니다. `[확인됨: application.yml, compose.yaml]`
- ⚠ **백엔드를 처음 띄우기 전에 `schema.sql`을 먼저 적용해야 합니다.** `ddl-auto: update` 때문에 백엔드가 먼저 뜨면 테이블을 자동으로 만들고, 그 뒤에 `schema.sql`을 적용하면 `CREATE TABLE`이 실패합니다. `[가정 - 확인 필요]`
- 적용 방법은 [ARCHITECTURE.md 4장](ARCHITECTURE.md#4-rds-설정)을 참고하세요. `[결정 필요]`

### 1-9. 업로드 파일

- `LocalFileService`가 상대 경로 `uploads`에 저장합니다. 컨테이너 작업 폴더가 `/app`이므로 실제 위치는 **`/app/uploads`**입니다. `[확인됨: backend/src/main/java/com/universe/file/service/LocalFileService.java, backend/Dockerfile]`
- 파일 이름은 `UUID + 확장자`, DB에는 `/uploads/<파일명>` 형태의 URL을 저장합니다. `[확인됨: LocalFileService.java]`
- `WebConfig`가 `/uploads/**` 요청을 이 폴더에서 바로 내려줍니다. 로그인 없이 접근할 수 있습니다. `[확인됨: backend/src/main/java/com/universe/global/config/WebConfig.java, SecurityConfig.java]`
- 업로드 크기 제한(`spring.servlet.multipart.*`)은 설정하지 않았으므로 Spring Boot 기본값을 따릅니다. `[확인됨: application.yml]` 기본값은 [Spring Boot 설정 목록](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)에서 확인하세요. `[가정 - 확인 필요]`
- ⚠ Fargate 컨테이너의 디스크는 task가 바뀌면 사라집니다. **재배포할 때마다 업로드 파일이 없어집니다.** S3 또는 EFS가 필요합니다. `[결정 필요]`

### 1-10. WebSocket, CORS, AI 서버

| 항목 | 내용 | 근거 |
|---|---|---|
| WebSocket 엔드포인트 | `/ws-stomp`, SockJS(WebSocket이 안 될 때 다른 방식으로 대체해 주는 라이브러리) 사용 | `[확인됨: backend/src/main/java/com/universe/global/config/WebSocketConfig.java]` |
| 메시지 브로커 | `enableSimpleBroker("/sub")`, 보내는 주소 접두사 `/pub` — **서버 메모리 안의 브로커** | `[확인됨: WebSocketConfig.java]` |
| WebSocket 인증 | `StompHandler`가 들어오는 메시지를 가로채 처리 | `[확인됨: WebSocketConfig.java]` |
| WebSocket 허용 출처 | `setAllowedOriginPatterns("*")` | `[확인됨: WebSocketConfig.java]` |
| 프론트 연결 주소 | `new SockJS('/ws-stomp')` — 같은 도메인의 상대 경로 | `[확인됨: frontend/src/lib/useChatSocket.js]` |
| CORS(다른 도메인에서 API를 호출할 수 있게 허용하는 규칙) | 모든 출처 허용(`*`), 인증정보 포함 안 함(`allowCredentials=false`) | `[확인됨: backend/src/main/java/com/universe/global/security/SecurityConfig.java]` |
| 프론트 API 주소 | `VITE_API_BASE_URL`이 없으면 `/api/v1` 상대 경로 | `[확인됨: frontend/src/lib/api.js]` |
| AI 서버 주소 사용 위치 | `WebClientConfig`에서 `ai.server.base-url`로 `WebClient` 생성 | `[확인됨: backend/src/main/java/com/universe/global/config/WebClientConfig.java]` |
| AI 호출 | `AiRiskClient`가 `POST /predict` 호출, 실패하면 `AI_SERVER_ERROR` | `[확인됨: backend/src/main/java/com/universe/ai/service/AiRiskClient.java]` |
| AI 서버 경로 | `GET /health`, `POST /predict`, 포트 8000 | `[확인됨: ai-server/serve.py, ai-server/Dockerfile]` |

- 프론트와 백엔드가 ALB 도메인 하나를 쓰므로 브라우저 입장에서는 같은 출처입니다. 운영에서 CORS가 문제될 가능성은 낮습니다. `[가정 - 확인 필요]`
- ⚠ 메시지 브로커가 서버 메모리 안에 있으므로 **백엔드 task가 2개 이상이면 다른 task에 연결된 사용자에게 채팅이 전달되지 않습니다.** 당분간 백엔드 task 수는 1로 둡니다. `[가정 - 확인 필요]` `[결정 필요]`
- `WebClient`에 타임아웃 설정이 없습니다. AI 서버가 응답하지 않으면 요청이 오래 걸릴 수 있습니다. `[확인됨: WebClientConfig.java]`

### 1-11. 메일(SMTP)과 JWT

**메일** `[확인됨: backend/src/main/resources/application.yml]`

- SMTP(메일을 보내는 표준 프로토콜) 인증 사용, STARTTLS(연결을 암호화로 전환하는 방식) 사용, 기본 포트 587, 타임아웃 5초
- `.env.example` 예시는 Gmail + 앱 비밀번호입니다. `[확인됨: backend/.env.example]`
- ⚠ **메일 설정이 없거나 발송에 실패하면 인증 코드를 API 응답에 그대로 담아 돌려줍니다**(로컬 개발용 대체 동작). 운영에서 메일 설정이 빠지면 누구나 남의 이메일로 인증할 수 있습니다. 로그에도 코드가 찍힙니다.
  - `[확인됨: backend/src/main/java/com/universe/school/service/SchoolMailService.java]`
  - `[확인됨: backend/src/main/java/com/universe/auth/service/EmailVerificationService.java]` (`devCode`)
  - `[확인됨: backend/src/main/java/com/universe/school/service/SchoolVerificationService.java]` (`fallbackCode`)
  - → 운영에서는 `MAIL_*`를 반드시 채우고, 배포 뒤 응답에 코드가 없는지 확인합니다(9장). 코드 수정 여부는 `[결정 필요]`
- 비공개 서브넷의 백엔드가 외부 SMTP 서버(587)에 연결하려면 인터넷으로 나가는 경로(NAT 게이트웨이 등)가 필요합니다. VPC 엔드포인트로는 Gmail에 연결할 수 없습니다. `[가정 - 확인 필요]` `[결정 필요]`

**JWT(로그인 상태를 담은 서명된 토큰)** `[확인됨: backend/src/main/java/com/universe/global/security/JwtTokenProvider.java]`

- `JWT_SECRET_KEY` 문자열을 UTF-8 바이트로 바꿔 HMAC 키로 씁니다.
- Access token 30분, Refresh token 14일 (코드에 고정)
- jjwt는 HMAC-SHA 키가 256비트(32바이트) 미만이면 오류를 냅니다. → **32바이트 이상의 무작위 값**을 씁니다. `[가정 - 확인 필요]`
- 키를 바꾸면 기존 로그인 토큰이 모두 무효가 됩니다. `[가정 - 확인 필요]`

---

## 2. 배포 전 확인 사항

배포 당일 아침에 하나씩 체크합니다.

### 2-1. 코드와 설정

- [ ] 배포할 브랜치와 커밋을 정했다. 커밋 SHA: `<COMMIT_SHA>` `[결정 필요]`
- [ ] `git status`가 깨끗하다. (수정 중인 파일이 있으면 SHA가 실제 이미지 내용을 나타내지 못합니다.)
- [ ] Backend CI(`./gradlew build`)가 통과했다. `[확인됨: .github/workflows/]`
- [ ] 운영 `ddl-auto` 값을 정했다: `update` 유지 / `validate` `[결정 필요]`
- [ ] 메일 인증 대체 동작(코드 응답)을 어떻게 할지 정했다. `[결정 필요]`
- [ ] 업로드 저장소(S3 / EFS / 시연용으로 유실 감수)를 정했다. `[결정 필요]`
- [ ] 시간대: 컨테이너와 RDS는 기본 UTC입니다. 로컬(한국 시간)과 시간이 9시간 다르게 보일 수 있습니다. `TZ` 또는 `-Duser.timezone` 설정 여부 `[가정 - 확인 필요]` `[결정 필요]`

### 2-2. AWS 자원 (값 기록표)

배포 당일 채웁니다. 비밀값 자체는 적지 않고 **ARN(AWS 자원의 고유 주소)만** 적습니다.

| 항목 | 값 | 담당 |
|---|---|---|
| AWS 리전 | `<AWS_REGION>` | `[결정 필요]` |
| AWS 계정 ID | `<AWS_ACCOUNT_ID>` | |
| VPC ID | `<VPC_ID>` | `[결정 필요]` |
| 비공개 서브넷(최소 2개 AZ) | `<PRIVATE_SUBNET_A>`, `<PRIVATE_SUBNET_C>` | |
| 백엔드 보안 그룹 | `<BACKEND_SG_ID>` | |
| RDS 엔드포인트 | `<RDS_ENDPOINT>` | |
| ECR 저장소 URI | `<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/universe-backend` | |
| Secret ARN | `<BACKEND_SECRET_ARN>` | |
| ECS 클러스터 | `<CLUSTER_NAME>` | `[결정 필요]` |
| ALB 리스너 ARN(HTTPS) | `<ALB_HTTPS_LISTENER_ARN>` | `[결정 필요]` |
| AI 서버 내부 주소 | `<AI_SERVICE_NAME>` | `[결정 필요]` |
| 도메인 | `<DOMAIN>` | `[결정 필요]` |

### 2-3. 선행 작업 순서

1. VPC, 서브넷, 보안 그룹 준비 → [ARCHITECTURE.md 3장](ARCHITECTURE.md#3-보안-그룹-연결표)
2. RDS 생성 → **`schema.sql` 적용** → 앱 전용 DB 사용자 생성 → [ARCHITECTURE.md 4장](ARCHITECTURE.md#4-rds-설정)
3. AI 서버 ECS Service 실행 (백엔드가 AI 주소를 알아야 함) `[결정 필요: 담당자]`
4. Secrets Manager에 비밀값 저장 (5장)
5. 백엔드 이미지 push → Task Definition → Target Group → ALB 규칙 → Service (4~8장)

### 2-4. AWS CLI 로그인 방식

- **Access key(장기 자격 증명)를 새로 만들어 쓰지 않습니다.**
- IAM Identity Center(여러 계정·사용자를 한곳에서 관리하는 AWS 로그인 서비스, 옛 이름 AWS SSO)로 로그인하는 방식을 권장합니다. → [AWS CLI SSO 설정 문서](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- 팀 AWS 계정에 IAM Identity Center가 설정되어 있는지는 확인하지 못했습니다. `[가정 - 확인 필요]` `[결정 필요]`

```sh
aws sso login --profile <AWS_PROFILE>
aws sts get-caller-identity --profile <AWS_PROFILE>
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: 브라우저로 로그인해 임시 자격 증명을 받고, 어떤 계정·역할로 로그인했는지 확인
- **바꿀 값**: `<AWS_PROFILE>` — `aws configure sso` 때 정한 프로필 이름
- **정상 결과**: 두 번째 명령이 `Account`에 `<AWS_ACCOUNT_ID>`, `Arn`에 내 역할이 담긴 JSON을 출력

이후 명령에서는 `--profile <AWS_PROFILE>`을 생략하고 `export AWS_PROFILE=<AWS_PROFILE>`로 한 번 지정했다고 가정합니다.

---

## 3. 이미지 로컬 빌드 및 확인

AWS에 올리기 전에 내 컴퓨터에서 이미지가 제대로 뜨는지 확인합니다.

### 3-1. 이미지 빌드

```sh
docker build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t universe-backend:local backend
```

- **실행 위치**: 내 컴퓨터(Git Bash), 저장소 최상위 폴더
- **목적**: ECS Fargate(x86_64)와 같은 아키텍처로 백엔드 이미지 빌드
- **바꿀 값**: 없음. Task Definition에서 ARM64를 쓰기로 하면 `linux/arm64`로 맞춥니다. `[결정 필요]`
- **정상 결과**: 마지막에 `naming to docker.io/library/universe-backend:local` 비슷한 줄이 나오고 오류가 없음. Gradle 빌드 때문에 처음에는 몇 분 걸릴 수 있음

### 3-2. 이미지 정보 확인

```sh
docker image inspect universe-backend:local \
  --format '{{.Config.ExposedPorts}} {{.Config.User}} {{.Architecture}}'
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: 포트, 실행 사용자, 아키텍처 확인
- **바꿀 값**: 없음
- **정상 결과**: `map[8080/tcp:{}] app amd64`

### 3-3. 로컬 실행 확인 (Compose 사용)

로컬 MySQL과 AI 서버가 함께 필요하므로 [DOCKER.md](DOCKER.md)의 Compose를 사용합니다. `[확인됨: compose.yaml]`

```sh
docker compose up --build backend
```

- **실행 위치**: 내 컴퓨터(Git Bash), 저장소 최상위 폴더
- **목적**: MySQL·AI 서버와 함께 백엔드를 띄워 시작 오류가 없는지 확인 (`depends_on` 때문에 `mysql`, `ai-server`도 같이 뜸)
- **바꿀 값**: 없음. 로컬 3306·8000·8080 포트가 이미 쓰이고 있으면 [DOCKER.md](DOCKER.md)의 `*_HOST_PORT` 변수로 바꿈
- **정상 결과**: 로그에 `Started UniverseApplication in ... seconds` 줄이 나옴. `[확인됨: backend/src/main/java/com/universe/UniverseApplication.java]`

다른 터미널에서:

```sh
curl -i http://localhost:8080/actuator/health/readiness
curl -i http://localhost:8080/api/v1/schools
curl -s http://localhost:8080/ws-stomp/info
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: 상태 확인 경로, 로그인 없이 열린 API, SockJS 정보 경로가 응답하는지 확인
- **바꿀 값**: 백엔드 포트를 바꿨다면 `8080`
- **정상 결과**
  - 1번: `HTTP/1.1 200`, 본문 `{"status":"UP"}`
  - 2번: `HTTP/1.1 200`, JSON 응답 (로컬 DB에 학교 데이터가 없으면 빈 목록)
  - 3번: `"websocket":true`가 포함된 JSON `[가정 - 확인 필요]`

확인이 끝나면 `Ctrl + C` 후 `docker compose down`으로 정리합니다. (`-v`를 붙이면 로컬 DB와 업로드가 지워집니다. `[확인됨: DOCKER.md]`)

---

## 4. ECR 저장소와 이미지 push

ECR(Elastic Container Registry: AWS의 Docker 이미지 저장소) 로그인 방법은 [ECS_DEPLOYMENT_GUIDE.md 3장](ECS_DEPLOYMENT_GUIDE.md#3-ecr-저장소-생성)을 따릅니다. 여기서는 백엔드에 필요한 부분만 적습니다.

### 4-1. 저장소 생성 (최초 1회)

ECS 가이드의 `create-repository` 명령에 두 옵션을 더하는 것을 제안합니다. `[결정 필요]` (프론트 담당자와 통일)

```sh
aws ecr create-repository \
  --repository-name universe-backend \
  --image-tag-mutability IMMUTABLE \
  --image-scanning-configuration scanOnPush=true \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash) 또는 AWS 콘솔 → ECR → 리포지토리 생성
- **목적**: 백엔드 이미지 저장소 생성. `IMMUTABLE`(같은 태그로 덮어쓰기 금지)이면 한 번 올린 SHA 태그가 바뀌지 않아 롤백이 안전합니다. `scanOnPush`는 push할 때 알려진 취약점을 검사합니다.
- **바꿀 값**: `$AWS_REGION`
- **정상 결과**: `repositoryUri`가 담긴 JSON. 이미 있으면 `RepositoryAlreadyExistsException`
- 참고: [태그 변경 불가 설정](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html)

### 4-2. 커밋 SHA 태그로 빌드와 push

```sh
git status --short
export IMAGE_TAG=$(git rev-parse --short HEAD)
export ECR_REGISTRY="<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com"
echo "$IMAGE_TAG"
```

- **실행 위치**: 내 컴퓨터(Git Bash), 저장소 최상위 폴더
- **목적**: 이미지 태그로 쓸 커밋 SHA 준비. `latest`는 어떤 코드인지 알 수 없어 롤백이 어렵기 때문에 쓰지 않습니다.
- **바꿀 값**: `<AWS_ACCOUNT_ID>`, `<AWS_REGION>`
- **정상 결과**: `git status --short`가 아무것도 출력하지 않음(깨끗함). `echo`가 7자리 정도의 SHA(예: 커밋 해시 앞부분)를 출력

```sh
docker build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t "$ECR_REGISTRY/universe-backend:$IMAGE_TAG" backend

docker push "$ECR_REGISTRY/universe-backend:$IMAGE_TAG"
```

- **실행 위치**: 내 컴퓨터(Git Bash). 먼저 ECR 로그인이 되어 있어야 함 ([ECS_DEPLOYMENT_GUIDE.md 3장](ECS_DEPLOYMENT_GUIDE.md#3-ecr-저장소-생성))
- **목적**: SHA 태그 이미지를 만들어 ECR에 올림
- **바꿀 값**: 없음(위에서 만든 변수 사용)
- **정상 결과**: push 마지막 줄에 `<IMAGE_TAG>: digest: sha256:... size: ...`

### 4-3. 업로드 확인

```sh
aws ecr describe-images \
  --repository-name universe-backend \
  --image-ids imageTag="$IMAGE_TAG" \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: ECR에 이미지가 올라갔는지 확인
- **바꿀 값**: 없음
- **정상 결과**: `imageTags`에 `$IMAGE_TAG`가 있는 JSON. `ImageNotFoundException`이면 push 실패

기록: 이번 배포 이미지 URI = `<ECR_REGISTRY>/universe-backend:<IMAGE_TAG>`

---

## 5. 런타임 비밀값 (Secrets Manager)

Secrets Manager(비밀번호·키를 암호화해 보관하고 권한 있는 대상에게만 꺼내 주는 서비스)에 저장하고, Task Definition의 `secrets` 항목으로 주입합니다. `[확인됨: ECS_DEPLOYMENT_GUIDE.md 5장]`

### 5-1. 환경변수 표

| 이름 | 설명 | 비밀 여부 | 값의 출처 | 주입 방식 |
|---|---|---|---|---|
| `DB_URL` | JDBC 접속 주소. `jdbc:mysql://<RDS_ENDPOINT>:3306/universe?useSSL=true&serverTimezone=UTC` 형태 `[확인됨: ECS_DEPLOYMENT_GUIDE.md]` | 아니오 (주소만 담김) | RDS 콘솔 → 연결 및 보안 → 엔드포인트 | `environment` |
| `DB_USERNAME` | 앱 전용 DB 사용자 이름. 관리자(master) 계정은 쓰지 않는 것을 권장 `[결정 필요]` | 예 | RDS에 직접 만든 앱 사용자 ([ARCHITECTURE.md 4장](ARCHITECTURE.md#4-rds-설정)) | `secrets` |
| `DB_PASSWORD` | 앱 전용 DB 사용자 비밀번호 | 예 | 앱 사용자 생성 때 만든 무작위 값 | `secrets` |
| `JWT_SECRET_KEY` | JWT 서명 키. 32바이트 이상 무작위 값 `[가정 - 확인 필요]` | 예 | 새로 생성 (Compose 기본값 사용 금지 `[확인됨: compose.yaml, ECS_DEPLOYMENT_GUIDE.md]`) | `secrets` |
| `AI_SERVER_BASE_URL` | AI 서버 내부 주소. `http://<AI_SERVICE_NAME>:8000` | 아니오 | Service Connect / Cloud Map 이름 `[결정 필요]` | `environment` |
| `MAIL_HOST` | SMTP 서버 주소 | 아니오 | 메일 서비스 (예: Gmail이면 `smtp.gmail.com`) `[확인됨: backend/.env.example]` | `environment` |
| `MAIL_PORT` | SMTP 포트 | 아니오 | 기본 `587` `[확인됨: application.yml]` | `environment` |
| `MAIL_USERNAME` | SMTP 로그인 계정 | 예 (계정 노출 방지) | 팀 발송용 메일 계정 `[결정 필요]` | `secrets` |
| `MAIL_PASSWORD` | SMTP 비밀번호 (Gmail이면 앱 비밀번호) | 예 | 메일 계정 보안 설정에서 발급 | `secrets` |
| `MAIL_FROM` | 보내는 사람 주소. 없으면 `MAIL_USERNAME` 사용 `[확인됨: application.yml]` | 아니오 | 팀 발송용 주소 | `environment` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | (선택) `validate`로 덮어쓸 때만 | 아니오 | 팀 결정 | `environment` `[결정 필요]` |
| `JAVA_TOOL_OPTIONS` | (선택) JVM 메모리 비율 등. 예: `-XX:MaxRAMPercentage=75` | 아니오 | task 메모리에 맞춰 결정 | `environment` `[가정 - 확인 필요]` |

- 비밀값의 실제 값은 이 문서, 슬랙, 저장소 어디에도 적지 않습니다.
- `DB_URL`의 `useSSL=true`는 RDS와 암호화 연결을 쓴다는 뜻입니다. 연결 오류가 나면 11장을 참고합니다. `[가정 - 확인 필요]`

### 5-2. Secret 만들기

비밀값을 터미널에 입력하면 셸 기록(history)에 남으므로 **AWS 콘솔에서 만드는 것**을 권장합니다.

- **실행 위치**: AWS 콘솔 → Secrets Manager → 새 보안 암호 저장
- **목적**: 백엔드 비밀값을 한 secret에 키/값(JSON)으로 저장
- **입력**
  - 유형: 다른 유형의 보안 암호
  - 키: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`
  - 이름: `<BACKEND_SECRET_NAME>` (예: `universe/backend/prod` 같은 규칙) `[결정 필요]`
  - 자동 교체(rotation): 이번에는 끔 `[결정 필요]`
- **정상 결과**: 상세 화면에 Secret ARN(`arn:aws:secretsmanager:<AWS_REGION>:<AWS_ACCOUNT_ID>:secret:<BACKEND_SECRET_NAME>-xxxxxx`)이 보임 → 2-2 기록표에 적기
- 콘솔 화면은 바뀔 수 있습니다. → [Secrets Manager 보안 암호 생성 문서](https://docs.aws.amazon.com/secretsmanager/latest/userguide/create_secret.html)

> RDS가 관리자 비밀번호를 Secrets Manager에 자동 저장하는 기능도 있지만, 그 비밀번호는 관리자 계정용입니다. 앱은 별도 사용자를 쓰는 것을 권장합니다. `[결정 필요]` → [RDS와 Secrets Manager 연동](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html)

### 5-3. Task Definition에서 참조하는 형식

JSON secret의 키 하나를 꺼낼 때는 `valueFrom`에 `<SECRET_ARN>:<키 이름>::` 형식을 씁니다. → [ECS Secrets Manager 주입 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html) `[가정 - 확인 필요]`

```json
"secrets": [
  { "name": "DB_USERNAME",    "valueFrom": "<BACKEND_SECRET_ARN>:DB_USERNAME::" },
  { "name": "DB_PASSWORD",    "valueFrom": "<BACKEND_SECRET_ARN>:DB_PASSWORD::" },
  { "name": "JWT_SECRET_KEY", "valueFrom": "<BACKEND_SECRET_ARN>:JWT_SECRET_KEY::" },
  { "name": "MAIL_USERNAME",  "valueFrom": "<BACKEND_SECRET_ARN>:MAIL_USERNAME::" },
  { "name": "MAIL_PASSWORD",  "valueFrom": "<BACKEND_SECRET_ARN>:MAIL_PASSWORD::" }
]
```

---

## 6. ECS Task Definition

Task Definition(컨테이너를 어떤 이미지·포트·메모리·권한으로 실행할지 적은 설계도)을 등록합니다.

### 6-1. 두 가지 IAM 역할 구분

IAM 역할(role: AWS 서비스에 권한을 빌려주는 신분증)은 두 개이고, 용도가 다릅니다. `[확인됨: ECS_DEPLOYMENT_GUIDE.md 5장]`

| 구분 | 누가 쓰나 | 언제 | 백엔드에 필요한 권한 |
|---|---|---|---|
| **Task execution role** (`executionRoleArn`) | ECS 에이전트 | 컨테이너가 **시작되기 전** | ECR 이미지 pull, CloudWatch Logs 기록, **Secrets Manager 값 읽기**(`secretsmanager:GetSecretValue`, 위 secret ARN만) |
| **Task role** (`taskRoleArn`) | 백엔드 애플리케이션 코드 | 컨테이너가 **실행되는 중** | 현재는 없음 (코드가 AWS API를 호출하지 않음 `[확인됨: backend/build.gradle에 AWS SDK 없음]`). S3로 바꾸면 해당 버킷 권한만 추가 `[결정 필요]` |

- execution role은 AWS 관리형 정책 `AmazonECSTaskExecutionRolePolicy` + secret 읽기 권한을 추가로 붙이는 방식이 일반적입니다. secret을 기본 키가 아닌 고객 관리 KMS 키로 암호화했다면 `kms:Decrypt`도 필요합니다. `[가정 - 확인 필요]`
- 참고: [Task execution role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html), [Task role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)

### 6-2. 주요 값

| 항목 | 값 | 표시 |
|---|---|---|
| 시작 유형 | `FARGATE` | `[확인됨: ECS_DEPLOYMENT_GUIDE.md]` |
| 네트워크 모드 | `awsvpc` (task마다 자체 네트워크 인터페이스와 IP를 받는 방식) | `[확인됨: ECS_DEPLOYMENT_GUIDE.md]` |
| CPU 아키텍처 | `X86_64` (이미지와 일치) | `[확인됨: ECS_DEPLOYMENT_GUIDE.md]` |
| 컨테이너 포트 | `8080/tcp` | `[확인됨: backend/Dockerfile]` |
| 컨테이너 상태 확인 | `curl -fsS http://127.0.0.1:8080/actuator/health/readiness` | `[확인됨: backend/Dockerfile의 curl·경로]` |
| 상태 확인 시작 유예(`startPeriod`) | `<HEALTHCHECK_START_PERIOD>` (Dockerfile은 60초) | `[가정 - 확인 필요]` |
| task CPU / 메모리 | `<TASK_CPU>` / `<TASK_MEMORY>` | `[결정 필요]` — 가능한 조합은 [Fargate task 크기 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size) |
| 로그 | `awslogs`, 그룹 `/ecs/universe-backend` | `[결정 필요: 이름 규칙]` |
| 업로드 볼륨 | EFS를 쓰면 `/app/uploads`에 마운트 | `[결정 필요]` |

### 6-3. Task Definition 뼈대

저장 위치 제안: `deploy/ecs/backend-task-def.json` (비밀값이 없으므로 저장소에 둘 수 있음) `[결정 필요]`

```json
{
  "family": "universe-backend",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "runtimePlatform": { "cpuArchitecture": "X86_64", "operatingSystemFamily": "LINUX" },
  "cpu": "<TASK_CPU>",
  "memory": "<TASK_MEMORY>",
  "executionRoleArn": "<EXECUTION_ROLE_ARN>",
  "taskRoleArn": "<TASK_ROLE_ARN>",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<ECR_REGISTRY>/universe-backend:<IMAGE_TAG>",
      "essential": true,
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "environment": [
        { "name": "DB_URL", "value": "jdbc:mysql://<RDS_ENDPOINT>:3306/universe?useSSL=true&serverTimezone=UTC" },
        { "name": "AI_SERVER_BASE_URL", "value": "http://<AI_SERVICE_NAME>:8000" },
        { "name": "MAIL_HOST", "value": "<MAIL_HOST>" },
        { "name": "MAIL_PORT", "value": "587" },
        { "name": "MAIL_FROM", "value": "<MAIL_FROM>" }
      ],
      "secrets": [
        "← 5-3의 목록을 그대로 넣기"
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -fsS http://127.0.0.1:8080/actuator/health/readiness || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/universe-backend",
          "awslogs-region": "<AWS_REGION>",
          "awslogs-stream-prefix": "backend",
          "awslogs-create-group": "true"
        }
      }
    }
  ]
}
```

- `"secrets"` 안의 문자열은 설명용입니다. 실제 파일에는 5-3의 JSON 배열을 넣습니다.
- `awslogs-create-group`을 쓰면 execution role에 `logs:CreateLogGroup` 권한도 필요합니다. 로그 그룹을 미리 만들면 이 줄을 빼도 됩니다. `[가정 - 확인 필요]`
- 파라미터 설명: [Task Definition 파라미터 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)

### 6-4. 등록

```sh
aws ecs register-task-definition \
  --cli-input-json file://deploy/ecs/backend-task-def.json \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash) 또는 AWS 콘솔 → ECS → 태스크 정의 → 새 태스크 정의(JSON 붙여넣기)
- **목적**: Task Definition 새 revision(수정할 때마다 1씩 올라가는 버전 번호) 등록
- **바꿀 값**: JSON 파일 안의 모든 `<...>`
- **정상 결과**: `"taskDefinitionArn": "...:task-definition/universe-backend:<REVISION>"` → revision 번호 기록

---

## 7. Target Group과 ALB 경로 규칙

ALB(Application Load Balancer: 요청 경로를 보고 알맞은 서비스로 나눠 주는 AWS 부하 분산기) 생성은 [ECS_DEPLOYMENT_GUIDE.md 7장](ECS_DEPLOYMENT_GUIDE.md#7-alb와-ecs-service-생성)을 따릅니다. ALB를 누가 만들지는 `[결정 필요]`입니다.

### 7-1. 백엔드 Target Group

Target Group(ALB가 요청을 보낼 대상 묶음)을 만듭니다.

| 항목 | 값 | 표시 |
|---|---|---|
| 이름 | `universe-backend-tg` | `[결정 필요: 이름 규칙]` |
| 대상 유형 | **IP** (Fargate `awsvpc`는 IP 유형 필수) | `[가정 - 확인 필요]` |
| 프로토콜 / 포트 | HTTP / 8080 | `[확인됨: ECS_DEPLOYMENT_GUIDE.md, backend/Dockerfile]` |
| VPC | `<VPC_ID>` | |
| 상태 확인 경로 | `/actuator/health/readiness` | `[확인됨: ECS_DEPLOYMENT_GUIDE.md, application.yml]` |
| 성공 코드 | `200` | `[가정 - 확인 필요]` |
| 스티키 세션 | 끔 (task 1개 기준). task를 늘리면 SockJS 대체 방식 때문에 필요할 수 있음 | `[가정 - 확인 필요]` `[결정 필요]` |

참고: [Target Group 상태 확인 문서](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)

### 7-2. 경로 규칙

`[확인됨: ECS_DEPLOYMENT_GUIDE.md 7장]`의 규칙을 그대로 따르고, 우선순위 번호만 제안합니다. **우선순위 번호는 프론트 담당자와 반드시 같게 맞춥니다.** `[결정 필요]`

| 우선순위(제안) | 조건(경로) | 동작 |
|---:|---|---|
| 10 | `/api/*` | `universe-backend-tg`로 전달 |
| 20 | `/uploads/*` | `universe-backend-tg`로 전달 |
| 30 | `/ws-stomp*` | `universe-backend-tg`로 전달 |
| 기본(default) | 그 외 전부 | `universe-frontend-tg`로 전달 |

- 세 경로를 규칙 하나에 값 3개로 넣어도 됩니다. 규칙당 조건 값 개수 제한은 [규칙 조건 문서](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html)를 확인합니다. `[가정 - 확인 필요]`
- 경로 패턴은 대소문자를 구분합니다. `[가정 - 확인 필요]`
- `/ws-stomp*`는 SockJS가 쓰는 `/ws-stomp/info`, `/ws-stomp/<서버>/<세션>/websocket` 등을 모두 포함합니다. `[가정 - 확인 필요]`
- `/actuator/*`는 규칙에 없으므로 외부에 노출되지 않고 기본 규칙(프론트)으로 갑니다. Target Group 상태 확인은 ALB가 task IP로 직접 보내므로 영향이 없습니다. `[가정 - 확인 필요]`
- ALB는 WebSocket을 별도 설정 없이 지원합니다. 유휴 제한 시간(idle timeout)보다 프론트 STOMP heartbeat(4초)가 짧아 연결이 유지될 것으로 봅니다. `[확인됨: frontend/src/lib/useChatSocket.js]` `[가정 - 확인 필요]` → [ALB 문서](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html)

---

## 8. ECS Service 생성 및 배포

ECS Service(지정한 개수의 task를 항상 실행해 두고, 죽으면 다시 띄우는 관리자)를 만듭니다.

### 8-1. 설정값

| 항목 | 값 | 표시 |
|---|---|---|
| 클러스터 | `<CLUSTER_NAME>` | `[결정 필요]` |
| 서비스 이름 | `universe-backend` | `[결정 필요: 이름 규칙]` |
| Task Definition | `universe-backend:<REVISION>` | |
| 원하는 task 수 | **1** (메모리 브로커·로컬 업로드 때문) | `[가정 - 확인 필요]` `[결정 필요]` |
| 서브넷 | `<PRIVATE_SUBNET_A>`, `<PRIVATE_SUBNET_C>` | `[결정 필요: 공개/비공개 배치]` |
| 보안 그룹 | `<BACKEND_SG_ID>` (ALB에서 8080만 허용) | [ARCHITECTURE.md 3장](ARCHITECTURE.md#3-보안-그룹-연결표) |
| 퍼블릭 IP | 끔 (비공개 서브넷 기준) | `[확인됨: ECS_DEPLOYMENT_GUIDE.md 6장]` |
| 로드 밸런서 | ALB, 컨테이너 `backend:8080` → `universe-backend-tg` | |
| 상태 확인 유예 기간 | `<HEALTH_CHECK_GRACE_PERIOD>`초 — Spring 시작 시간보다 길게 | `[가정 - 확인 필요]` |
| 배포 회로 차단기 | 켜기 + 실패 시 롤백 | `[결정 필요]` → [문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html) |
| Service Connect | AI 서버를 부르는 쪽(client)으로 설정 | `[결정 필요]` → [문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html) |
| ECS Exec | 켜기 (문제 생길 때 컨테이너 안에서 명령 실행) | `[결정 필요]` → [문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html) |

- task 수가 1이면 배포할 때 새 task가 healthy가 된 뒤 옛 task를 내리도록 최소 정상 비율 100%, 최대 비율 200%가 일반적입니다. `[가정 - 확인 필요]`

### 8-2. 생성

처음에는 **AWS 콘솔**에서 만드는 것을 권장합니다(설정을 눈으로 확인하기 쉬움).

- **실행 위치**: AWS 콘솔 → ECS → 클러스터 `<CLUSTER_NAME>` → 서비스 → 생성
- **목적**: 8-1의 값으로 백엔드 Service 생성
- **바꿀 값**: 8-1 표의 모든 `<...>`
- **정상 결과**: 서비스 상태 `활성`, 몇 분 뒤 실행 중 task 1개
- 콘솔 화면은 바뀔 수 있습니다. → [ECS 서비스 생성 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-console-v2.html)

### 8-3. 배포 진행 확인

```sh
aws ecs describe-services \
  --cluster <CLUSTER_NAME> --services universe-backend \
  --query 'services[0].deployments[].{status:status,rollout:rolloutState,running:runningCount,desired:desiredCount,taskDef:taskDefinition}' \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: 배포가 끝났는지 확인
- **바꿀 값**: `<CLUSTER_NAME>`
- **정상 결과**: `PRIMARY` 하나만 남고 `rollout`이 `COMPLETED`, `running`과 `desired`가 같음

---

## 9. 배포 후 점검

### 9-1. 체크리스트

- [ ] task 상태 `RUNNING`, 컨테이너 상태 확인 `HEALTHY`
- [ ] Target Group 대상 `healthy`
- [ ] CloudWatch 로그에 시작 완료 줄이 있고 DB 연결 오류가 없음
- [ ] `https://<DOMAIN>/api/v1/schools` → 200 JSON
- [ ] `https://<DOMAIN>/ws-stomp/info` → `"websocket":true` 포함 JSON
- [ ] 브라우저에서 로그인 → 채팅방 입장 → 메시지 전송이 실시간으로 보임
- [ ] 이미지 업로드 → `https://<DOMAIN>/uploads/<파일명>`으로 보임
- [ ] 이메일 인증 요청 응답에 **인증 코드가 없음** + 실제 메일 도착 (1-11 ⚠)
- [ ] 중고거래 상품 기능(AI 위험도 분석)에서 `AI_SERVER_ERROR`가 나지 않음 `[확인됨: backend/src/main/java/com/universe/market/service/MarketItemService.java, ai/controller/AiRiskController.java]` — 정확히 어떤 화면에서 호출되는지는 `[가정 - 확인 필요]`

### 9-2. 명령어

```sh
aws elbv2 describe-target-health \
  --target-group-arn <BACKEND_TG_ARN> \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: ALB가 보는 백엔드 대상 상태 확인
- **바꿀 값**: `<BACKEND_TG_ARN>`
- **정상 결과**: `"State": "healthy"`

```sh
aws logs tail /ecs/universe-backend --since 15m --follow --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: 백엔드 로그 실시간 보기
- **바꿀 값**: 로그 그룹 이름을 바꿨다면 수정
- **정상 결과**: Spring 시작 로그, 오류 스택트레이스 없음. `show-sql: true`라 SQL이 많이 보이는 것은 정상

```sh
curl -i https://<DOMAIN>/api/v1/schools
curl -s https://<DOMAIN>/ws-stomp/info
```

- **실행 위치**: 내 컴퓨터(Git Bash)
- **목적**: ALB → 백엔드 경로 규칙과 앱 응답 확인
- **바꿀 값**: `<DOMAIN>`
- **정상 결과**: 1번 `HTTP/2 200` + JSON, 2번 `"websocket":true` 포함 JSON. HTML이 오면 경로 규칙이 프론트로 가고 있는 것

---

## 10. 업데이트와 롤백

### 10-1. 업데이트

1. 새 커밋으로 4장(빌드·push, 새 SHA 태그)
2. Task Definition JSON의 `image` 태그만 바꿔 6-4로 새 revision 등록
3. 서비스를 새 revision으로 업데이트

```sh
aws ecs update-service \
  --cluster <CLUSTER_NAME> --service universe-backend \
  --task-definition universe-backend:<NEW_REVISION> \
  --region "$AWS_REGION"
```

- **실행 위치**: 내 컴퓨터(Git Bash) 또는 AWS 콘솔 → 서비스 → 업데이트
- **목적**: 새 이미지로 교체 배포
- **바꿀 값**: `<CLUSTER_NAME>`, `<NEW_REVISION>`
- **정상 결과**: 8-3 명령에서 새 revision이 `PRIMARY`, `COMPLETED`

비밀값만 바꿨을 때는 이미 떠 있는 task에 반영되지 않으므로 `--force-new-deployment`로 task를 다시 띄웁니다. `[가정 - 확인 필요]`

### 10-2. 롤백

배포 기록표를 남겨 두면 롤백할 revision을 바로 찾을 수 있습니다.

| 날짜 | 커밋 SHA | Task Def revision | 결과 |
|---|---|---|---|
| `<YYYY-MM-DD>` | `<SHA>` | `<REV>` | 성공 / 롤백 |

- **자동**: 배포 회로 차단기를 켰다면 새 task가 계속 실패할 때 이전 revision으로 돌아갑니다.
- **수동**: 10-1의 `update-service`에 **이전** revision 번호를 넣습니다.
- ⚠ 이미지는 되돌릴 수 있지만 **DB 구조 변경은 되돌아가지 않습니다.** `ddl-auto: update`가 추가한 컬럼은 남습니다. `[가정 - 확인 필요]`

---

## 11. 자주 발생하는 문제

### 11-1. DB 연결 실패

**증상**: task가 시작 직후 종료, 로그에 `Communications link failure`, `Access denied`, `Unknown database` 등

| 원인 | 확인 방법 |
|---|---|
| RDS 보안 그룹이 백엔드 보안 그룹을 허용하지 않음 | RDS SG 인바운드에 `3306` ← `<BACKEND_SG_ID>`가 있는지 |
| `DB_URL` 엔드포인트·포트·DB 이름 오타 | Task Definition의 `DB_URL`과 RDS 콘솔 엔드포인트 비교 |
| `universe` DB가 없음 (`schema.sql` 미적용) | `Unknown database 'universe'` 로그 |
| 앱 사용자 권한 부족 | `Access denied` 로그, 사용자 `GRANT` 확인 |
| SSL 관련 오류 | `useSSL`/인증서 관련 로그. RDS SSL 설정 문서 확인 `[가정 - 확인 필요]` → [RDS MySQL SSL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-ssl-connections.html) |
| 서로 다른 VPC | RDS와 ECS가 같은 `<VPC_ID>`인지 |

⚠ 해결하려고 RDS 3306을 `0.0.0.0/0`에 열지 않습니다.

### 11-2. Target Group 대상 unhealthy

**증상**: task가 계속 교체됨, 서비스 이벤트에 `failed ELB health checks`

| 원인 | 확인 방법 |
|---|---|
| Spring 시작이 유예 기간보다 오래 걸림 | 로그의 시작 소요 시간 vs 상태 확인 유예 기간 |
| 상태 확인 경로·포트 오타 | Target Group: `/actuator/health/readiness`, 8080 |
| 백엔드 SG가 ALB SG의 8080을 허용하지 않음 | 백엔드 SG 인바운드 |
| 앱은 떴지만 readiness가 DOWN | ECS Exec으로 컨테이너 안에서 `curl -i http://127.0.0.1:8080/actuator/health/readiness` |
| 메모리 부족으로 종료 | task 중지 사유에 `OutOfMemory`, 종료 코드 137 `[가정 - 확인 필요]` |

### 11-3. 비밀값 읽기 실패

**증상**: task가 `PENDING`에서 멈추거나 `STOPPED`, 중지 사유에 `ResourceInitializationError: unable to pull secrets` 등 `[가정 - 확인 필요]`

| 원인 | 확인 방법 |
|---|---|
| **execution role**에 `secretsmanager:GetSecretValue` 없음 (task role에 붙이는 실수가 흔함) | IAM → execution role 정책 |
| `valueFrom`의 ARN 또는 키 이름 오타 | Secret ARN, JSON 키 대소문자 |
| 비공개 서브넷에서 Secrets Manager에 연결할 경로 없음 | NAT 게이트웨이 또는 `secretsmanager` VPC 엔드포인트 존재 여부 |
| 고객 관리 KMS 키 권한 부족 | `kms:Decrypt` 권한 |

이미지를 못 받는 경우(`CannotPullContainerError`)도 같은 방식으로 execution role과 ECR 연결 경로(NAT 또는 `ecr.api`/`ecr.dkr`/S3 엔드포인트)를 확인합니다. → [ECR VPC 엔드포인트 문서](https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html)

### 11-4. WebSocket 실패

**증상**: 채팅이 새로고침해야만 보임, 브라우저 콘솔에 `[STOMP]` 연결 오류

| 원인 | 확인 방법 |
|---|---|
| ALB 규칙에 `/ws-stomp*` 없음 → 프론트로 감 | `curl https://<DOMAIN>/ws-stomp/info` 결과가 HTML인지 |
| 백엔드 task가 2개 이상 (메모리 브로커) | 서비스 원하는 task 수 |
| SockJS가 WebSocket 대신 다른 방식으로 대체되고 task가 여러 개 | 브라우저 개발자 도구 Network 탭 |
| STOMP 연결 때 토큰 오류 | 백엔드 로그의 `StompHandler` 관련 오류 |
| 프론트 Nginx가 `/ws-stomp`를 받는 구조로 바뀜 | 프론트 담당자와 확인. 현재 `frontend/nginx.conf`에는 프록시 설정 없음 `[확인됨: frontend/nginx.conf]` |

### 11-5. 업로드 파일 유실

**증상**: 배포 뒤 예전 이미지가 깨짐(404)

- 원인: 파일이 컨테이너 안 `/app/uploads`에만 저장되고, task가 바뀌면 사라집니다. `[확인됨: LocalFileService.java, backend/Dockerfile]`
- 임시 대응(시연용): 배포 전후로 유실을 감수하고, 시연 직전에는 재배포하지 않습니다. `[결정 필요]`
- 근본 대응:
  - **EFS**: `/app/uploads`에 EFS 마운트. 코드 수정 없음. 컨테이너가 `app` 사용자로 실행되므로 EFS 액세스 포인트의 소유자·권한 설정 필요 `[가정 - 확인 필요]` → [ECS EFS 볼륨 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html)
  - **S3**: `FileService` 구현을 새로 만들고 URL 형식 변경 필요. 코드 수정 있음
  - 비교는 [ARCHITECTURE.md 6장](ARCHITECTURE.md#6-결정이-필요한-항목)

---

## 확인한 파일

| 파일 | 확인 내용 |
|---|---|
| `ECS_DEPLOYMENT_GUIDE.md` | 공통 배포 절차, 경로 규칙, 환경변수 |
| `DOCKER.md`, `compose.yaml` | 로컬 실행, 환경변수, 업로드 볼륨, schema 마운트 |
| `backend/build.gradle`, `backend/settings.gradle`, `backend/gradle/wrapper/gradle-wrapper.properties` | 버전, 의존성 |
| `backend/Dockerfile`, `backend/.dockerignore` | 이미지 구성, 포트, 상태 확인 |
| `backend/.env.example` | 환경변수 예시 (`AI_SERVER_URL` 불일치) |
| `backend/src/main/resources/application.yml` | 환경변수, ddl-auto, actuator, 메일 |
| `backend/src/test/resources/application-test.yml` | 테스트 프로필 |
| `backend/src/main/resources/schema.sql` | DB·테이블 생성 구문 |
| `backend/src/main/java/com/universe/global/config/WebSocketConfig.java` | WebSocket |
| `backend/src/main/java/com/universe/global/config/WebConfig.java` | 업로드 파일 제공 |
| `backend/src/main/java/com/universe/global/config/WebClientConfig.java` | AI 서버 주소 |
| `backend/src/main/java/com/universe/global/security/SecurityConfig.java` | CORS, 공개 경로 |
| `backend/src/main/java/com/universe/global/security/JwtTokenProvider.java` | JWT |
| `backend/src/main/java/com/universe/file/service/LocalFileService.java` | 업로드 저장 |
| `backend/src/main/java/com/universe/ai/service/AiRiskClient.java` | AI 호출 |
| `backend/src/main/java/com/universe/school/service/SchoolMailService.java` 외 2개 | 메일 대체 동작 |
| `frontend/src/lib/api.js`, `frontend/src/lib/useChatSocket.js`, `frontend/nginx.conf` | 프론트 API·WebSocket 주소 |
| `ai-server/Dockerfile`, `ai-server/serve.py` | AI 서버 포트·경로 |
