# UNI-VERSE 프론트엔드 ECS 배포 가이드

이 문서는 UNI-VERSE React/Vite 프론트엔드를 production Nginx 컨테이너로 빌드하고 Amazon ECS Fargate에 배포하는 절차를 설명합니다. ECS 리소스를 자동으로 생성하지는 않습니다. AWS 계정, 리전, VPC, 도메인 등 환경별 값은 직접 입력해야 합니다.

## 1. 현재 프론트엔드 구성

- 앱: React + Vite SPA
- production 이미지: `frontend/Dockerfile`의 `production` target
- 정적 파일 서버: `nginxinc/nginx-unprivileged`
- 컨테이너 포트: `8080`
- 정적 파일 경로 및 SPA fallback: `frontend/nginx.conf`
- 컨테이너 health check: `GET /health`
- 프론트엔드 API 요청: 상대 경로 `/api/...`

개발 환경에서는 Vite가 `/api`, `/uploads`, `/ws-stomp`를 backend로 proxy합니다. 이 Vite proxy는 개발 서버에서만 동작합니다. Production 이미지에는 Vite 서버가 포함되지 않으므로, AWS에서는 ALB 경로 규칙이 API와 WebSocket 요청을 backend로 전달해야 합니다.

### Production 요청 흐름

```text
브라우저
  |
  | HTTPS, 같은 도메인
  v
Application Load Balancer
  |-- /api/*, /uploads/*, /ws-stomp* --> Spring backend target group
  `-- 그 외 경로 ---------------------> Frontend Nginx target group
```

이 구조에서는 브라우저가 같은 도메인을 사용하므로 frontend 정적 자산과 API 간 CORS 설정 부담이 줄어듭니다.

## 2. 배포 전 확인할 사항

1. AWS 계정과 리전을 정합니다.
2. ALB가 위치할 public subnet과 ECS task가 위치할 private subnet을 준비합니다.
3. ALB에서 ECS frontend task의 TCP `8080` 포트로 연결할 수 있도록 보안 그룹을 설정합니다.
4. ECS task에서 ECR 이미지와 CloudWatch Logs에 접근할 수 있도록 NAT 또는 필요한 VPC endpoint를 준비합니다.
5. API와 이미지 업로드 기능을 사용할 계획이면 backend 서비스와 ALB 경로 규칙도 함께 배포합니다.
6. 실제 운영 도메인과 HTTPS를 사용할 경우 DNS 레코드와 ACM 인증서를 준비합니다.

프론트엔드만 배포해도 정적 페이지는 열 수 있지만, backend 경로를 ALB에 연결하지 않으면 로그인·API·이미지 업로드·채팅 WebSocket 요청은 동작하지 않습니다.

## 3. Production 이미지 로컬 빌드 및 확인

저장소 루트에서 실행합니다. `production` target을 지정해야 Vite 개발 서버 대신 Nginx 정적 서버 이미지가 만들어집니다.

```sh
docker build --platform linux/amd64 \
  -f frontend/Dockerfile \
  --target production \
  -t universe-frontend:local \
  frontend
```

컨테이너를 로컬에서 확인합니다.

```sh
docker run --rm -d --name universe-frontend-test -p 18081:8080 universe-frontend:local
curl -i http://localhost:18081/health
curl -I http://localhost:18081/
docker stop universe-frontend-test
```

첫 요청은 `200`과 `ok`를 반환해야 합니다. `/`는 SPA의 `index.html`을 반환해야 합니다. 앱에 client-side route가 있다면 해당 route를 직접 요청했을 때도 `index.html`로 fallback되는지 확인합니다.

Docker Desktop에서 포트 충돌이 있으면 `18081`을 사용 가능한 로컬 포트로 변경합니다.

## 4. ECR 저장소 준비

저장소가 아직 없다면 AWS 계정과 리전에서 한 번 생성합니다.

```sh
aws ecr create-repository \
  --repository-name universe-frontend \
  --region "$AWS_REGION"
```

Git Bash 기준으로 배포 변수를 설정합니다. 실제 AWS 계정 ID와 리전을 사용하고, `IMAGE_TAG`에는 커밋 SHA처럼 변경되지 않는 값을 사용합니다.

```sh
export AWS_REGION=ap-northeast-2
export AWS_ACCOUNT_ID=<AWS_ACCOUNT_ID>
export IMAGE_TAG=$(git rev-parse --short HEAD)
export ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

GitHub Actions나 AWS CLI에서 사용할 자격 증명은 AWS IAM Identity Center 또는 OIDC 역할 등 승인된 인증 방법으로 구성합니다. Access key를 문서, 저장소, 이미지에 기록하지 마세요.

