# UNI-VERSE ECS 배포 가이드

이 문서는 ECS Fargate 배포를 위해 Docker 이미지와 AWS 리소스를 준비하는 절차를 설명합니다. AWS 리소스를 자동으로 생성하지는 않으므로, 명령을 실행하기 전에 계정별 값을 입력하세요.

## 구성

- 프론트엔드: 운영용 Nginx 컨테이너, 포트 `8080`, 상태 확인 경로 `/health`
- 백엔드: Spring Boot 컨테이너, 포트 `8080`, 준비 상태 경로 `/actuator/health/readiness`
- AI API: FastAPI 컨테이너, 포트 `8000`, 상태 확인 경로 `/health`
- 데이터베이스: ECS 안의 MySQL 컨테이너가 아닌 Amazon RDS for MySQL
- 진입점: Application Load Balancer (ALB)

로컬 개발 환경은 [DOCKER.md](DOCKER.md)에 설명되어 있습니다. Compose에서는 프론트엔드가 Vite로 실행되지만, ECS에서는 frontend Dockerfile의 `production` target을 사용해야 합니다.

## 1. AWS 네트워크와 데이터베이스 준비

1. 사용할 AWS 계정과 리전을 선택합니다.
2. ALB용 public subnet과 ECS task 및 RDS용 private subnet이 있는 VPC를 준비합니다.
3. private subnet에 RDS MySQL 데이터베이스를 생성합니다. `3306` 포트는 backend task 보안 그룹에서만 접근하도록 허용합니다.
4. backend를 시작하기 전에 새 RDS 데이터베이스에 `backend/src/main/resources/schema.sql`을 적용합니다. Compose는 이 파일을 로컬 MySQL 컨테이너에만 마운트하며, ECS는 해당 초기화 마운트를 실행하지 않습니다.
5. backend task 보안 그룹에서 RDS의 `3306` 포트로 연결할 수 있는지 확인합니다.

SQL 파일은 `universe` 데이터베이스를 생성하고 선택합니다. 데이터베이스 생성 권한이 있는 관리자 계정으로 적용하거나, RDS 구성에 맞게 스크립트를 수정한 후 적용하세요.

## 2. 업로드 파일의 영구 저장소 준비

현재 backend는 업로드 파일을 컨테이너의 `uploads` 디렉터리에 저장합니다. ECS task의 로컬 저장소는 임시 공간이며 여러 task가 공유하지 않습니다. 운영 배포 전에 로컬 저장 방식을 Amazon S3로 바꾸거나, EFS를 구성해 `/app/uploads`에 마운트하세요.

S3를 사용한다면 backend task role에 필요한 버킷 권한만 부여하세요. AWS access key를 이미지나 일반 환경변수에 넣지 마세요.

## 3. ECR 저장소 생성

AWS 계정과 리전마다 한 번 실행합니다.

```sh
aws ecr create-repository --repository-name universe-frontend --region "$AWS_REGION"
aws ecr create-repository --repository-name universe-backend --region "$AWS_REGION"
aws ecr create-repository --repository-name universe-ai-server --region "$AWS_REGION"
```

Bash 또는 Git Bash에서 다음 변수를 설정합니다. 실제 계정 ID와 리전을 입력하고, Git commit SHA처럼 변경되지 않는 태그를 사용하세요.

```sh
export AWS_REGION=ap-northeast-2
export AWS_ACCOUNT_ID=<AWS_ACCOUNT_ID>
export IMAGE_TAG=$(git rev-parse --short HEAD)
export ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Docker를 ECR에 로그인합니다.

```sh
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

## 4. 이미지 빌드 및 push

다음 명령은 일반적인 ECS Fargate x86_64 task definition과 호환되는 Linux AMD64 이미지를 빌드합니다. Task Definition의 CPU 아키텍처도 이미지와 일치시켜야 합니다.

```sh
docker build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t "$ECR_REGISTRY/universe-backend:$IMAGE_TAG" backend

docker build --platform linux/amd64 \
  -f ai-server/Dockerfile \
  -t "$ECR_REGISTRY/universe-ai-server:$IMAGE_TAG" ai-server

docker build --platform linux/amd64 \
  -f frontend/Dockerfile --target production \
  -t "$ECR_REGISTRY/universe-frontend:$IMAGE_TAG" frontend

docker push "$ECR_REGISTRY/universe-backend:$IMAGE_TAG"
docker push "$ECR_REGISTRY/universe-ai-server:$IMAGE_TAG"
docker push "$ECR_REGISTRY/universe-frontend:$IMAGE_TAG"
```

각 ECS Task Definition에서 동일한 버전 태그가 포함된 전체 ECR 이미지 URI를 사용하세요. 재현 가능한 배포와 롤백을 위해 `latest` 태그는 피하세요.

