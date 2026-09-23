# 담당 기능 연동 안내

## 범위와 미완료 사항

report/admin/trust, user의 마이페이지 전용 코드만 추가했다. User 및 다른 담당 도메인,
공통 global 운영 코드, 애플리케이션 설정, build.gradle은 수정하지 않았다. 프론트는 신고 전용 파일만 변경했다.
현재 공유 ApiResponse/PageResponse, JWT principal, 공통 오류 코드/처리기, QueryDSL 의존성이 없다.
사용자 지시에 따라 팀 공통 기능이 있다고 가정한 ReportController를 추가했다. 공통 기능은 테스트 대역으로만 검증한다.
다른 도메인의 HTTP Controller와 공통 운영 코드는 추가하지 않았다. 상세 계약/실행 제약은 REPORT_JWT_CONTRACT.md 참고.

## CSV 연결표

| 번호 | 담당 Controller | Service | 상태 |
|---|---|---|---|
| 54~56 | ReportController | ReportService.create/findMine/getMine | Controller 구현, 실제 JWT/공통 계약 합류 대기 |
| 57~60 | MyPageController | MyPageService.getSummary/findPosts/findItems/findTrustHistory | 서비스 구현, HTTP 연결 대기 |
| 61 | AdminReportController | 동적 검색 | QueryDSL 기반 구현 대기 |
| 62~64 | AdminReportController | AdminReportService.getDetail/dismiss/approve | 서비스 구현, HTTP 연결 대기 |
| 65 | AdminUserController | 동적 검색 | QueryDSL 기반 구현 대기 |
| 66 | AdminUserController | AdminUserService.getDetail | 최근 거래/신고/제재 각 20개와 전체 건수 |
| 67 | AdminUserController | AdminSanctionService.create | 서비스 구현, HTTP 연결 대기 |
| 68~69 | AdminUserController | AdminUserService.updateStatus/findSanctions | 서비스 구현, HTTP 연결 대기 |

Controller 연결 시 CSV Endpoint/Method를 그대로 유지하고 @Valid를 적용한다.
현재 사용자 ID는 오직 JWT/SecurityContext에서 전달한다. 서비스의 authenticatedUserId 인자는
요청 DTO 필드가 아니며, 클라이언트에서 받은 ID를 전달하면 안 된다.
DTO는 엔티티를 반환하지 않는다. 서비스 Page<T>는 공통 PageResponse로 변환해야 한다.
ModerationException은 내부 실패 코드만 담고 HTTP 형식을 정하지 않는다.
공통 GlobalExceptionHandler/BusinessException 규약이 도착하면 거기에 통합한다.
서비스는 직접 HTTP 상태나 응답을 구성하지 않는다.

## 팀원에게 필요한 연결 지점

1. 회원가입 트랜잭션에서 저장 후 TrustScoreService.initializeNewUser(userId)를 호출한다.
   현재 User 생성자는 0점을 설정한다. 이 파일은 수정하지 않았다.
   이 메서드를 기존 회원 데이터의 무조건적인 보정 작업으로 사용하지 않는다.
2. 거래 완료 트랜잭션에서 Trade 완료 후 TrustScoreService.recordCompletedTrade(tradeId)를 호출한다.
   completed_at, 양쪽 confirmed, COMPLETED 상태를 모두 검증한다.
   별도 비동기 재생 방식이 아닌 같은 트랜잭션 호출이 전제다.
   거래 잠금 후 두 사용자를 ID 오름차순으로 잠그고, 같은 거래의 중복 적립을 막는다.
3. 정지 해제는 AdminUserService.updateStatus(..., ACTIVE)에서 종료일을 검증한 뒤 50점으로 재설정한다.
   SuspensionExpiryJob도 기본 60초마다 만료 회원 최대 100명을 조회해 개별 트랜잭션으로 해제한다.
   admin.suspension.expiry-enabled=false로 자동 처리를 끄거나 expiry-delay-ms로 간격을 변경할 수 있다.
   로그인/기존 JWT/다른 도메인에서도 BANNED/SUSPENDED/DELETED를 거부해야 한다.
   이 코드만으로 시스템 전체의 차단이 완료된 것은 아니다.