## 5. 이미지 빌드 및 ECR push

ECR에 Docker를 로그인하고 production 이미지를 빌드합니다.

```sh
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker build --platform linux/amd64 \
  -f frontend/Dockerfile \
  --target production \
  -t "$ECR_REGISTRY/universe-frontend:$IMAGE_TAG" \
  frontend

docker push "$ECR_REGISTRY/universe-frontend:$IMAGE_TAG"
```

ECS Task Definition의 image에는 다음과 같은 전체 URI를 지정합니다.

```text
<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/universe-frontend:<GIT_SHA>
```

`latest`만 사용하면 배포 시점의 이미지가 불명확해지고 롤백하기 어려워집니다. 매 배포마다 새 SHA 또는 release tag를 사용하세요.

## 6. ECS Fargate Task Definition

ECS Console에서 Task Definition을 생성할 때 다음 값으로 시작할 수 있습니다.

| 설정 | 권장 시작값 |
|---|---|
| Launch type | AWS Fargate |
| Operating system | Linux |
| CPU architecture | `X86_64` (이미지를 `linux/amd64`로 빌드한 경우) |
| Network mode | `awsvpc` |
| Container name | `frontend` |
| Image URI | 5단계의 ECR 이미지 URI |
| Container port | `8080`, TCP |
| Essential | 활성화 |
| Logging | CloudWatch Logs |
| Task execution role | ECR pull 및 CloudWatch Logs 쓰기 권한이 있는 역할 |

정적 Nginx 서비스는 작은 task 크기로 시작할 수 있습니다. 예를 들어 `0.25 vCPU`와 `0.5 GB`를 초기값으로 검토하고, 실제 메모리 사용량과 트래픽을 확인해 조정합니다. Fargate CPU/메모리 조합은 생성 화면에서 허용되는 값을 선택하세요.

### Health check

Dockerfile에는 다음 컨테이너 health check가 포함되어 있습니다.

```text
GET http://127.0.0.1:8080/health
```

Task Definition에서 이를 재정의한다면 컨테이너 내부에서 실행되는 명령이어야 합니다. ALB target group health check는 별도 설정으로 `/health` 경로를 사용합니다.

## 7. ALB 및 Target Group 연결

### Target Group

- Target type: `IP` (Fargate `awsvpc` 사용 시)
- Protocol: HTTP
- Port: `8080`
- Health check path: `/health`
- Success code: `200`
- ECS service에 연결할 때 target group을 선택합니다.

### Listener와 경로 우선순위

HTTPS listener에 ACM 인증서를 연결하는 것을 권장합니다. HTTP listener를 둘 경우 HTTPS로 redirect합니다.

경로 rule은 frontend 기본 규칙보다 우선순위가 높게 설정합니다.

| 우선순위 예시 | 경로 패턴 | 전달 대상 |
|---:|---|---|
| 10 | `/api/*` | backend target group |
| 20 | `/uploads/*` | backend target group |
| 30 | `/ws-stomp*` | backend target group |
| 기본 규칙 | 그 외 모든 경로 | frontend target group |

`/ws-stomp*` 요청은 채팅 WebSocket 핸드셰이크 경로를 backend에 전달합니다. ALB는 WebSocket을 지원하므로 별도 WebSocket 전용 target group은 필요하지 않지만, 경로 rule이 backend로 향하는지와 보안 그룹이 backend 포트를 허용하는지 확인해야 합니다.

### 보안 그룹

- ALB security group: 인터넷에서 HTTPS `443` 허용. HTTP `80`은 HTTPS redirect 용도로만 허용할 수 있습니다.
- Frontend task security group: ALB security group에서 오는 TCP `8080`만 허용합니다.
- Frontend task에는 public IP를 할당하지 않는 구성을 권장합니다.

ALB의 `/api/*`, `/uploads/*`, `/ws-stomp*` rule은 각각 backend security group의 backend container port에 도달할 수 있어야 합니다.

## 8. ECS Service 생성 및 배포

1. ECS cluster를 생성하거나 기존 Fargate cluster를 선택합니다.
2. Frontend Task Definition revision을 선택해 ECS Service를 생성합니다.
3. private subnet과 frontend task security group을 지정합니다.
4. Public IP 자동 할당은 끄고, ECR pull과 로그 전송에 필요한 outbound 연결을 확인합니다.
5. Application Load Balancer 연결 단계에서 frontend target group, container `frontend:8080`을 선택합니다.
6. 초기 Desired tasks는 `1`로 시작하고 서비스가 안정화된 뒤 최소 2개 또는 autoscaling을 검토합니다.
7. ECS deployment configuration과 health check grace period를 설정하고 Service를 생성합니다.
8. ECS Service의 task가 `RUNNING`이고 target group의 target이 `healthy`인지 확인합니다.

