package com.universe.admin.service;

import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.AccountStatus;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SuspensionReleaseService {
    private final ModerationUserRepository users;
    private final UserSanctionRepository sanctions;
    private final TrustScoreService trust;

    @Transactional
    public boolean releaseIfExpired(Long userId, LocalDateTime now) {
        var user = users.findLockedById(userId).orElse(null);
        if (user == null || user.getAccountStatus() != AccountStatus.SUSPENDED
                || sanctions.hasActive(userId, SanctionType.BAN, now)
                || sanctions.hasActive(userId, SanctionType.SUSPENSION, now)) return false;
        var ended = sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(userId, SanctionType.SUSPENSION);
        if (ended.isEmpty() || ended.orElseThrow().getEndAt() == null || ended.orElseThrow().getEndAt().isAfter(now)) return false;
        user.updateAccountStatus(AccountStatus.ACTIVE);
        trust.releaseSuspension(ended.orElseThrow(), now);
        return true;
    }
}
