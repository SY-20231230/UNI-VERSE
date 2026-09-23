# 담당 구현 파일 목록

기존 파일 수정:
- baek_work.md
- backend/src/main/java/com/universe/report/entity/Report.java

신규 파일은 아래 영역에만 있다:
- report: Controller, DTO, Repository, 등록/조회 및 접근 검증 서비스, JWT 인증 사용자 연결
- admin: 요청/응답 DTO, 활동 조회 Repository, 신고/회원/제재/자동 정지 해제 서비스
- trust: 이력 DTO, Repository, 점수 정책과 점수 변경 서비스
- user: MyPageService, MyPage*Repository, MyPageResponse 및 마이페이지 목록 DTO
- 담당 테스트와 H2 실행용 test resources
- BAEK_INTEGRATION.md, 본 파일

수정하지 않은 기존 파일: User.java 및 모든 회원/인증 코드, school/community/market/chat/trade/ai,
global 운영 코드, build.gradle, application 설정, 신고 외 프론트, 다른 팀원 업무 파일.

신고 Controller 3개 API를 팀 공통 기능이 있다고 가정하여 추가했다. 계약과 검증 한계는 REPORT_JWT_CONTRACT.md에 기록했다.
테스트 전용 공통 응답 대역은 src/test/contracts/java에 있으며 운영 공통 코드가 아니다.
프론트 변경은 ReportModal 및 reportApi/useReportApi/reportLabels와 해당 테스트·문서이다.
