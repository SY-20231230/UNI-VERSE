# 신고 API: 팀 공통 기능이 제공된다는 전제의 구현

## 구현 범위

실제 운영 소스는 report/controller/ReportController와 report/service/ReportCurrentUser에 추가했다.
JWT 발급/검증, SecurityConfig, global 공통 응답/예외 구현은 만들지 않았다.
기존 ReportService와 Repository/DTO를 재사용한다. DB 구조 변경은 없다.

| Method | Endpoint | 반환 타입 |
|---|---|---|
| POST | /api/v1/reports | ApiResponse<ReportResponse> (201) |
| GET | /api/v1/reports/me | ApiResponse<PageResponse<ReportResponse>> (200) |
| GET | /api/v1/reports/{reportId} | ApiResponse<ReportDetailResponse> (200) |

목록은 status(선택), page(기본 0), size(기본 20, 1~100)를 받는다.
createdAt DESC, id DESC로 정렬한다. 신고자 ID를 body/query/header에서 받지 않는다.
소유권/계정상태/대상 일치 검증 및 신고 접수 시 점수 유지 규칙은 Service가 담당한다.

## 가정한 팀 공통 계약과 추후 수정 지점

1. JWT 필터가 서명/만료 등을 검증하고 SecurityContext에 authenticated Authentication을 설정한다.
   Authentication.getName()은 users.user_id의 양의 10진수 문자열이다.
   실제 principal이 userId 필드 등을 제공하면 ReportCurrentUser.requireId 한 곳을 변경한다.
   이 클래스는 JWT 토큰 파서가 아니며 인증되지 않은 이름은 받아들이지 않는다.
   인증 체인은 /api/v1/reports/**를 보호해야 한다. 테스트용 user()는 검증된 인증 이후 상태만 모사한다.
2. com.universe.global.common.ApiResponse.success(T)를 제공한다.
   개발규칙의 {success, data, error} 형식을 사용한다.
3. com.universe.global.common.PageResponse.from(Page<T>)를 제공한다.
   현재 프론트 연결 가정은 content/page/size/totalElements/totalPages이다.
   실제 PageResponse 필드/팩토리가 다르면 Controller와 frontend/src/lib/reportApi.js의 normalizePage를 맞춘다.
4. 공통 GlobalExceptionHandler는 ModerationException.getCode()를 프로젝트 오류 체계로 매핑한다.
   FORBIDDEN -> 403, REPORT_NOT_FOUND/USER_NOT_FOUND/REFERENCE_NOT_FOUND -> 404,
   INVALID_REPORT_TARGET/INVALID_EVIDENCE_URL 및 요청 Validation/타입 오류 -> 400이 필요하다.
   EVIDENCE_STORAGE_NOT_CONFIGURED는 서버 설정 오류로 처리한다.
   인증 실패는 401이고 JWT 필터/AuthenticationEntryPoint 오류도 공통 실패 형식으로 처리해야 한다.
   실제 BusinessException/ErrorCode 규약이 확정되면 기존 ModerationException을 그 규약과 연결한다.
5. 프론트 useReportApi는 AppContext.state.accessToken을 사용한다고 가정한다.
   다른 저장 위치는 이 훅에서만 조정한다. 로그인 코드와 샘플 ID를 임의 수정하지 않았다.
   실제 numeric targetUserId/itemId, 서버 주소, CORS/proxy는 담당 구현이 제공해야 한다.

## 검증용 대역과 한계

src/test/contracts/java의 ApiResponse/PageResponse는 테스트 전용 계약 대역이다.
공통 운영 구현이나 운영 배포물로 사용하지 않는다. 일반 Gradle 소스 경로에는 포함되지 않는다.
ReportControllerTest 내부 SecurityContract/ExceptionContract 역시 테스트 전용이다.
실제 JWT 암호학적 검증, 실제 공통 예외 처리, 실제 HTTP-DB 전체 연결을 검증했다고 볼 수 없다.

현재 공통 클래스가 아직 없으므로 **일반 compileJava/bootRun은 공통 구현 합류 전에는 완료되지 않는다**.
가정하에 작성한 신고 코드는 아래 명령으로 별도 build/report-contract 폴더에서 컴파일/검증한다.
공통 계약 대역 실행 스크립트는 서버 실행과 패키징 작업을 차단한다.
공통 코드가 합류하면 테스트 대역/전용 스크립트를 제거하고 실제 계약으로 일반 테스트를 실행한다.

```powershell
.\gradlew.bat -I src/test/resources/baek/h2.init.gradle -I src/test/resources/baek/report-contract.init.gradle test --tests 'com.universe.report.*' --console=plain
```

2026-09-23: 신고 관련 58개 테스트 통과. 신규 Controller 11개, 인증 사용자 연결 13개 포함.
기존 Service/JPA/증빙 검증 회귀 테스트도 함께 통과했다. DB 테스트는 H2를 사용한다.
