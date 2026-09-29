package com.universe.report.dto.request;

import com.universe.report.entity.ReportType;
import jakarta.validation.constraints.*;
import java.util.List;

public record ReportCreateRequest(
        @NotNull @Positive Long targetUserId,
        @Positive Long tradeId,
        @Positive Long itemId,
        @Positive Long postId,
        @NotNull ReportType reportType,
        @NotBlank @Size(max = 10000) String description,
        @Size(max = 10) List<@NotBlank @Size(max = 500) String> evidences) {
    public ReportCreateRequest {
        evidences = evidences == null ? List.of()
                : java.util.Collections.unmodifiableList(new java.util.ArrayList<>(evidences));
    }
}
