# UNI:VERSE AWS ECS Deployment Guide

이 문서는 UNI:VERSE 프로젝트를 AWS ECS(Fargate) 환경에 배포하기 위한 안내서입니다.
아래 명령어들은 **Git Bash 환경을 기준**으로 작성되었습니다. (Windows PowerShell에서는 환경변수 선언 방식이 다르므로 정상 동작하지 않을 수 있습니다.)

## 1. 사전 준비 (Prerequisites)
- AWS 계정
- 로컬 개발 환경에 [AWS CLI](https://aws.amazon.com/cli/) 설치 및 자격 증명(`aws configure`) 완료
- [Docker](https://www.docker.com/) 설치

### 자동 변수 설정
배포 담당자가 직접 Account ID를 찾지 않아도 되도록 Git Bash에서 아래 묶음을 그대로 복사하여 실행하세요.

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=ap-northeast-2
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# 사용하실 DB 비밀번호와 JWT 시크릿을 여기에 설정하세요!
# (주의: RDS 생성 시 사용하는 비밀번호와 SSM에 등록되는 비밀번호는 반드시 동일해야 합니다.)
DB_PASSWORD_VALUE="<여기에_실제사용할_DB비밀번호_입력>"
JWT_SECRET_VALUE="<여기에_임의의_긴_영문숫자_입력>"

echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"
```

## 2. SSM Parameter Store 비밀값 등록
서비스 배포 전, 안전한 환경 변수 관리를 위해 AWS Systems Manager(SSM)에 비밀값을 등록합니다. (위에서 선언한 변수를 재사용합니다.)

```bash
aws ssm put-parameter \
  --name "/universe/prod/db_password" \
  --value "$DB_PASSWORD_VALUE" \
  --type SecureString \
  --overwrite \
  --region "$AWS_REGION"

aws ssm put-parameter \
  --name "/universe/prod/jwt_secret" \
  --value "$JWT_SECRET_VALUE" \
  --type SecureString \
  --overwrite \
  --region "$AWS_REGION"
```

## 3. 기본 인프라(Foundation) 배포
VPC, Security Groups, ECR, S3, RDS, ECS Cluster 등 인프라 뼈대를 배포합니다. 

```bash
aws cloudformation deploy \
  --template-file infra/foundation.yaml \
  --stack-name universe-prod-foundation \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    DBPassword="$DB_PASSWORD_VALUE" \
  --region "$AWS_REGION"
```

> **참고**: RDS 데이터베이스가 최초 생성되므로 완료까지 약 5~10분이 소요될 수 있습니다.
배포가 끝난 후 상태가 `CREATE_COMPLETE` (또는 `UPDATE_COMPLETE`)인지 아래 명령으로 확인하세요.

```bash
aws cloudformation describe-stacks \
  --stack-name universe-prod-foundation \
  --region "$AWS_REGION" \
  --query "Stacks[0].StackStatus" \
  --output text
```

기본 인프라가 정상 생성되었는지(특히 ECR 레포지토리 3개) 다음 명령으로 확인합니다.
```bash
aws ecr describe-repositories \
  --repository-names universe-frontend universe-backend universe-ai \
  --region "$AWS_REGION"
```

## 4. Docker 이미지 빌드 및 ECR 푸시

```bash
# ECR 로그인
aws ecr get-login-password --region "$AWS_REGION" | \
docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Frontend 빌드 및 푸시
# 주의: Frontend 빌드 시 VITE_API_BASE_URL 환경변수를 넘길 필요 없습니다. (동일 ALB 상대경로 사용)
docker build --platform linux/amd64 --target production -t universe-frontend:latest ./frontend
docker tag universe-frontend:latest "$ECR_REGISTRY/universe-frontend:latest"
docker push "$ECR_REGISTRY/universe-frontend:latest"

# Backend 빌드 및 푸시
docker build --platform linux/amd64 -t universe-backend:latest ./backend
docker tag universe-backend:latest "$ECR_REGISTRY/universe-backend:latest"
docker push "$ECR_REGISTRY/universe-backend:latest"

# AI Server 빌드 및 푸시
docker build --platform linux/amd64 -t universe-ai:latest ./ai-server
docker tag universe-ai:latest "$ECR_REGISTRY/universe-ai:latest"
docker push "$ECR_REGISTRY/universe-ai:latest"
```

> **주의 (Mac 사용자)**: ECS Fargate Task Definition이 `X86_64` 아키텍처로 고정되어 있습니다(`infra/service.yaml`에 `RuntimePlatform` 미지정 시 기본값). Apple Silicon(M1/M2/M3) 맥에서 `--platform` 없이 빌드하면 arm64 이미지가 올라가 ECS task가 `CannotPullContainerError` 또는 실행 직후 종료될 수 있습니다. 위처럼 항상 `--platform linux/amd64`를 붙이세요.

## 5. ECS 서비스(Service) 배포
ALB, Target Groups, ECS Task Definitions, ECS Services를 배포합니다. Foundation 스택의 Output 값을 자동으로 추출해 파라미터로 넘깁니다.

```bash
# ECR Image URI 변수 지정
FRONTEND_ECR_IMAGE_URI="$ECR_REGISTRY/universe-frontend:latest"
BACKEND_ECR_IMAGE_URI="$ECR_REGISTRY/universe-backend:latest"
AI_ECR_IMAGE_URI="$ECR_REGISTRY/universe-ai:latest"

# 서비스 배포 (Foundation Output 자동 참조)
aws cloudformation deploy \
  --template-file infra/service.yaml \
  --stack-name universe-prod-service \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    FrontendImageUri="$FRONTEND_ECR_IMAGE_URI" \
    BackendImageUri="$BACKEND_ECR_IMAGE_URI" \
    AiImageUri="$AI_ECR_IMAGE_URI" \
    VpcId=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='VpcId'].OutputValue" --output text) \
    PublicSubnet1=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet1'].OutputValue" --output text) \
    PublicSubnet2=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet2'].OutputValue" --output text) \
    PrivateSubnet1=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet1'].OutputValue" --output text) \
    PrivateSubnet2=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet2'].OutputValue" --output text) \
    ALBSecurityGroupId=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='ALBSecurityGroupId'].OutputValue" --output text) \
    EcsSecurityGroupId=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='EcsSecurityGroupId'].OutputValue" --output text) \
    ECSClusterName=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='ECSClusterName'].OutputValue" --output text) \
    CloudMapNamespaceId=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='CloudMapNamespaceId'].OutputValue" --output text) \
    EcsTaskExecutionRoleArn=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='EcsTaskExecutionRoleArn'].OutputValue" --output text) \
    RdsEndpoint=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='RdsEndpoint'].OutputValue" --output text) \
    S3BucketName=$(aws cloudformation describe-stacks --stack-name universe-prod-foundation --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text) \
  --region "$AWS_REGION"
