# UNI-VERSE AWS 아키텍처 발표 대본

## 발표 개요

- **예상 시간:** 약 8분, 질의응답 제외
- **대상:** 프로젝트 팀, 리뷰어, 배포 담당자
- **자료:** [아키텍처 문서](ARCHITECTURE.md)와 그 안의 PNG 구조도
- **핵심 메시지:** Docker 이미지는 ECR에 저장하고, CloudFormation이 인프라를 구성하며, ECS Fargate가 애플리케이션 컨테이너를 실행합니다.

> 발표 전제: 이 구조도는 목표 배포 아키텍처입니다. 현재 저장소에는 CI 검증 workflow가 있지만, ECR 이미지 push와 CloudFormation 배포는 아직 자동화되어 있지 않습니다. 발표에서는 현재 구현과 목표 구성을 구분해서 설명합니다.

## 1. 도입 및 구조도 읽는 순서 | 0:00–0:45

**발표 대본**

“안녕하세요. 지금부터 UNI-VERSE를 AWS에 배포하기 위한 백엔드 중심 아키텍처를 설명하겠습니다. 이 구조의 목표는 프론트엔드, Spring 백엔드, AI 서버를 각각 컨테이너로 배포하면서 데이터베이스와 비밀정보를 인터넷에 직접 노출하지 않는 것입니다.

그림은 위쪽의 배포 흐름과 아래쪽의 실제 서비스 실행 흐름으로 나누어 보시면 됩니다. 위쪽은 코드가 어떻게 AWS에 배포되는지를, 아래쪽은 사용자의 요청이 어떤 경로로 백엔드와 데이터베이스까지 도달하는지를 보여줍니다.”

**가리킬 곳:** 그림 상단의 GitHub부터 ECS까지, 이어서 하단의 AWS VPC 영역.

## 2. 코드에서 컨테이너 배포까지 | 0:45–2:10

**발표 대본**

“먼저 상단의 배포 흐름입니다. 개발자가 코드를 GitHub에 push하거나 Pull Request를 올리면 GitHub Actions가 각 서비스의 검증을 수행합니다. 현재 저장소에서는 프론트엔드 lint·test·build, 백엔드 Gradle build, AI 서버 smoke test가 실행됩니다.

다만 여기서 중요한 구분이 있습니다. 현재 workflow는 코드 검증까지이며 Docker 이미지를 ECR에 push하거나 CloudFormation stack을 배포하지는 않습니다. 그림의 점선으로 표시된 Docker 빌드와 AWS 배포는 추가 구현이 필요한 목표 단계입니다.

목표 배포에서는 서비스별 Docker 이미지를 빌드하고 Git commit SHA를 태그로 사용합니다. 이렇게 하면 어떤 코드 버전이 실행 중인지 확인할 수 있고, 문제가 생겼을 때 직전 이미지로 되돌리기 쉽습니다. 이미지는 AWS의 컨테이너 저장소인 ECR에 저장합니다.

GitHub Actions가 AWS에 접근할 때는 OIDC로 배포 역할을 가정하도록 구성합니다. 장기 access key를 저장하지 않고 필요한 권한만 가진 임시 자격 증명을 사용하기 위한 방식입니다.

CloudFormation은 이미지를 저장하는 곳이 아닙니다. ECR의 이미지 URI를 ECS Task Definition에 전달하고, 인프라와 서비스를 선언된 설정에 따라 생성하거나 갱신합니다. 기반 네트워크와 공통 자원은 `universe-foundation`, 이미지 버전이 바뀔 때 자주 갱신되는 Task Definition과 ECS Service는 `universe-app`처럼 나누는 구성을 제안합니다.”

**가리킬 곳:** GitHub Actions → ECR → CloudFormation → ECS Fargate.

## 3. 사용자의 요청이 백엔드에 도달하는 경로 | 2:10–3:25

**발표 대본**

“이제 아래쪽 런타임 구조를 보겠습니다. 사용자는 HTTPS 443으로 Application Load Balancer, 즉 ALB에 접속합니다. ALB는 public subnet에 배치하고 ACM 인증서를 연결해 TLS 연결을 종료합니다. HTTP 80을 열더라도 운영에서는 HTTPS로 redirect하는 용도로 제한합니다.