## 5. 런타임 비밀값 저장

데이터베이스 인증 정보, `JWT_SECRET_KEY`, SMTP 인증 정보를 Secrets Manager에 저장합니다. backend Task Definition의 `secrets` 항목으로 주입하고, 이미지나 소스 코드에는 넣지 마세요.

backend 컨테이너에는 다음 런타임 설정이 필요합니다.

| 환경변수 | 값 |
|---|---|
| `DB_URL` | `jdbc:mysql://<RDS_ENDPOINT>:3306/universe?useSSL=true&serverTimezone=UTC` |
| `DB_USERNAME` | RDS 데이터베이스 사용자명 |
| `DB_PASSWORD` | Secrets Manager에 저장한 값 |
| `JWT_SECRET_KEY` | Secrets Manager에 저장한 충분히 긴 무작위 값 |
| `AI_SERVER_BASE_URL` | 비공개 AI 서비스 주소. 예: `http://ai-server:8000` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | 필요한 SMTP 설정 |

ECS task execution role에는 ECR 이미지 pull, CloudWatch Logs 기록, 지정한 비밀값 읽기 권한을 부여합니다. Task role은 별도 역할이며, S3 접근처럼 애플리케이션에 필요한 AWS 권한만 부여하세요.

## 6. ECS Task Definition 등록

서비스별로 Fargate Task Definition을 하나씩, 총 3개 등록합니다. 네트워크 모드는 `awsvpc`로 설정하고 4단계의 ECR 이미지 URI를 사용합니다.

| 서비스 | 컨테이너 포트 | 상태 확인 |
|---|---:|---|
| 프론트엔드 | `8080` | `GET /health` |
| 백엔드 | `8080` | `GET /actuator/health/readiness` |
| AI API | `8000` | `GET /health` |

CloudWatch 로그 그룹, task CPU와 메모리, execution role, task role을 설정합니다. Backend와 AI task에는 public IP를 할당하지 않는 것이 좋습니다. `AI_SERVER_BASE_URL`에는 AI 서비스로 연결되는 private Cloud Map 또는 ECS Service Connect 이름을 설정합니다.

## 7. ALB와 ECS Service 생성

1. Public subnet에 internet-facing ALB를 생성하고, 운영 도메인용 ACM 인증서로 HTTPS를 활성화합니다.
2. HTTP를 사용하는 frontend 및 backend target group을 생성합니다. Frontend 상태 확인 경로는 `/health`, backend는 `/actuator/health/readiness`로 설정합니다.
3. ALB 경로 규칙을 추가합니다. `/api/*`, `/uploads/*`, `/ws-stomp*`는 backend target group으로 보내고, 나머지 기본 경로는 frontend target group으로 보냅니다.
4. private subnet에 frontend, backend, AI용 ECS Fargate Service를 각각 생성합니다.
5. ALB 보안 그룹에서 frontend와 backend 컨테이너 포트로 접근하도록 허용합니다. Backend에서 AI의 `8000`, RDS의 `3306` 포트로 접근하도록 허용합니다. RDS와 AI API를 public으로 노출하지 마세요.
6. NAT 또는 필요한 VPC endpoint를 통해 task가 ECR, CloudWatch Logs, Secrets Manager에 접근할 수 있도록 private outbound 경로를 준비합니다.

## 8. 배포 및 확인

각 ECS Service가 새 Task Definition revision을 사용하도록 생성하거나 업데이트합니다. Task가 `RUNNING` 상태인지, target group의 대상이 healthy인지, CloudWatch 로그에서 애플리케이션과 데이터베이스 연결이 성공했는지 확인합니다.

공개 frontend, 인증이 필요한 backend API, VPC 내부에서 호출한 AI 상태 확인 경로, WebSocket 동작을 검증합니다. 배포가 실패하면 이전 Task Definition revision과 이미지 태그로 Service를 되돌립니다.

## 현재 자동화 및 운영 전 남은 작업

- 저장소의 GitHub Actions workflow는 frontend lint, 테스트, build를 실행합니다. ECR 이미지 빌드와 push는 자동화되어 있지 않으므로 위 명령을 수동으로 실행해야 합니다.
- Compose에는 개발용 데이터베이스와 JWT 기본값이 있습니다. AWS에서는 절대 이 기본값을 사용하지 마세요.
- ECS task를 교체하거나 확장하기 전에 로컬 업로드 저장 방식을 S3 또는 공유 영구 저장소로 바꿔야 합니다.
- AWS 계정, 리전, VPC, RDS endpoint, 도메인, secret ARN은 배포 환경별 값입니다. ECS 리소스를 만들기 전에 실제 값으로 지정하세요.