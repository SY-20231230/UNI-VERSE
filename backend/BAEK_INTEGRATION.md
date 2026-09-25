# 담당 기능 연동 안내

## 범위

report/admin/trust 및 user의 마이페이지 전용 코드만 담당한다.
공통 global, 회원·인증, school/community/market/chat/trade/ai, 프론트, build.gradle, 애플리케이션 설정은 이번 변경에서 수정하지 않았다.

## 기준 문서와 API

UNI_VERSE_백엔드_개발_규칙_v1.0.md 및 UNI_VERSE_REST_API_찜기능추가_1-69.csv를 대조했다.
CSV 54~69의 URL, HTTP Method, 파라미터 의미, 담당 Controller를 유지한다.

| CSV | Controller | 현재 구현 |
|---|---|---|
| 54~56 | ReportController | 신고 등록, 본인 목록, 본인 상세 |
| 57~60 | MyPageController | 요약, 본인 게시글, 판매글, 신뢰점수 이력 |
| 61~64 | AdminReportController | QueryDSL 검색, 상세, 기각, 승인 |
| 65~69 | AdminUserController | QueryDSL 회원 검색, 상세, 제재 등록, 상태 변경, 제재 이력 |

현재 로그인 ID는 ReportCurrentUser가 검증된 SecurityContext Authentication에서 추출한다.
클라이언트의 userId/adminId/reporterId는 현재 사용자 ID로 사용하지 않는다.
관리자 접근과 소유권 검증은 서비스가 수행한다.
회원 검색은 이메일·이름·닉네임 키워드, accountStatus, schoolId를 조합하고 createdAt/id 내림차순으로 페이징한다.
학교가 없는 회원도 목록에 포함한다. 비밀번호나 Entity를 반환하지 않는다.
마이페이지 상품 응답은 purchasePrice를 포함하지 않는다.

## 실제 공통 코드에 맞춘 연결

- PageResponse에는 정적 from 메서드가 없으므로 생성자를 사용한다.
- ModerationException은 BusinessException을 상속하여 기존 GlobalExceptionHandler에서 처리된다.
  내부 Code는 유지하며 회원 없음은 USER_NOT_FOUND, 다른 대상 없음은 NOT_FOUND,
  접근 거부는 FORBIDDEN, 나머지 도메인 거부는 기존 INVALID_INPUT에 매핑한다.
- REPORT_ALREADY_PROCESSED 등 상세 도메인 오류를 별도 409/운영 오류 코드로 공개하려면 공통 ErrorCode 담당자의 확장이 필요하다.
  현재 실제 응답은 INVALID_INPUT/400이다.
- 잘못된 인증 principal은 BusinessException(UNAUTHORIZED)로 처리한다.

## 공통 담당자에게 전달할 충돌/누락

1. 개발규칙 14절은 success/data/error 구조를 제시하나 실제 공통 ApiResponse는 success/code/message/data이다.
   도메인별로 다른 구조를 만들지 않고 기존 공통 타입을 재사용했다. 최종 계약은 공통 담당자와 확인해야 한다.
2. 현재 GlobalExceptionHandler는 메서드 파라미터 검증, 타입 변환, 읽을 수 없는 JSON 등 별도 처리가 없다.
   @Valid 요청 본문 검증 외 일부 잘못된 쿼리/경로/JSON 입력이 catch-all에 의해 500으로 처리될 수 있다.
   담당 Controller에는 제약을 적용했으며 공통 처리기는 수정하지 않았다.
3. 예전 신고/관리자 신고 MVC 테스트는 일부 테스트 전용 예외 처리기를 사용한다.
   새 마이페이지/관리자 회원 MVC 테스트는 실제 GlobalExceptionHandler와 공통 DTO를 사용한다.
   테스트 보안 필터는 인증 이후 동작을 검증하며 실제 JWT 발급/갱신의 종단 검증을 대신하지 않는다.

## 팀원 연결 지점

- 회원가입 트랜잭션에서 저장 후 TrustScoreService.initializeNewUser(userId)를 호출해야 한다.
  현재 회원 생성과 DB 기본 점수는 0이다. 기존 담당 정책은 초기화 호출 후 50이며 이번에 변경하지 않았다.
  회원가입 코드에서 호출이 발견되지 않았다. 기존 회원 전체를 임의로 50점으로 덮어쓰면 안 된다.
