package com.universe.admin.dto.response;

import com.universe.report.entity.ReportStatus;
import com.universe.report.entity.ReportType;
import java.time.LocalDateTime;

public record AdminReportListResponse(Long reportId, Long reporterId, Long targetUserId,
        ReportType reportType, ReportStatus status, LocalDateTime createdAt, LocalDateTime processedAt) { }
