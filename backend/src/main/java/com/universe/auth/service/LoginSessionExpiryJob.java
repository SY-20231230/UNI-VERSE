package com.universe.auth.service;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "auth.session.expiry-enabled", havingValue = "true", matchIfMissing = true)
public class LoginSessionExpiryJob {
    private final LoginSessionService sessions;

    @Scheduled(fixedDelayString = "${auth.session.expiry-delay-ms:60000}",
            initialDelayString = "${auth.session.expiry-delay-ms:60000}")
    public void expireInactiveSessions() {
        sessions.expireInactive(LocalDateTime.now());
    }
}