이미지 변경 배포는 새 ECR tag를 사용해 Task Definition의 새 revision을 등록하고 ECS Service를 업데이트합니다. 같은 tag를 덮어쓰는 것보다 immutable tag로 새 revision을 만들면 롤백이 명확합니다.

## 9. 도메인 및 HTTPS

1. ACM에서 운영 도메인용 인증서를 발급하거나 검증된 인증서를 가져옵니다. ALB와 같은 리전의 인증서를 사용합니다.
2. ALB HTTPS listener에 ACM 인증서를 연결합니다.
3. DNS에서 도메인의 alias/CNAME을 ALB로 연결합니다.
4. HTTPS 접속 후 frontend, backend API, 업로드, WebSocket 경로를 점검합니다.

CloudFront를 추가하는 경우 cache behavior가 필요합니다. `/api/*`, `/uploads/*`, `/ws-stomp*`는 ALB origin으로 전달하고, 앱 정적 파일은 CloudFront에서 캐시하도록 구성합니다. 우선 ECS+ALB로 배포를 안정화한 후 추가하는 편이 단순합니다.

## 10. 배포 후 점검

- `https://<도메인>/`이 frontend 앱을 표시하는지 확인합니다.
- `https://<도메인>/health`가 `200`과 `ok`를 반환하는지 확인합니다.
- 브라우저 Network 탭에서 API 호출이 같은 도메인의 `/api/...`로 나가는지 확인합니다.
- 로그인/회원가입 등 backend API 요청이 backend target group으로 전달되는지 확인합니다.
- 이미지 업로드 후 URL이 `/uploads/...`로 접근되는지 확인합니다.
- 채팅 연결이 있다면 `/ws-stomp` 핸드셰이크와 재연결을 확인합니다.
- ECS task 교체 후에도 업로드 파일이 유지되는지 확인합니다. 현재 backend의 로컬 파일 저장 방식은 ECS task 간 영구 공유를 보장하지 않습니다.
- CloudWatch Logs와 ALB access log를 확인하고 4xx/5xx 비율을 모니터링합니다.

## 11. 롤백

1. 마지막 정상 frontend ECR 이미지 tag와 Task Definition revision을 기록해 둡니다.
2. 배포 이후 target health 또는 사용자 요청에서 문제가 보이면 ECS Service를 직전 정상 Task Definition revision으로 업데이트합니다.
3. target group이 다시 healthy가 되는지 확인합니다.
4. 문제가 해결되면 변경한 이미지나 ALB rule을 별도로 분석한 후 다음 배포에서 수정합니다.

고정된 이미지 tag를 사용하면 이전 버전으로 되돌리는 작업이 단순합니다. 실행 중인 이미지를 `latest`로 덮어쓰는 방식은 피하세요.

## 자주 발생하는 문제

### ALB target이 unhealthy

- Nginx 컨테이너 port와 target group port가 모두 `8080`인지 확인합니다.
- Target group의 health path가 `/health`인지 확인합니다.
- Frontend task security group이 ALB security group에서 TCP `8080`을 허용하는지 확인합니다.
- ECS event와 CloudWatch Logs에서 컨테이너 시작 오류를 확인합니다.

### 화면은 열리지만 API가 실패

- Production에서는 Vite proxy가 동작하지 않습니다.
- ALB가 `/api/*`와 `/uploads/*`를 backend target group으로 보내는지 확인합니다.
- frontend code가 API를 같은 origin의 상대 경로(`/api/...`)로 호출하는지 확인합니다.
- HTTPS 페이지에서 backend 주소를 `http://`로 직접 호출해 mixed content 오류가 발생하지 않는지 확인합니다.

### SPA 내부 경로 새로고침 시 404

`frontend/nginx.conf`의 다음 설정이 포함된 production image인지 확인합니다.

```nginx
try_files $uri $uri/ /index.html;
```

### `/ws-stomp` 연결 실패

- ALB path rule이 `/ws-stomp*`를 backend로 전달하는지 확인합니다.
- backend target group과 security group의 port가 일치하는지 확인합니다.
- HTTPS 접속 시 클라이언트가 `wss://`를 사용하고, ALB listener와 backend가 WebSocket 연결을 유지하는지 확인합니다.

## 참고 문서

- [전체 ECS 배포 가이드](ECS_DEPLOYMENT_GUIDE.md)
- [Docker Compose 및 이미지 설명](DOCKER.md)
- [Production Nginx 설정](frontend/nginx.conf)
- [Frontend Dockerfile](frontend/Dockerfile)