ALB는 요청 경로에 따라 목적지를 나눕니다. 일반 웹 페이지 경로는 프론트엔드 Nginx로 전달하고, `/api/*`, `/uploads/*`, `/ws-stomp*` 요청은 Spring 백엔드로 전달합니다. 따라서 브라우저는 같은 도메인을 사용하면서 API와 채팅 연결을 백엔드에 보낼 수 있습니다.

백엔드는 ECS Fargate에서 TCP 8080으로 실행합니다. ALB는 `/actuator/health/readiness`를 확인해 새 task가 요청을 받을 준비가 됐는지 판단합니다. 준비된 새 task가 healthy가 된 뒤 배포를 마치는 방식으로 무중단에 가까운 rolling deployment를 구성하고, 배포 실패 시 이전 Task Definition revision으로 되돌릴 수 있게 합니다.”

**가리킬 곳:** 브라우저 → ALB, 그리고 ALB에서 Frontend와 Spring Backend로 갈라지는 화살표.

## 4. VPC 내부의 데이터 및 AI 연동 | 3:25–4:50

**발표 대본**

“보안 경계는 VPC와 subnet으로 구성합니다. 인터넷에서 직접 접근해야 하는 ALB만 public subnet에 두고, 프론트엔드·백엔드·AI task와 RDS는 서로 다른 AZ의 private subnet에 배치합니다. ECS task와 데이터베이스에는 public IP를 할당하지 않습니다.

백엔드는 요청을 처리하면서 Amazon RDS for MySQL의 3306 포트에 연결합니다. 이 포트는 backend ECS 보안 그룹에서 오는 연결만 허용합니다. 새 RDS를 만들 때는 백엔드보다 먼저 `schema.sql`을 적용해야 합니다. Compose에서 MySQL 초기화에 쓰는 schema mount는 AWS RDS에서 자동 실행되지 않기 때문입니다.

AI 위험 문구 분석이 필요한 요청은 백엔드가 FastAPI AI 서비스의 8000 포트로 내부 호출합니다. Service Connect 또는 Cloud Map으로 내부 주소를 제공하고, AI 서비스는 인터넷에 공개하지 않습니다. 현재 AI Dockerfile은 모델 디렉터리를 이미지 안에 복사하므로 별도의 S3 모델 다운로드가 필수 조건은 아닙니다.

DB 암호, JWT 서명 키, SMTP 인증정보는 Secrets Manager에 저장합니다. ECS task가 시작될 때 task execution role로 필요한 secret을 가져오도록 구성합니다. 실행 중인 애플리케이션이 S3 같은 AWS API를 호출한다면 task role을 별도로 주고, 필요한 버킷과 경로에만 권한을 제한합니다. 컨테이너 로그는 CloudWatch Logs로 보냅니다.”

**가리킬 곳:** Backend에서 RDS와 AI API로 향하는 화살표, Secrets Manager, CloudWatch Logs.

## 5. Private subnet의 AWS 서비스 접근 | 4:50–5:35

**발표 대본**

“private subnet의 task에는 public IP가 없으므로 ECR에서 이미지를 가져오거나 CloudWatch Logs와 Secrets Manager에 접근할 네트워크 경로도 필요합니다. 이를 위해 ECR API와 DKR, CloudWatch Logs, Secrets Manager Interface VPC Endpoint를 두고, S3에는 Gateway Endpoint를 사용하는 구성을 권장합니다.

AWS endpoint가 아닌 외부 SMTP 서버로 인증 메일을 보내려면 NAT Gateway 같은 인터넷 outbound 경로가 별도로 필요합니다. VPC endpoint가 외부 SMTP 연결까지 제공하는 것은 아닙니다.”

**가리킬 곳:** private subnet 경계와 아래쪽 보안·통신 경로 설명.

## 6. 운영 제약과 안전한 확장 순서 | 5:35–7:10

**발표 대본**

“운영 전 반드시 해결하거나 팀에서 결정할 항목이 두 가지 있습니다.

