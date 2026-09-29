package com.universe.admin.dto.request;
import com.universe.report.entity.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
public record AdminReportSearchCondition(ReportStatus status, ReportType reportType,
        @Positive Long targetUserId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
    @AssertTrue(message = "from must not be after to")
    public boolean isPeriodValid() { return from == null || to == null || !from.isAfter(to); }
}
