package com.universe.admin.dto.response;
import com.universe.report.dto.response.ReportResponse;
public record ReportProcessResponse(ReportResponse report, int trustScore, UserSanctionResponse sanction) {}
