package com.universe.admin.dto.response;
import com.universe.report.entity.*;
import java.time.LocalDateTime;
public record UserSanctionResponse(Long sanctionId, Long userId, Long adminId, Long reportId,
        SanctionType sanctionType, String reason, LocalDateTime startAt, LocalDateTime endAt, LocalDateTime createdAt) {
    public static UserSanctionResponse from(UserSanction s) {
        return new UserSanctionResponse(s.getId(), s.getUser().getId(), s.getAdmin().getId(),
                s.getReport() == null ? null : s.getReport().getId(), s.getSanctionType(), s.getReason(),
                s.getStartAt(), s.getEndAt(), s.getCreatedAt());
    }
}
