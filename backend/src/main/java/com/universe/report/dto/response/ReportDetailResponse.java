package com.universe.report.dto.response;

import java.util.List;

public record ReportDetailResponse(ReportResponse report, String description,
        List<ReportEvidenceResponse> evidences) {
    public ReportDetailResponse { evidences = List.copyOf(evidences); }
}
