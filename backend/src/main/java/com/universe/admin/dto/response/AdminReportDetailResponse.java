package com.universe.admin.dto.response;
import com.universe.report.dto.response.*;
import java.util.List;
public record AdminReportDetailResponse(ReportResponse report, Long reporterId, String description,
        Long adminId, String adminNote, AdminUserResponse targetUser, AdminTradeSummaryResponse trade,
        List<ReportEvidenceResponse> evidences) {
    public AdminReportDetailResponse { evidences = List.copyOf(evidences); }
}