4. 커뮤니티/상품 담당자가 목록 DTO를 제공하면 마이페이지 전용 프로젝션과 맞춘다.
   새로 추가한 user.dto.response의 목록 DTO는 마이페이지용이며 다른 담당 파일을 대신 구현하지 않는다.

## 설정과 제재 정책

- report.evidence.base-url: HTTPS S3 또는 S3 배포 도메인의 신고 증빙 경로.
  미설정 시 증빙 없는 신고는 가능하고, URL을 받는 신고는 거부한다.
  URL 경로 검증은 업로드/객체 소유권 검증을 대신하지 않는다. 공유 저장소 서비스 연동이 필요하다.
- admin.report.suspension-days: 신고 승인 요청에 SUSPENSION이 포함될 때 사용할 운영 기간.
  CSV에는 endAt이 없으므로 DTO에 임의 추가하지 않았다. 미설정이면 해당 승인을 거부한다.
  독립 제재 등록 API의 SUSPENSION에는 유효한 미래 endAt을 요구한다.
- 신고 승인과 연결된 WARNING은 점수를 다시 깎지 않는다.
- 계정 상태 PATCH만으로 이유/기간 없는 정지/영구정지를 만들지 않는다.
  먼저 제재 생성으로 기록한다. BAN/DELETED의 재활성화는 허용하지 않는다.
- 기존 SanctionType에는 거래제한 유형이 없다. 정책/거래 담당 합의 없이 새 제한 로직을 추가하지 않았다.

## DB 변경 없이 회복 상태 관리

trust_histories.reason에 INITIALIZED, SAFE_TRADE:<적립순번>, REPORT_CONFIRMED, REPORT_RECOVERED,
WARNING:<sanctionId>, SUSPENSION_RELEASED:<sanctionId>를 기록한다.
점수 변화 0인 안전거래도 이력에 남겨 중복 처리 방지와 회복 횟수 계산에 사용한다.
기준 이력 이후의 최신 SAFE_TRADE 적립순번으로 계산한다. 신고 회복 10회째는 REPORT_RECOVERED 기준 이력이 된다.
사용자 최초 잠금 시 refresh로 이미 조회된 엔티티의 오래된 점수를 갱신한다.
이력 판정도 잠금 조회로 처리해 MySQL REPEATABLE READ에서 과거 스냅샷을 사용하지 않도록 한다.
현재 점수에 경고 차감이 반영돼도 횟수 기준 보너스는 중복 지급하지 않는다.
새 테이블/컬럼/인덱스 및 DB 마이그레이션을 추가하지 않았다.
기존 점수 이력을 임의 수정/삭제하면 안 되며, 기존 데이터 전환 정책은 별도로 필요하다.

## 테스트 실행

공통 build.gradle을 바꾸지 않고 H2를 테스트 실행에만 추가하는 담당 전용 init script를 제공한다.
backend 디렉터리에서 실행한다:

```powershell
.\gradlew.bat -I src/test/resources/baek/h2.init.gradle -I src/test/resources/baek/report-contract.init.gradle test --tests 'com.universe.report.*' --tests 'com.universe.trust.*' --tests 'com.universe.admin.*' --tests 'com.universe.user.service.MyPageServiceTest' --console=plain
```

테스트는 H2로 데이터소스를 교체하고 각 테스트 트랜잭션을 롤백한다. 운영 DB를 사용하지 않는다.
기존 UniverseApplicationTests와 전체 API 실행 검증은 이 범위에 포함하지 않는다.
실제 MySQL 잠금/동시성 및 JWT/HTTP 응답 검증은 공통 기능 연결 후 추가 검증이 필요하다.

검증 기록: 2026-09-23, 위 명령으로 63개 테스트 통과. 컴파일 성공.

2026-09-23 추가 검증: 신고 범위 58개 통과 (Controller 11개 + 인증 연결 13개 포함). 위 63개 기록은 이전 서비스 검증 기록이다.
