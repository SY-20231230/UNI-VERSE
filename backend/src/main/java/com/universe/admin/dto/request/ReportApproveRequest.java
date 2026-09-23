package com.universe.admin.dto.request;
import com.universe.report.entity.SanctionType;
import jakarta.validation.constraints.*;
public record ReportApproveRequest(@NotBlank @Size(max = 10000) String adminNote, SanctionType sanctionType) {}
