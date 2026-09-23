package com.universe.admin.dto.request;
import com.universe.report.entity.SanctionType;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record UserSanctionCreateRequest(@NotNull SanctionType sanctionType,
        @NotBlank @Size(max = 10000) String reason, @Future LocalDateTime endAt, @Positive Long reportId) {}
