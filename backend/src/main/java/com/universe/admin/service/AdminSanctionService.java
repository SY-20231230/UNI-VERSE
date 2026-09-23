package com.universe.admin.service;

import com.universe.admin.dto.request.UserSanctionCreateRequest;
import com.universe.admin.dto.response.UserSanctionResponse;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.report.service.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.*;
import java.time.LocalDateTime;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.universe.report.service.ModerationException.Code.*;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminSanctionService {
    private final ModerationAccessService access;
    private final ModerationUserRepository users;
    private final UserSanctionRepository sanctions;
    private final ReportRepository reports;
    private final TrustScoreService trust;

    public UserSanctionResponse create(Long authenticatedAdminId, Long targetUserId, UserSanctionCreateRequest request) {
        User admin = access.requireAdmin(authenticatedAdminId);
        // Lock report before user everywhere to avoid conflicting moderation lock order.
        Report report = request.reportId() == null ? null : reports.findLockedById(request.reportId())
                .orElseThrow(() -> new ModerationException(REPORT_NOT_FOUND));
        if (report != null && (report.getStatus() != ReportStatus.PROCESSED
                || !Objects.equals(report.getTargetUser().getId(), targetUserId)))
            throw new ModerationException(INVALID_SANCTION);
        User user = users.findLockedById(targetUserId).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        return UserSanctionResponse.from(impose(admin, user, report, request.sanctionType(), request.reason(), request.endAt()));
    }

    // Called only within the administrator report service's transaction.
    UserSanction impose(User admin, User user, Report report, SanctionType type, String reason, LocalDateTime endAt) {
        LocalDateTime now = LocalDateTime.now();
        if (admin.getRole() != UserRole.ADMIN || admin.getAccountStatus() != AccountStatus.ACTIVE
                || Objects.equals(admin.getId(), user.getId()) || user.getRole() == UserRole.ADMIN
                || user.getAccountStatus() == AccountStatus.DELETED || user.getAccountStatus() == AccountStatus.BANNED)
            throw new ModerationException(FORBIDDEN);
        if (type == null || reason == null || reason.isBlank()
                || type == SanctionType.SUSPENSION && (endAt == null || !endAt.isAfter(now))
                || type != SanctionType.SUSPENSION && endAt != null) throw new ModerationException(INVALID_SANCTION);
        if (type == SanctionType.SUSPENSION && (user.getAccountStatus() == AccountStatus.SUSPENDED
                || sanctions.hasActive(user.getId(), SanctionType.SUSPENSION, now)))
            throw new ModerationException(INVALID_SANCTION);
        UserSanction sanction = sanctions.save(UserSanction.builder().user(user).admin(admin).report(report)
                .sanctionType(type).reason(reason).startAt(now).endAt(endAt).build());
        switch (type) {
            case WARNING -> trust.applyWarning(sanction);
            case SUSPENSION -> user.updateAccountStatus(AccountStatus.SUSPENDED);
            case BAN -> user.updateAccountStatus(AccountStatus.BANNED);
        }
        return sanction;
    }
}