첫째, 현재 업로드 파일은 백엔드 컨테이너의 `/app/uploads`에 저장됩니다. Fargate task가 교체되면 파일이 사라지고, task를 여러 개 실행해도 파일이 자동으로 공유되지 않습니다. 장기 운영에서는 상품 이미지와 신고 증빙을 S3에 저장하는 것을 권장하지만, 현재는 애플리케이션 코드가 S3와 연결되어 있지 않습니다. 따라서 S3를 이미 사용 중이라고 가정해서는 안 되고, 코드 연동과 task role, 버킷 정책을 함께 준비해야 합니다. 임시로 EFS를 검토할 수도 있습니다.

둘째, 현재 채팅의 Simple Broker는 백엔드 프로세스 메모리 안에서 동작합니다. 그래서 백엔드 task를 여러 개로 늘리면 서로 다른 task에 연결된 사용자 간 메시지 전달이 보장되지 않습니다. 외부 STOMP broker를 도입하기 전에는 backend desired count를 1로 두는 편이 안전합니다.

또한 메일 인증 설정이 빠지면 개발용 인증 코드가 응답이나 로그에 노출되는 코드 경로가 있습니다. 운영 배포 전에 SMTP 비밀값을 반드시 설정하고, 인증 실패 응답과 로그에 코드가 노출되지 않는지 확인해야 합니다.

권장 구현 순서는 네트워크와 IAM을 포함한 기반 CloudFormation stack, RDS와 schema 준비, Secrets Manager 설정, ECR push를 포함한 OIDC 배포 workflow, 마지막으로 ECS 앱 stack 순서입니다. RDS는 데이터 보존을 위해 deletion protection과 Retain 정책을 적용하고, 이미지 태그는 `latest` 대신 SHA를 사용합니다.”

**가리킬 곳:** S3와 업로드 안내, Backend의 private broker 제약, Foundation/App stack 설명.

## 7. 정리 | 7:10–7:40

**발표 대본**

“정리하면, 사용자의 진입은 ALB로 제한하고 애플리케이션과 데이터베이스는 private subnet에 둡니다. 코드는 GitHub Actions에서 검증하고, 목표 배포에서는 SHA 태그가 붙은 Docker 이미지를 ECR에 저장한 뒤 CloudFormation이 ECS Fargate 서비스를 갱신합니다.

이 구조의 핵심은 이미지 저장, 인프라 관리, 컨테이너 실행의 역할을 각각 ECR, CloudFormation, ECS가 맡는다는 점입니다. 현재 자동 배포와 S3 업로드 연동은 아직 구현 대상이며, 이를 단계적으로 완성하면서 보안 경계와 롤백 가능성을 유지하는 것이 제안의 핵심입니다. 감사합니다.”

## 예상 질문과 답변

### CloudFormation에 Docker 이미지를 직접 올리나요?

아닙니다. Docker 이미지는 ECR에 push합니다. CloudFormation은 ECR 이미지 URI를 참조하는 ECS Task Definition과 AWS 인프라를 생성·갱신합니다.

### 현재 GitHub Actions가 AWS 배포까지 하나요?

아닙니다. 현재는 프론트엔드·백엔드·AI 검증 workflow가 있습니다. ECR push, OIDC 역할 설정, CloudFormation 배포 workflow는 추가 구현이 필요합니다.

### backend task를 두 개 이상 실행해도 되나요?

현재 채팅 broker가 프로세스 내부 메모리에 있어 task 간 채팅 전달이 보장되지 않습니다. 공유 STOMP broker를 도입하기 전에는 desired count 1 운영이 안전합니다. 업로드도 S3 또는 EFS로 공유 저장소를 마련해야 합니다.

### S3는 현재 업로드에 사용되고 있나요?

아닙니다. 현재 코드는 `/app/uploads`에 로컬 저장합니다. S3는 운영 목표이며, 애플리케이션 연동과 최소 권한 IAM 구성이 완료된 뒤 사용해야 합니다.

### private subnet의 task는 ECR이나 Secrets Manager에 어떻게 접근하나요?

서비스별 VPC endpoint를 구성하거나 NAT 경로를 사용합니다. ECR, CloudWatch Logs, Secrets Manager는 Interface endpoint, S3는 Gateway endpoint를 사용할 수 있습니다. 외부 SMTP는 별도 NAT outbound 경로가 필요합니다.