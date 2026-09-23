package com.universe.admin.service;

import com.universe.report.repository.UserSanctionRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "admin.suspension.expiry-enabled", havingValue = "true", matchIfMissing = true)
public class SuspensionExpiryJob {
    private final UserSanctionRepository sanctions;
    private final SuspensionReleaseService release;

    @Scheduled(fixedDelayString = "${admin.suspension.expiry-delay-ms:60000}",
               initialDelayString = "${admin.suspension.expiry-delay-ms:60000}")
    public void releaseExpiredSuspensions() {
        var now = LocalDateTime.now();
        for (Long userId : sanctions.findExpiredUserIds(now, PageRequest.of(0, 100))) {
            try {
                release.releaseIfExpired(userId, now);
            } catch (RuntimeException ex) {
                log.error("Failed to release expired suspension. userId={}", userId, ex);
            }
        }
    }
}
