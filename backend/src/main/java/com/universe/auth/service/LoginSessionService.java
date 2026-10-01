package com.universe.auth.service;

import com.universe.auth.entity.LoginSession;
import com.universe.auth.entity.LoginSession.EndReason;
import com.universe.auth.repository.LoginSessionRepository;
import com.universe.user.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LoginSessionService {
    public static final Duration IDLE_TIMEOUT = Duration.ofMinutes(30);

    private final LoginSessionRepository sessions;
    private final UserRepository users;

    @Transactional
    public String start(Long userId, LocalDateTime now) {
        var user = users.findById(userId).orElseThrow();
        String sessionId = UUID.randomUUID().toString();
        sessions.save(new LoginSession(sessionId, user, now));
        return sessionId;
    }

    @Transactional
    public boolean recordActivity(String sessionId, Long userId, LocalDateTime now) {
        if (sessionId == null || sessionId.isBlank()) return false;
        return sessions.findLockedById(sessionId)
                .map(session -> session.recordActivity(userId, now, IDLE_TIMEOUT))
                .orElse(false);
    }

    @Transactional
    public void end(String sessionId, Long userId, EndReason reason, LocalDateTime now) {
        if (sessionId == null || sessionId.isBlank()) return;
        sessions.findLockedById(sessionId).ifPresent(session -> {
            if (session.getUser().getId().equals(userId)) session.end(reason, now);
        });
    }

    @Transactional
    public void endAll(Long userId, EndReason reason, LocalDateTime now) {
        sessions.findOpenSessionsByUserId(userId).forEach(session -> session.end(reason, now));
    }

    @Transactional
    public int expireInactive(LocalDateTime now) {
        var expired = sessions.findInactiveSessions(now.minus(IDLE_TIMEOUT));
        expired.forEach(session -> session.end(EndReason.INACTIVITY_TIMEOUT,
                session.getLastActivityAt().plus(IDLE_TIMEOUT)));
        return expired.size();
    }
}