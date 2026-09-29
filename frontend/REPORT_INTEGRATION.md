# 신고 프론트 연결

## 이번 변경 범위

ReportModal, 신고 전용 API 클라이언트/토큰 연결 훅/레이블/테스트만 추가 또는 수정한다.
마이페이지, 관리자, 로그인, AppContext, 라우터, 다른 담당자의 화면 및 백엔드 공통 코드는 변경하지 않는다.

신고 유형과 상세 내용을 입력하며 중복 클릭을 차단한다. 서버 성공 응답 후에만 모달을 닫고 성공 메시지를 표시한다.
실패하면 입력을 유지하고 오류를 표시한다. localStorage에 신고를 추가해서 성공한 것으로 처리하지 않는다.
기존 listingId prop은 계약의 itemId로 전달한다. 선택적으로 tradeId/postId도 전달할 수 있다.
chatId는 신고 CSV에 없으므로 요청에 추가하지 않는다.
S3 업로드 화면은 아직 제공하지 않는다. API 클라이언트는 이미 업로드된 evidences URL 배열을 전달할 수 있다.

## 제공하는 호출

- POST /api/v1/reports
- GET /api/v1/reports/me (status/page/size)
- GET /api/v1/reports/{reportId}

현재 신고 내역 화면을 새로 연결하지는 않았다. 마이페이지/관리자 프론트 변경은 이번 범위에서 제외했다.

## 실제 연결에 필요한 항목

1. 인증 담당의 실제 로그인 토큰. useReportApi.js는 AppContext.state.accessToken을 읽는 연결 지점이다.
   실제 팀 인증 규약이 정해지면 이 훅에서 맞춘다. 로그인·토큰 발급을 대신 구현하지 않았다.
2. ReportController 3개 API는 팀 공통 기능이 있다는 전제로 작성했다.
   팀 공통 ApiResponse/PageResponse/예외/JWT는 실제 구현 합류가 필요하며 실제 DB 접수는 검증하지 않았다.
   가정한 principal/응답 계약과 테스트 방법은 backend/REPORT_JWT_CONTRACT.md 참고.
3. 상품/채팅 등에서 전달하는 실제 서버 userId/itemId. me/u1/m1 같은 샘플 ID는 임의 변환하지 않는다.
4. 서버 주소와 CORS 또는 개발 proxy. VITE_API_BASE_URL 기본값은 /api/v1이며,
   다른 서버 사용 시 http://localhost:8080/api/v1 같은 API prefix까지 포함한 주소를 설정한다.
   토큰은 VITE_* 환경변수에 저장하지 않는다. 공통 vite 설정은 변경하지 않았다.

성공 응답은 { success: true, data, error: null }, 실패는 { success: false, data: null, error: { code, message } }를 예상한다.
목록은 content/totalElements/totalPages/page(또는 number)를 예상하며 팀 PageResponse 확정 후 normalizePage에서 맞춘다.
JavaScript 안전 정수보다 큰 ID는 서버가 문자열로 제공해야 한다. 이미 손실된 숫자 ID는 요청하지 않는다.

## 검증

```powershell
node --test src/lib/reportApi.test.js
```

요청 계약·인증 누락·잘못된 ID·서버 오류·네트워크 실패의 클라이언트 검증이며,
실제 JWT/HTTP Controller/DB 통합 검증과 구분한다.