- 양쪽 완료 확인 및 completed_at 저장 후 같은 거래 트랜잭션에서 TrustScoreService.recordCompletedTrade(tradeId)를 호출해야 한다.
  현재 거래 서비스의 호출은 발견되지 않았다. 점수 서비스는 양쪽 확인, COMPLETED 상태, 완료시각, 중복 적립을 검증한다.
- 사용자 잠금은 ID 오름차순이며 같은 트랜잭션 안의 변경을 보존한다.
  MySQL REPEATABLE READ를 고려해 점수와 적립 이력을 잠금 조회한다.
- 정지 만료 해제는 SuspensionExpiryJob 및 AdminUserService가 담당한다.
  BANNED/SUSPENDED/DELETED의 전체 서비스 접근 제한은 인증/다른 도메인 담당자가 연결해야 한다.
- S3 실제 업로드와 객체 소유권 검증은 공유 저장소 담당자 연동이 필요하다.
  report.evidence.base-url 검사는 업로드/소유권 검증을 대신하지 않는다.

## 유지한 정책과 설정

- 신고 접수 시 점수를 차감하지 않는다. 승인 시 기존 정책에 따라 30점으로 설정하며 이력을 남긴다.
- 연결된 WARNING은 중복 감점하지 않는다. 독립 WARNING은 기존 정책대로 -10이다.
- report.evidence.base-url 미설정 시 증빙 없는 신고는 가능하고 URL을 포함한 신고는 거부한다.
- admin.report.suspension-days는 신고 승인 SUSPENSION의 기간이다. 미설정이면 해당 처리를 거부한다.
- 독립 SUSPENSION은 유효한 미래 endAt이 필요하다. 이유/기간 없는 정지를 상태 PATCH로 만들지 않는다.
- 만료 정지는 50점으로 복구하며 BAN/DELETED 재활성화는 허용하지 않는다.
- CSV는 거래제한을 언급하지만 SanctionType은 WARNING/SUSPENSION/BAN이다.
  거래제한의 의미·기간·효과가 확정되지 않아 다른 담당자 코드를 바꾸거나 새 유형을 임의로 추가하지 않았다.
- trust_histories.reason의 INITIALIZED, SAFE_TRADE:<순번>, REPORT_CONFIRMED, REPORT_RECOVERED,
  WARNING:<sanctionId>, SUSPENSION_RELEASED:<sanctionId>를 통해 기존 회복 규칙을 유지한다.
- DB 테이블/컬럼/인덱스 변경과 trust_grade 추가는 없다.

## 검증

일반 Gradle 테스트로 실제 공통 코드를 컴파일한다. 예전 report-contract.init.gradle은 사용하지 않는다.
담당 테스트 선택:

gradlew.bat test --tests 'com.universe.report.*' --tests 'com.universe.trust.*' --tests 'com.universe.admin.*' --tests 'com.universe.user.controller.MyPageControllerTest' --tests 'com.universe.user.service.MyPageServiceTest' --console=plain

H2 테스트는 운영 DB를 사용하지 않는다. 실제 MySQL 잠금/동시성, S3, JWT 종단 연동은 별도 검증 대상이다.
2026-09-25 검증: 담당 소스의 PageResponse.from 호출 오류를 수정했다.
정상 Gradle 빌드는 Windows 샌드박스의 JAR 실제 경로 확인 단계에서 AccessDeniedException으로 실패했다.
캐시/빌드 경로 분리, ASCII 경로의 소스 복사본, 사용자 폴더 읽기 권한으로 재시도했지만 해소되지 않았다.
테스트 컴파일에서도 main 클래스 참조 오류가 발생했고 테스트는 실행되지 않았다. 컴파일/테스트 통과를 주장하지 않는다.
일반 사용자 터미널에서 위 명령으로 재검증해야 한다. 새 Controller 테스트는 10개, 회원 검색 서비스/Repository 테스트는 6개 추가했다.
소스 복사본을 통한 재시도는 프로젝트 설정 변경 없이 검증 경로만 분리했다.
