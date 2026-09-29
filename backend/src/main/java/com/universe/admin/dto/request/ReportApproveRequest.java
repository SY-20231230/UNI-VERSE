package com.universe.admin.dto.request;
import com.universe.report.entity.SanctionType;
import jakarta.validation.constraints.*;
/** suspensionDays: 일시정지(SUSPENSION) 기간(일). 비우면 운영 정책 기본값을 쓴다. */
public record ReportApproveRequest(@NotBlank @Size(max = 10000) String adminNote, SanctionType sanctionType,
        @Min(1) @Max(3650) Integer suspensionDays) {
    public ReportApproveRequest(String adminNote, SanctionType sanctionType) { this(adminNote, sanctionType, null); }
}