```

> **주의 (학교 이메일 인증 메일 발송)**: `infra/service.yaml`의 backend task에는 `MAIL_HOST`/`MAIL_USERNAME`/`MAIL_PASSWORD` 등 SMTP 값이 설정되어 있지 않습니다. 이 상태로는 이메일 인증 기능이 켜져 있어도 실제 메일이 발송되지 않습니다(`backend/src/main/resources/application.yml` 기준 빈 값 기본 처리). 메일 발송이 필요하면 2단계처럼 SSM에 `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`를 추가로 등록하고, `service.yaml`의 `BackendTaskDefinition`에 해당 `Environment`/`Secrets` 항목을 추가해야 합니다. `[팀 확인 필요]`

## 6. 배포 완료 후 최소 확인

모든 배포가 성공하면, 아래 명령들을 통해 배포 상태를 검증합니다.

```bash
# 1. ECS 서비스 상태 확인
aws ecs list-services \
  --cluster universe-cluster \
  --region "$AWS_REGION"

aws ecs describe-services \
  --cluster universe-cluster \
  --services frontend-service backend-service ai-service \
  --region "$AWS_REGION" \
  --query "services[].{Name:serviceName, Status:status, Running:runningCount, Desired:desiredCount}" \
  --output table

# 2. 실제 접속할 ALB DnsName 확인
aws cloudformation describe-stacks \
  --stack-name universe-prod-service \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" \
  --output text
```

출력된 `AlbDnsName` 주소를 브라우저에 입력하여 서비스에 접속하세요. 
(최초 접속 시 ECS 컨테이너 기동 및 RDS 스키마 자동 생성으로 인해 1~2분 정도 지연될 수 있습니다.)

## 7. 문제가 생기면 (로그 확인)

task가 `RUNNING`으로 안 올라오거나 target health가 `unhealthy`면 CloudWatch 로그를 먼저 확인합니다.

```bash
aws logs tail /ecs/universe-backend --since 15m --follow --region "$AWS_REGION"
aws logs tail /ecs/universe-ai --since 15m --follow --region "$AWS_REGION"
aws logs tail /ecs/universe-frontend --since 15m --follow --region "$AWS_REGION"
```

- **task가 시작 직후 바로 멈춤 (`CannotPullContainerError` 등)**: 1장에서 설명한 `--platform linux/amd64` 빌드 여부를 확인하세요.
- **backend task가 `STOPPED`되고 로그에 DB 연결 오류**: RDS 생성 완료(`CREATE_COMPLETE`) 전에 service 스택을 배포했거나, 3단계에서 넣은 `DB_PASSWORD_VALUE`가 실제 RDS 비밀번호와 다른 경우입니다.
- **backend task가 secret 주입 단계에서 실패**: SSM `SecureString`을 기본 KMS 키(`alias/aws/ssm`)가 아닌 별도 고객관리형 키로 암호화했다면, `EcsTaskExecutionRole`에 `kms:Decrypt` 권한이 없어서 실패할 수 있습니다. `[확인 필요]` — 기본 키를 썼다면 보통 추가 권한이 필요 없습니다.
