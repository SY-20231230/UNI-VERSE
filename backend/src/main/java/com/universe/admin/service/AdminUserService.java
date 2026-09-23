package com.universe.admin.service;

import com.universe.admin.dto.request.UserStatusUpdateRequest;
import com.universe.admin.dto.response.*;
import com.universe.admin.repository.AdminActivityRepository;
import com.universe.report.dto.response.ReportResponse;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.report.service.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.*;
import java.time.LocalDateTime;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.universe.report.service.ModerationException.Code.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {
    private final ModerationAccessService access;
    private final ModerationUserRepository users;
    private final UserSanctionRepository sanctions;
    private final ReportRepository reports;
    private final AdminActivityRepository activities;
    private final SuspensionReleaseService release;

    public AdminUserDetailResponse getDetail(Long authenticatedAdminId, Long userId) {
        access.requireAdmin(authenticatedAdminId);
        User user = users.findById(userId).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        Pageable recent = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "id"));
        var trades = activities.findByParticipant(userId, recent);
        var reportPage = reports.findByTargetUserId(userId, recent);
        var sanctionPage = sanctions.findByUserId(userId, recent);
        return new AdminUserDetailResponse(AdminUserResponse.from(user), trades.getTotalElements(),
                reportPage.getTotalElements(), sanctionPage.getTotalElements(),
                trades.map(AdminTradeSummaryResponse::from).getContent(), reportPage.map(ReportResponse::from).getContent(),
                sanctionPage.map(UserSanctionResponse::from).getContent());
    }

    public Page<UserSanctionResponse> findSanctions(Long authenticatedAdminId, Long userId, Pageable pageable) {
        access.requireAdmin(authenticatedAdminId);
        users.findById(userId).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        return sanctions.findByUserId(userId, pageable).map(UserSanctionResponse::from);
    }

    @Transactional
    public AdminUserResponse updateStatus(Long authenticatedAdminId, Long userId, UserStatusUpdateRequest request) {
        User admin = access.requireAdmin(authenticatedAdminId);
        User user = users.findLockedById(userId).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        if (Objects.equals(admin.getId(), userId) || user.getRole() == UserRole.ADMIN) throw new ModerationException(FORBIDDEN);
        AccountStatus next = request.accountStatus();
        if (next == null) throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
        if (user.getAccountStatus() == next) return AdminUserResponse.from(user);
        if (user.getAccountStatus() == AccountStatus.BANNED || user.getAccountStatus() == AccountStatus.DELETED)
            throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
        LocalDateTime now = LocalDateTime.now();
        if (next == AccountStatus.ACTIVE) {
            if (!release.releaseIfExpired(userId, now)) throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
        } else {
            // Punitive states require an auditable sanction with a reason and duration.
            if (next == AccountStatus.SUSPENDED && !sanctions.hasActive(userId, SanctionType.SUSPENSION, now)
                    || next == AccountStatus.BANNED && !sanctions.hasActive(userId, SanctionType.BAN, now))
                throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
            user.updateAccountStatus(next);
        }
        return AdminUserResponse.from(user);
    }
}
