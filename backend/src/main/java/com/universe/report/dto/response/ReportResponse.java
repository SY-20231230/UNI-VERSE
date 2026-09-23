package com.universe.report.dto.response;

import com.universe.report.entity.*;
import java.time.LocalDateTime;

public record ReportResponse(Long reportId, Long targetUserId, Long tradeId,
        Long itemId, Long postId, ReportType reportType, ReportStatus status,
        LocalDateTime createdAt, LocalDateTime processedAt) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(report.getId(), report.getTargetUser().getId(),
                report.getTrade() == null ? null : report.getTrade().getId(),
                report.getItem() == null ? null : report.getItem().getId(),
                report.getPost() == null ? null : report.getPost().getId(),
                report.getReportType(), report.getStatus(), report.getCreatedAt(), report.getProcessedAt());
    }
}
