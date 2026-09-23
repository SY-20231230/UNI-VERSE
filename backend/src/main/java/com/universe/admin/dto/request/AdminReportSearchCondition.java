package com.universe.admin.dto.request;
import com.universe.report.entity.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record AdminReportSearchCondition(ReportStatus status, ReportType reportType,
        @Positive Long targetUserId, LocalDateTime from, LocalDateTime to) {
    @AssertTrue(message = "from must not be after to")
    public boolean isPeriodValid() { return from == null || to == null || !from.isAfter(to); }
}
