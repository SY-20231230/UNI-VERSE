# 윤성용 담당 백엔드 기능 및 인프라 작업 내역

## 담당 영역

- [x] 중고거래
  - `MarketItemController.java`
  - `MarketItemService.java`
  - `MarketItem.java`, `MarketItemImage.java`, `ItemCategory.java`, `ItemCondition.java`, `TradeStatus.java`
  - `MarketItemRepository.java`, `MarketItemRepositoryCustom.java`, `MarketItemRepositoryImpl.java`
  - `MarketItemCreateRequest.java`, `MarketItemUpdateRequest.java`
  - `MarketItemDetailResponse.java`, `MarketItemListResponse.java`
- [x] 상품 찜
  - `MarketItemFavoriteController.java`
  - `MarketItemFavoriteService.java`
  - `MarketItemFavorite.java`, `MarketItemFavoriteId.java`
  - `MarketItemFavoriteRepository.java`, `ItemFavoriteCount.java`
- [x] AI 연동
  - `AiRiskController.java`
  - `AiRiskService.java`, `AiRiskClient.java`
  - `AiRiskAnalysis.java`, `AiAnalysisResult.java`
  - `AiRiskAnalysisRepository.java`
  - `AiAnalysisRequest.java`, `AiAnalysisResponse.java`, `AiRiskAnalyzeRequest.java`, `AiRiskPredictRequest.java`, `AiRiskPredictResponse.java`, `AiRiskResponse.java`
- [x] 채팅
  - `ChatController.java`, `ChatApiController.java`
  - `ChatService.java`
  - `ChatRoom.java`, `ChatMember.java`, `ChatRequest.java`, `Message.java`, `ChatRoomStatus.java`, `ChatRequestStatus.java`, `ChatProfileMode.java`, `MessageType.java`
  - `ChatRoomRepository.java`, `ChatMemberRepository.java`, `ChatRequestRepository.java`, `MessageRepository.java`
  - `ChatRoomCreateRequest.java`, `ChatMessageRequest.java`
  - `ChatRoomDto.java`, `ChatMessageResponse.java`, `ChatReadResponse.java`
- [x] 거래 관리
  - `TradeController.java`
  - `TradeService.java`
  - `Trade.java`
  - `TradeRepository.java`
  - `TradeCreateRequest.java`, `TradeResponse.java`

## 인프라 및 CI/CD 안정화 작업 내역

### 1. 인프라 및 배포 (AWS ECS Infrastructure & Deployment)
- [x] AWS ECS Fargate 기반 배포 아키텍처(VPC, ALB, CloudMap 등) 전체 점검 및 최종 검증 (Audit)
- [x] `foundation.yaml` 수정: `EcsTaskExecutionRole`에 SSM Parameter Store 읽기 권한(`ssm:GetParameters`) 추가하여 컨테이너 기동 오류 해결
- [x] `service.yaml` 수정: AI 서버(`ai-server`) 컨테이너 전용 ECS Health Check 추가 (Python `urllib.request` 방식 활용)
- [x] Git Bash 맞춤형 배포 자동화 스크립트 작성 (`infra/README.md` 전면 개편, Account ID 자동 추출 등)
- [x] 백엔드 SMTP 메일 발송 MVP Fallback 검증 (메일 환경 변수 누락 시 임시 인증번호로 동작하는 것 확인)

### 2. 파일 스토리지 및 S3 연동 (S3 Presigned URL Integration)
- [x] 안전한 **S3 Presigned URL** 반환 방식 적용 (만료 시간 15분, DB에는 Object Key만 저장)
- [x] 기존 `s3-presigner` (v1) 의존성 충돌 문제 해결 및 AWS SDK v2 기반 `S3FileService`, `LocalFileService` 구현 (`file/service` 패키지 구축)
- [x] `MarketItemService`, `ReportService`, `AdminReportService` 등 이미지 반환이 필요한 모든 서비스 및 DTO에 `FileService` 의존성 주입 연동 완료

### 3. 테스트 및 CI/CD 안정화 (CI/CD & Testing)
- [x] S3 연동으로 발생한 백엔드 유닛 테스트 환경 픽스 (`NullPointerException` 연쇄 실패 해결)
- [x] `AdminReportServiceTest`, `ReportServiceTest`, `MarketItemListFavoriteCountTest` 등에 `@Mock FileService` 주입
- [x] `ModerationIntegrationTest` 스프링 통합 테스트에 `@MockitoBean FileService` 주입
- [x] GitHub Actions 파이프라인 Backend Checks 에러 완벽 해결 (`BUILD SUCCESSFUL`)
- [x] 배포 직전 불필요한 테스트 파일/스크립트(`test_api.py` 등) 정리 및 클린업

### 4. 작업 원칙 준수 (Working Principles)
- [x] 다른 팀원(Baek) 코드는 원형을 최대한 유지하여 사이드 이펙트 최소화
- [x] MVP 버전에 불필요한 설정은 스킵하고 핵심 기능 및 배포 안정성에 집중