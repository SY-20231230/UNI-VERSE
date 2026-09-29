package com.universe.admin.dto.response;
import com.universe.report.dto.response.*;
import java.util.List;
public record AdminReportDetailResponse(ReportResponse report, Long reporterId, String reporterEmail, String reporterNickname, String description,
        Long adminId, String adminNickname, String adminNote, AdminUserResponse targetUser, AdminTradeSummaryResponse trade,
        AdminReportedContentResponse content, List<ReportEvidenceResponse> evidences) {
    public AdminReportDetailResponse { evidences = List.copyOf(evidences); }
}
